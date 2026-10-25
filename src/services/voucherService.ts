// src/services/voucherService.ts
// Phân hệ Voucher - VC002: Sửa thông tin voucher & BH006: Áp dụng voucher giảm giá kính

import { Voucher } from '../contracts/domain';
import { db } from './database';
import { isCalendarDay, vietnamDay } from './vietnam-date';

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

    // VC002 Checklist: Chặn sửa voucher đã hết hạn (chỉ cho phép toggle isActive nếu cần)
    const isExpired = !isCalendarDay(currentVoucher.endDate) || vietnamDay() > currentVoucher.endDate;

    // Nếu sửa các thông số nội dung (tên, mức giảm, hạn sử dụng, điều kiện) mà voucher đã hết hạn -> Báo lỗi
    const isEditingContent =
      (input.name !== undefined && input.name !== currentVoucher.name) ||
      (input.discountType !== undefined && input.discountType !== currentVoucher.discountType) ||
      (input.discountValue !== undefined && input.discountValue !== currentVoucher.discountValue) ||
      (input.minOrderValue !== undefined && input.minOrderValue !== currentVoucher.minOrderValue) ||
      (input.maxDiscountAmount !== undefined && input.maxDiscountAmount !== currentVoucher.maxDiscountAmount) ||
      (input.startDate !== undefined && input.startDate !== currentVoucher.startDate) ||
      (input.endDate !== undefined && input.endDate !== currentVoucher.endDate);

    if (isExpired && isEditingContent) {
      return {
        success: false,
        error: `Không thể sửa nội dung voucher đã hết hạn sử dụng (hết hạn ngày ${currentVoucher.endDate}).`,
      };
    }

    // Validate Discount value
    const discountType = input.discountType || currentVoucher.discountType;
    const discountValue = input.discountValue !== undefined ? input.discountValue : currentVoucher.discountValue;
    const minOrderValue = input.minOrderValue ?? currentVoucher.minOrderValue;
    const maxDiscountAmount = input.maxDiscountAmount ?? currentVoucher.maxDiscountAmount;
    if (!['percentage','fixed'].includes(discountType) || !Number.isFinite(discountValue) || !Number.isFinite(minOrderValue) || minOrderValue < 0 ||
      (maxDiscountAmount !== undefined && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)))
      return {success:false,error:'Mức giảm, đơn tối thiểu và trần giảm phải là số hợp lệ, không âm.'};
    if (input.name !== undefined && !input.name.trim()) return {success:false,error:'Tên voucher không được trống.'};

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
    const startDate = input.startDate ?? currentVoucher.startDate;
    const endDate = input.endDate ?? currentVoucher.endDate;
    if (!isCalendarDay(startDate) || !isCalendarDay(endDate)) return {success:false,error:'Ngày hiệu lực không hợp lệ (YYYY-MM-DD).'};

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

    try { db.transaction(data => {data.vouchers[index] = updatedVoucher;}); }
    catch {return {success:false,error:'Không thể lưu voucher. Vui lòng thử lại.'};}

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

    if (!isCalendarDay(voucher.startDate) || !isCalendarDay(voucher.endDate) || voucher.startDate > voucher.endDate || !Number.isFinite(input.subtotal) || input.subtotal < 0)
      return {success:false,error:'Dữ liệu voucher hoặc tiền hàng không hợp lệ.'};
    const now = vietnamDay(currentDateStr);
    const start = voucher.startDate;
    const end = voucher.endDate;

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

  /**
   * VC003: Lấy trạng thái suy diễn của voucher
   * - 'disabled': Vô hiệu hóa (isActive === false)
   * - 'expired': Hết hạn (now > endDate)
   * - 'upcoming': Sắp áp dụng (now < startDate)
   * - 'active': Đang áp dụng (startDate <= now <= endDate && isActive)
   * Thống nhất ưu tiên: Nếu vừa vô hiệu vừa hết hạn -> ưu tiên 'disabled' (Vô hiệu hóa) hoặc có thể lọc chính xác
   */
  public getVoucherStatus(voucher: Voucher, currentDateStr?: string): 'active' | 'upcoming' | 'expired' | 'disabled' {
    if (!voucher.isActive) return 'disabled';
    if (!isCalendarDay(voucher.startDate) || !isCalendarDay(voucher.endDate) || voucher.startDate > voucher.endDate) return 'disabled';
    const now = vietnamDay(currentDateStr);
    const start = voucher.startDate;
    const end = voucher.endDate;
    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    return 'active';
  }

  /**
   * VC003: Lọc voucher theo từ khóa và trạng thái
   */
  public filterVouchers(filter: { query?: string; status?: 'all' | 'active' | 'upcoming' | 'expired' | 'disabled' }, currentDateStr?: string): Voucher[] {
    let list = db.vouchers;
    if (filter.query) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(v => (v.code + ' ' + v.name).toLowerCase().includes(q));
    }
    if (filter.status && filter.status !== 'all') {
      list = list.filter(v => this.getVoucherStatus(v, currentDateStr) === filter.status);
    }
    return list;
  }
}

export const voucherService = new VoucherService();
