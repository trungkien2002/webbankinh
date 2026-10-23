// src/services/khanh-checklist.test.ts
// Test suites bổ sung cho 5 story theo file KHANH.md mới (22/10/2026):
// SP005, VC002, VC003, HD004, KH001

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from './database';
import { productService } from './productService';
import { voucherService } from './voucherService';
import { invoiceService } from './invoiceService';
import { customerService } from './customerService';

describe('KHANH.md - SP005: Tìm thương hiệu & lọc hãng/dáng/chất liệu kết hợp', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Query tìm kiếm đúng theo thương hiệu (brand)', () => {
    // Sản phẩm PRD001 có brand: 'Élan', PRD002 có brand: 'Chemi'
    const resultsChemi = productService.searchProducts({ query: 'Chemi' });
    expect(resultsChemi.length).toBeGreaterThan(0);
    expect(resultsChemi.some(p => p.brand === 'Chemi')).toBe(true);

    const resultsElan = productService.searchProducts({ query: 'élan' });
    expect(resultsElan.length).toBeGreaterThan(0);
    expect(resultsElan.some(p => p.brand === 'Élan')).toBe(true);
  });

  it('Lọc kết hợp theo chất liệu (material) và dáng (shape)', () => {
    // PRD001: material: 'Acetate', shape: 'Vuông bo viền'
    const match = productService.searchProducts({
      material: 'Acetate',
      shape: 'Vuông bo viền',
    });
    expect(match.length).toBe(1);
    expect(match[0].sku).toBe('GK001');

    const noMatch = productService.searchProducts({
      material: 'Titanium',
      shape: 'Vuông bo viền',
    });
    expect(noMatch.length).toBe(0);
  });

  it('Xóa mềm không xuất hiện trong kết quả tìm kiếm', () => {
    const p = db.products[0];
    p.isDeleted = true;
    const found = productService.searchProducts({ query: p.sku });
    expect(found.some(item => item.id === p.id)).toBe(false);
  });
});

