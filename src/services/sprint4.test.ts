// src/services/sprint4.test.ts
// Test suites cho Sprint 4: HD004, KH004, NV001

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import { customerService } from './customerService';
import { invoiceService } from './invoiceService';
import { employeeService } from './employeeService';

describe('Sprint 4 - KH004: Tìm kiếm thông tin khách hàng', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Tìm khách hàng bằng số điện thoại có dấu cách hoặc gạch nối', () => {
    // SĐT gốc trong DB: '0900000001'
    const res = customerService.searchCustomers({ query: '090 000 0001' });
    expect(res.customers.length).toBe(1);
    expect(res.customers[0].fullName).toBe('Nguyễn Văn An');
    // Đảm bảo thời gian đáp ứng cực nhanh (<300ms)
    expect(res.executionTimeMs).toBeLessThan(300);
  });

  it('Thành công: Tìm khách hàng bằng mã hồ sơ (KH0001)', () => {
    const res = customerService.searchCustomers({ query: 'KH0001' });
    expect(res.customers.length).toBe(1);
    expect(res.customers[0].prescriptions.length).toBeGreaterThan(0);
    expect(res.customers[0].prescriptions[0].sphereRight).toBe(-1.5);
  });

  it('Thành công: Không tìm thấy trả về mảng rỗng', () => {
    const res = customerService.searchCustomers({ query: '0999999999' });
    expect(res.customers.length).toBe(0);
  });
});

describe('Sprint 4 - HD004: Lọc hóa đơn theo thời gian, trạng thái', () => {
  beforeEach(() => {
    db.reset();
    // Tạo seed hóa đơn với các trạng thái khác nhau
    invoiceService.holdPendingInvoice({
      employeeId: 'EMP001',
      employeeName: 'Trần Trung Kiên',
      customerName: 'Khách A',
      items: [
        {
          id: 'I1',
          productId: 'PRD001',
          productName: 'Gọng Céleste',
          sku: 'GK001',
          unitPrice: 850000,
          quantity: 1,
          lineTotal: 850000,
        },
      ],
    });
    // Hóa đơn 2 đã thanh toán
    const hold2 = invoiceService.holdPendingInvoice({
      employeeId: 'EMP002',
      employeeName: 'Nguyễn Văn Hoan',
      customerName: 'Khách B',
      items: [
        {
          id: 'I2',
          productId: 'PRD002',
          productName: 'Tròng Chemi',
          sku: 'TR001',
          unitPrice: 300000,
          quantity: 2,
          lineTotal: 600000,
        },
      ],
    });
    invoiceService.markAsPaid(hold2.data!.id);
  });

  it('Thành công: Lọc hóa đơn theo trạng thái thanh toán (pending vs paid)', () => {
    const pendingList = invoiceService.filterInvoices({ paymentStatus: 'pending' });
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].customerName).toBe('Khách A');

    const paidList = invoiceService.filterInvoices({ paymentStatus: 'paid' });
    expect(paidList.length).toBe(1);
    expect(paidList[0].customerName).toBe('Khách B');
  });

  it('Thành công: Lọc theo trạng thái mài lắp tròng kính (cutting_lens vs completed)', () => {
    const cuttingList = invoiceService.filterInvoices({ productionStatus: 'cutting_lens' });
    expect(cuttingList.length).toBe(1);
    expect(cuttingList[0].productionStatus).toBe('cutting_lens');

    const completedList = invoiceService.filterInvoices({ productionStatus: 'completed' });
    expect(completedList.length).toBe(1);
    expect(completedList[0].productionStatus).toBe('completed');
  });

  it('Thành công: Lọc kết hợp trạng thái và tìm kiếm tên khách', () => {
    const list = invoiceService.filterInvoices({
      paymentStatus: 'paid',
      searchQuery: 'Khách B',
    });
    expect(list.length).toBe(1);
    expect(list[0].invoiceCode).toBe('HD0002');
  });
});

describe('Sprint 4 - NV001: Thêm thông tin nhân viên', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Admin tạo hồ sơ nhân viên mới kèm tài khoản đăng nhập (DN004)', () => {
    const res = employeeService.createEmployee({
      fullName: 'Phạm Thị Mai',
      phone: '0912345678',
      email: 'mai.pham@example.com',
      position: 'Kỹ thuật viên khúc xạ',
      account: {
        username: 'mai_ktv',
        password: 'securePass123',
      },
      currentActorRole: 'admin',
    });

    expect(res.success).toBe(true);
    expect(res.data?.employee.fullName).toBe('Phạm Thị Mai');
    expect(res.data?.userId).toBeDefined();

    // Tài khoản User được tạo trong DB
    const user = db.users.find(u => u.username === 'mai_ktv');
    expect(user).toBeDefined();
    expect(user?.role).toBe('employee');
  });

  it('Thất bại: Chặn nhân viên tự thêm nhân sự (Role check)', () => {
    const res = employeeService.createEmployee({
      fullName: 'Người Mới',
      phone: '0901112223',
      email: 'new@example.com',
      position: 'Nhân viên bán kính',
      currentActorRole: 'employee',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Quyền bị từ chối');
  });

  it('Thất bại: Rollback khi tạo tài khoản bị trùng username', () => {
    const res = employeeService.createEmployee({
      fullName: 'Trần Văn Trùng',
      phone: '0903334445',
      email: 'trung@example.com',
      position: 'Nhân viên bán kính',
      account: {
        username: 'admin', // Trùng username có sẵn
      },
      currentActorRole: 'admin',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Tên tài khoản đã tồn tại');

    // Không tạo employee mồ côi
    const emp = db.employees.find(e => e.email === 'trung@example.com');
    expect(emp).toBeUndefined();
  });
});
