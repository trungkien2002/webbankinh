// src/services/voucherService.ts
// Phân hệ Voucher - VC002: Sửa thông tin voucher & BH006: Áp dụng voucher giảm giá kính

import { Voucher } from '../contracts/domain';
import { db } from './database';

export interface UpdateVoucherInput {
  voucherId: string;
  name?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  currentActorRole: 'admin' | 'employee';
}

export interface ApplyVoucherInput {
  voucherCode: string;
  subtotal: number;
}

export interface ApplyVoucherResult {
  success: boolean;
  voucherCode?: string;
  discountAmount?: number;
  newTotal?: number;
  error?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class VoucherService {
  /**
   * VC002: Sửa thông tin voucher
   * - Chỉ Admin mới có quyền sửa
   * - Validate ngày bắt đầu <= ngày kết thúc
   * - Validate giá trị giảm (%: 1-100, số tiền: > 0)
   * - Không làm thay đổi lịch sử giảm giá của các hóa đơn đã thanh toán trước đó
   */
  public updateVoucher(input: UpdateVoucherInput): ServiceResult<Voucher> {
    if (input.currentActorRole !== 'admin') {
      return {
        success: false,
        error: 'Quyền bị từ chối: Chỉ quản trị viên (Admin) mới có quyền chỉnh sửa voucher.',
      };
    }

    const vouchers = db.vouchers;
    const index = vouchers.findIndex(v => v.id === input.voucherId);
    if (index === -1) {
      return { success: false, error: 'Voucher không tồn tại trên hệ thống.' };
    }

    const currentVoucher = vouchers[index];

    // Validate Discount value
    const discountType = input.discountType || currentVoucher.discountType;
    const discountValue = input.discountValue !== undefined ? input.discountValue : currentVoucher.discountValue;

    if (discountType === 'percentage') {
      if (discountValue <= 0 || discountValue > 100) {
        return { success: false, error: 'Phần trăm giảm giá phải nằm trong khoảng từ 1% đến 100%.' };
      }
    } else {
      if (discountValue <= 0) {
        return { success: false, error: 'Số tiền giảm giá phải lớn hơn 0.' };
      }
    }

    // Validate dates
    const startDate = input.startDate || currentVoucher.startDate;
    const endDate = input.endDate || currentVoucher.endDate;

    if (new Date(startDate) > new Date(endDate)) {
      return { success: false, error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.' };
    }

    const updatedVoucher: Voucher = {
      ...currentVoucher,
      name: input.name?.trim() || currentVoucher.name,
      discountType,
      discountValue,
      minOrderValue: input.minOrderValue !== undefined ? input.minOrderValue : currentVoucher.minOrderValue,
      maxDiscountAmount: input.maxDiscountAmount !== undefined ? input.maxDiscountAmount : currentVoucher.maxDiscountAmount,
      startDate,
      endDate,
      isActive: input.isActive !== undefined ? input.isActive : currentVoucher.isActive,
      updatedAt: new Date().toISOString(),
    };

    const newVouchers = [...vouchers];
    newVouchers[index] = updatedVoucher;
    db.setVouchers(newVouchers);

    return {
      success: true,
      data: updatedVoucher,
    };
  }

  /**
   * BH006: Áp dụng voucher giảm giá kính vào đơn bán hàng
   * - Kiểm tra mã voucher tồn tại
   * - Kiểm tra voucher đang kích hoạt (isActive === true)
   * - Kiểm tra thời hạn hiệu lực (startDate <= now <= endDate)
   * - Kiểm tra giá trị đơn hàng đạt mức tối thiểu (minOrderValue)
   * - Tính toán chính xác số tiền được giảm theo % (có trần maxDiscountAmount) hoặc số tiền cố định
   * - Tiền giảm không bao giờ vượt quá tổng tiền hàng (subtotal)
   */
  public applyVoucher(input: ApplyVoucherInput, currentDateStr?: string): ApplyVoucherResult {
    const code = input.voucherCode?.trim().toUpperCase();
    if (!code) {
      return { success: false, error: 'Vui lòng nhập mã voucher.' };
    }

    const voucher = db.vouchers.find(v => v.code.toUpperCase() === code);
    if (!voucher) {
      return { success: false, error: 'Mã voucher không tồn tại.' };
    }

    if (!voucher.isActive) {
      return { success: false, error: 'Voucher này hiện đang tạm ngưng sử dụng.' };
    }

    const now = currentDateStr ? new Date(currentDateStr) : new Date();
    const start = new Date(voucher.startDate);
    const end = new Date(voucher.endDate + 'T23:59:59');

    if (now < start) {
      return { success: false, error: `Voucher chưa bắt đầu áp dụng (bắt đầu từ ${voucher.startDate}).` };
    }

    if (now > end) {
      return { success: false, error: `Voucher đã hết hạn sử dụng vào ngày ${voucher.endDate}.` };
    }

    if (input.subtotal < voucher.minOrderValue) {
      return {
        success: false,
        error: `Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} đ để áp dụng voucher.`,
      };
    }

    // Tính tiền giảm
    let discount = 0;
    if (voucher.discountType === 'percentage') {
      discount = (input.subtotal * voucher.discountValue) / 100;
      if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
        discount = voucher.maxDiscountAmount;
      }
    } else {
      discount = voucher.discountValue;
    }

    // Giảm không quá subtotal
    if (discount > input.subtotal) {
      discount = input.subtotal;
    }

    const newTotal = Math.max(0, input.subtotal - discount);

    return {
      success: true,
      voucherCode: voucher.code,
      discountAmount: discount,
      newTotal,
    };
  }

  public getAllVouchers(): Voucher[] {
    return db.vouchers;
  }
}

export const voucherService = new VoucherService();