describe('KHANH.md - VC002 & VC003: Chặn sửa voucher hết hạn & lọc trạng thái voucher', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T05:00:00Z'));
    db.reset();
  });

  afterEach(() => vi.useRealTimers());

  it('VC002: Chặn sửa nội dung voucher đã hết hạn sử dụng', () => {
    vi.setSystemTime(new Date('2026-11-05T05:00:00Z'));
    // VOU001: endDate: 2026-10-31
    // Giả lập thời gian hiện tại là 2026-11-05 (đã hết hạn)
    const result = voucherService.updateVoucher({
      voucherId: 'VOU001',
      discountValue: 20,
      currentActorRole: 'admin',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('hết hạn sử dụng');
  });

  it('VC002: Cho phép sửa voucher còn hạn sử dụng', () => {
    // VOU001 còn hạn vào ngày 2026-10-15
    const result = voucherService.updateVoucher({
      voucherId: 'VOU001',
      discountValue: 15,
      currentActorRole: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.data?.discountValue).toBe(15);
  });

  it('VC003: Lọc trạng thái voucher theo quy tắc (active, upcoming, expired, disabled)', () => {
    // Tạo 4 voucher với các trạng thái rõ ràng tại mốc '2026-10-15'
    db.setVouchers([
      {
        id: 'V1', code: 'ACT1', name: 'Đang áp dụng', discountType: 'percentage', discountValue: 10,
        minOrderValue: 0, startDate: '2026-10-01', endDate: '2026-10-31', isActive: true, usageCount: 0,
        createdAt: '', updatedAt: '',
      },
      {
        id: 'V2', code: 'UPC1', name: 'Sắp áp dụng', discountType: 'percentage', discountValue: 10,
        minOrderValue: 0, startDate: '2026-11-01', endDate: '2026-11-30', isActive: true, usageCount: 0,
        createdAt: '', updatedAt: '',
      },
      {
        id: 'V3', code: 'EXP1', name: 'Hết hạn', discountType: 'percentage', discountValue: 10,
        minOrderValue: 0, startDate: '2026-09-01', endDate: '2026-09-30', isActive: true, usageCount: 0,
        createdAt: '', updatedAt: '',
      },
      {
        id: 'V4', code: 'DIS1', name: 'Vô hiệu hóa', discountType: 'percentage', discountValue: 10,
        minOrderValue: 0, startDate: '2026-10-01', endDate: '2026-10-31', isActive: false, usageCount: 0,
        createdAt: '', updatedAt: '',
      },
    ]);

    const activeList = voucherService.filterVouchers({ status: 'active' }, '2026-10-15');
    expect(activeList.map(v => v.code)).toEqual(['ACT1']);

    const upcomingList = voucherService.filterVouchers({ status: 'upcoming' }, '2026-10-15');
    expect(upcomingList.map(v => v.code)).toEqual(['UPC1']);

    const expiredList = voucherService.filterVouchers({ status: 'expired' }, '2026-10-15');
    expect(expiredList.map(v => v.code)).toEqual(['EXP1']);

    const disabledList = voucherService.filterVouchers({ status: 'disabled' }, '2026-10-15');
    expect(disabledList.map(v => v.code)).toEqual(['DIS1']);
  });
});

describe('KHANH.md - HD004: Lọc hóa đơn khoảng ngày & tiến độ mài lắp', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Báo lỗi rõ ràng khi từ ngày lớn hơn đến ngày', () => {
    expect(() => {
      invoiceService.filterInvoices({
        fromDate: '2026-10-25',
        toDate: '2026-10-20',
      });
    }).toThrow('Từ ngày không được lớn hơn đến ngày.');
  });

  it('Lọc chính xác theo productionStatus (none, cutting_lens, completed, delivered)', () => {
    invoiceService.holdPendingInvoice({
      employeeId: 'EMP001', employeeName: 'Tester', customerName: 'Khách Test',
      items: [{ id: '1', productId: 'PRD001', productName: 'Gọng', sku: 'GK001', unitPrice: 100000, quantity: 1, lineTotal: 100000 }],
    }); // new pending invoice has productionStatus: 'cutting_lens'

    const cutting = invoiceService.filterInvoices({ productionStatus: 'cutting_lens' });
    expect(cutting.length).toBeGreaterThan(0);
    expect(cutting.every(i => i.productionStatus === 'cutting_lens')).toBe(true);

    const none = invoiceService.filterInvoices({ productionStatus: 'none' });
    expect(none.every(i => i.productionStatus === 'none')).toBe(true);
  });
});

describe('KHANH.md - KH001: Tạo hồ sơ khách hàng với số đo mắt ban đầu', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Tạo khách hàng có kèm thông số đo mắt ban đầu an toàn trong 1 thao tác', () => {
    const res = customerService.addCustomer({
      fullName: 'Khánh Test KH001',
      phone: '0988776655',
      email: 'khanh.test@example.com',
      address: 'Hà Nội',
      prescription: {
        sphereRight: -2.5,
        cylinderRight: -0.75,
        axisRight: 90,
        sphereLeft: -2.0,
        cylinderLeft: -0.5,
        axisLeft: 85,
        pupillaryDistance: 63,
        measuredAt: '2026-10-22',
        notes: 'Khám mắt lần đầu',
      },
    });

    expect(res.success).toBe(true);
    expect(res.data?.fullName).toBe('Khánh Test KH001');
    expect(res.data?.prescriptions.length).toBe(1);
    expect(res.data?.prescriptions[0].sphereRight).toBe(-2.5);
    expect(res.data?.prescriptions[0].pupillaryDistance).toBe(63);

    // Kiểm tra tìm kiếm khách hàng mới
    const searchRes = customerService.searchCustomers({ query: '0988776655' });
    expect(searchRes.customers.length).toBe(1);
    expect(searchRes.customers[0].prescriptions[0].measuredAt).toBe('2026-10-22');
  });

  it('Khách không kèm thông số đo vẫn tạo thành công với mảng rỗng', () => {
    const res = customerService.addCustomer({
      fullName: 'Khách Không Đo',
      phone: '0911223344',
    });
    expect(res.success).toBe(true);
    expect(res.data?.prescriptions).toEqual([]);
  });
});
