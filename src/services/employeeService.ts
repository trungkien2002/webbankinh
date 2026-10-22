// src/services/employeeService.ts
// Phân hệ Nhân viên - NV001: Thêm thông tin nhân viên & liên kết tài khoản user (DN004)

import { Employee } from '../contracts/domain';
import { db } from './database';
import { authService, CreateUserInput } from './authService';

export interface CreateEmployeeInput {
  fullName: string;
  phone: string;
  email: string;
  position: string;
  hireDate?: string;
  // Tùy chọn tạo kèm tài khoản đăng nhập (DN004)
  account?: {
    username: string;
    password?: string;
  };
  currentActorRole: 'admin' | 'employee';
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EmployeeService {
  /**
   * NV001: Thêm thông tin nhân viên
   * - Chỉ Admin mới có quyền thực hiện
   * - Validate email không trùng
   * - Tạo hồ sơ nhân sự (employee) và nếu có yêu cầu tài khoản, gọi authService.createUser trong cùng transaction
   * - Nếu tạo user lỗi thì hủy (rollback) không tạo employee để tránh hồ sơ mồ côi
   */
  public createEmployee(input: CreateEmployeeInput): ServiceResult<{ employee: Employee; userId?: string }> {
    if (input.currentActorRole !== 'admin') {
      return {
        success: false,
        error: 'Quyền bị từ chối: Chỉ quản trị viên (Admin) mới có quyền thêm nhân viên.',
      };
    }

    const fullName = input.fullName?.trim();
    const phone = input.phone?.trim();
    const email = input.email?.trim().toLowerCase();
    const position = input.position?.trim();

    if (!fullName) {
      return { success: false, error: 'Họ tên nhân viên không được để trống.' };
    }
    if (!phone || phone.length < 9) {
      return { success: false, error: 'Số điện thoại nhân viên không hợp lệ.' };
    }
    if (!email) {
      return { success: false, error: 'Email nhân viên không được để trống.' };
    }
    if (!position) {
      return { success: false, error: 'Chức vụ nhân viên không được để trống.' };
    }

    // Validate email trùng
    const isEmailTaken = db.employees.some(e => e.email.toLowerCase() === email);
    if (isEmailTaken) {
      return { success: false, error: 'Email nhân viên đã tồn tại trong danh sách nhân sự.' };
    }

    let createdUserId = '';

    // Nếu có tạo kèm tài khoản đăng nhập:
    if (input.account) {
      const userRes = authService.createUser({
        username: input.account.username,
        email,
        password: input.account.password,
        role: 'employee',
        currentActorRole: 'admin',
      });

      if (!userRes.success) {
        // Rollback hoàn toàn
        return {
          success: false,
          error: `Không thể tạo tài khoản người dùng: ${userRes.error}`,
        };
      }
      createdUserId = userRes.data!.id;
    }

    const newEmp: Employee = {
      id: 'EMP' + String(Date.now()).slice(-6),
      userId: createdUserId,
      fullName,
      phone,
      email,
      position,
      hireDate: input.hireDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    db.setEmployees([...db.employees, newEmp]);

    return {
      success: true,
      data: {
        employee: newEmp,
        userId: createdUserId,
      },
    };
  }

  public getAllEmployees(): Employee[] {
    return db.employees;
  }
}

export const employeeService = new EmployeeService();

export interface EmployeeQuery {
  query?: string;
  shift?: string;
}

function employeeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

/** NV004: query terms are ANDed; numeric terms only match the phone field. */
export function queryEmployees(actorId: string, filter: EmployeeQuery = {}) {
  if (!db.users.some(user => user.id === actorId && user.isActive && user.role === 'admin')) {
    throw new Error('Chỉ quản trị viên được tra cứu nhân viên.');
  }
  const raw = (filter.query || '').trim();
  const phoneOnly = /^[\d\s()+.\-]+$/.test(raw);
  const terms = phoneOnly ? [raw.replace(/\D/g, '')].filter(Boolean) : employeeText(raw).split(' ').filter(Boolean);
  if (raw && !terms.length) return [];
  const shift = employeeText(filter.shift || '');
  return db.employees.filter(employee => {
    const phone = employee.phone.replace(/\D/g, '');
    const text = employeeText(`${employee.fullName} ${employee.shift || ''}`);
    if (shift && !employeeText(employee.shift || '').includes(shift)) return false;
    return terms.every(term => /^\d+$/.test(term) ? phone.includes(term) : text.includes(term));
  }).map(employee => {
    const user = db.users.find(user => user.id === employee.userId);
    return { ...employee, accountRole: user?.role, accountActive: user?.isActive };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi') || a.id.localeCompare(b.id));
}
