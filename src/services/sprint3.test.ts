// src/services/sprint3.test.ts
// Test suites cho Sprint 3: BH002, BH006, VC002

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from './database';
import { voucherService } from './voucherService';
import { invoiceService } from './invoiceService';

describe('Sprint 3 - VC002: Sửa thông tin voucher', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T05:00:00Z'));
    db.reset();
  });
  afterEach(() => vi.useRealTimers());

  it('Thành công: Admin sửa thời hạn và giá trị giảm của voucher', () => {
    const result = voucherService.updateVoucher({
      voucherId: 'VOU001',
      name: 'Ưu đãi mắt kính tháng 10 - Điều chỉnh',
      discountValue: 15, // Đổi từ 10% -> 15%
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(true);
    expect(result.data?.discountValue).toBe(15);
    expect(result.data?.name).toBe('Ưu đãi mắt kính tháng 10 - Điều chỉnh');

    const updated = db.vouchers.find(v => v.id === 'VOU001');
    expect(updated?.discountValue).toBe(15);
  });

  it('Thất bại: Chặn nhân viên sửa voucher (Role check)', () => {
    const result = voucherService.updateVoucher({
      voucherId: 'VOU001',
      discountValue: 20,
      currentActorRole: 'employee',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Quyền bị từ chối');
  });

  it('Thất bại: Báo lỗi khi giá trị giảm không hợp lệ', () => {
    const resultOver100 = voucherService.updateVoucher({
      voucherId: 'VOU001',
      discountValue: 150, // % > 100
      currentActorRole: 'admin',
    });
    expect(resultOver100.success).toBe(false);
    expect(resultOver100.error).toContain('từ 1% đến 100%');
  });

  it('Thất bại: Báo lỗi khi ngày bắt đầu sau ngày kết thúc', () => {
    const resultInvalidDates = voucherService.updateVoucher({
      voucherId: 'VOU001',
      startDate: '2026-11-01',
      endDate: '2026-10-15',
      currentActorRole: 'admin',
    });
    expect(resultInvalidDates.success).toBe(false);
    expect(resultInvalidDates.error).toContain('không được lớn hơn ngày kết thúc');
  });
});

describe('Sprint 3 - BH006: Áp dụng voucher giảm giá kính', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Áp dụng voucher % có trần giảm tối đa', () => {
    // KINH10: 10%, max 100.000 đ, minOrderValue 500.000 đ
    // Đơn 1.500.000 đ -> 10% = 150.000 đ -> chạm trần 100.000 đ
    const result = voucherService.applyVoucher(
      {
        voucherCode: 'KINH10',
        subtotal: 1500000,
      },
      '2026-10-15'
    );

    expect(result.success).toBe(true);
    expect(result.discountAmount).toBe(100000);
    expect(result.newTotal).toBe(1400000);
  });

  it('Thành công: Áp dụng voucher số tiền cố định', () => {
    // GIAM50K: Giảm 50.000 đ, min 400.000 đ
    const result = voucherService.applyVoucher(
      {
        voucherCode: 'GIAM50K',
        subtotal: 600000,
      },
      '2026-10-15'
    );

    expect(result.success).toBe(true);
    expect(result.discountAmount).toBe(50000);
    expect(result.newTotal).toBe(550000);
  });

  it('Thất bại: Đơn chưa đạt mức tối thiểu (minOrderValue)', () => {
    // KINH10 yêu cầu min 500.000 đ, đơn chỉ 300.000 đ
    const result = voucherService.applyVoucher(
      {
        voucherCode: 'KINH10',
        subtotal: 300000,
      },
      '2026-10-15'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('chưa đạt giá trị tối thiểu');
  });

  it('Thất bại: Báo lỗi khi voucher hết hạn sử dụng', () => {
    // Ngày 2026-11-05 (KINH10 hết hạn 2026-10-31)
    const result = voucherService.applyVoucher(
      {
        voucherCode: 'KINH10',
        subtotal: 1000000,
      },
      '2026-11-05'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('hết hạn sử dụng');
  });
});

describe('Sprint 3 - BH002: Danh sách hoá đơn chờ thanh toán (Treo hoá đơn)', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Treo đơn kính đang chờ mài lắp tròng', () => {
    const result = invoiceService.holdPendingInvoice({
      employeeId: 'EMP001',
      employeeName: 'Trần Trung Kiên',
      customerName: 'Nguyễn Văn An',
      items: [
        {
          id: 'ITM1',
          productId: 'PRD001',
          productName: 'Gọng kính Céleste',
          sku: 'GK001',
          unitPrice: 850000,
          quantity: 1,
          lineTotal: 850000,
        },
      ],
      voucherCode: 'KINH10',
      voucherDiscountSnapshot: 85000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.paymentStatus).toBe('pending');
    expect(result.data?.productionStatus).toBe('none');
    expect(result.data?.totalAmount).toBe(765000);

    // Xuất hiện trong danh sách treo
    const pendingList = invoiceService.getPendingInvoices();
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].invoiceCode).toBe('HD0001');
  });

  it('Thành công: Khôi phục và thanh toán hóa đơn treo', () => {
    const holdRes = invoiceService.holdPendingInvoice({
      employeeId: 'EMP001',
      employeeName: 'Trần Trung Kiên',
      items: [
        {
          id: 'ITM1',
          productId: 'PRD001',
          productName: 'Gọng kính Céleste',
          sku: 'GK001',
          unitPrice: 850000,
          quantity: 1,
          lineTotal: 850000,
        },
      ],
    });

    const invId = holdRes.data!.id;
    const payRes = invoiceService.markAsPaid(invId, 'cash');

    expect(payRes.success).toBe(true);
    expect(payRes.data?.paymentStatus).toBe('paid');
    expect(payRes.data?.productionStatus).toBe('completed');

    // Không còn nằm trong danh sách treo
    const pendingList = invoiceService.getPendingInvoices();
    expect(pendingList.length).toBe(0);
  });
});
