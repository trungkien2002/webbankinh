// src/services/customerService.ts
// Phân hệ Khách hàng - KH004: Tìm kiếm thông tin khách hàng (SĐT / Mã hồ sơ)

import { Customer, EyePrescription } from '../contracts/domain';
import { db } from './database';

export interface SearchCustomerFilter {
  query?: string; // SĐT, tên hoặc mã hồ sơ khách (KHxxxx)
}

export interface AddCustomerInput {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  prescription?: EyePrescription;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CustomerService {
  /**
   * KH004: Tìm kiếm thông tin khách hàng
   * - Hỗ trợ chuẩn hóa số điện thoại (xóa khoảng trắng, dấu chấm, dấu gạch nối)
   * - Tra cứu nhanh theo SĐT hoặc mã khách hàng phục vụ quầy POS (<300ms)
   * - Trả về đầy đủ lịch sử đo mắt để kỹ thuật viên mài lắp kính phù hợp
   */
  public searchCustomers(filter: SearchCustomerFilter): { customers: Customer[]; executionTimeMs: number } {
    const startTime = performance.now();
    let list = db.customers;

    if (filter.query) {
      const normalizedQuery = this.normalizePhone(filter.query).toLowerCase();
      const rawQuery = filter.query.trim().toLowerCase();

      list = list.filter(c => {
        const normPhone = this.normalizePhone(c.phone);
        const matchPhone = normPhone.includes(normalizedQuery);
        const matchCode = c.customerCode.toLowerCase().includes(rawQuery);
        const matchName = c.fullName.toLowerCase().includes(rawQuery);
        return matchPhone || matchCode || matchName;
      });
    }

    const executionTimeMs = performance.now() - startTime;

    return {
      customers: list,
      executionTimeMs,
    };
  }

  public getCustomerById(id: string): Customer | undefined {
    return db.customers.find(c => c.id === id);
  }

  public addCustomer(input: AddCustomerInput): ServiceResult<Customer> {
    const fullName = input.fullName?.trim();
    const phone = this.normalizePhone(input.phone);

    if (!fullName) {
      return { success: false, error: 'Họ tên khách hàng không được để trống.' };
    }
    if (!phone || phone.length < 9) {
      return { success: false, error: 'Số điện thoại không hợp lệ.' };
    }

    const count = db.customers.length + 1;
    const customerCode = 'KH' + String(count).padStart(4, '0');

    const newCust: Customer = {
      id: 'CUS' + String(Date.now()).slice(-6),
      customerCode,
      fullName,
      phone,
      email: input.email?.trim(),
      address: input.address?.trim(),
      prescriptions: input.prescription ? [input.prescription] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.setCustomers([...db.customers, newCust]);
    return { success: true, data: newCust };
  }

  private normalizePhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/[\s\.\-\(\)]/g, '');
  }
}

export const customerService = new CustomerService();
