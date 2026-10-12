// src/services/authService.ts
// Phân hệ Tài khoản - DN004: Tạo tài khoản nhân viên & phân quyền

import { User, UserRole } from '../contracts/domain';
import { db } from './database';

export interface CreateUserInput {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  currentActorRole: UserRole; // Quyền của người thực hiện thao tác
}

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AuthService {
  /**
   * DN004: Admin tạo tài khoản cho nhân viên
   */
  public createUser(input: CreateUserInput): AuthResult<User> {
    // 1. Phân quyền: Chỉ admin mới có quyền tạo tài khoản
    if (input.currentActorRole !== 'admin') {
      return {
        success: false,
        error: 'Quyền bị từ chối: Chỉ quản trị viên (Admin) mới có quyền tạo tài khoản.',
      };
    }

    // 2. Validate dữ liệu đầu vào
    const username = input.username?.trim();
    const email = input.email?.trim().toLowerCase();

    if (!username || username.length < 3) {
      return {
        success: false,
        error: 'Tên tài khoản không được để trống và phải có ít nhất 3 ký tự.',
      };
    }

    if (!email || !this.isValidEmail(email)) {
      return {
        success: false,
        error: 'Email không hợp lệ.',
      };
    }

    if (!input.role || (input.role !== 'admin' && input.role !== 'employee')) {
      return {
        success: false,
        error: 'Vai trò tài khoản không hợp lệ.',
      };
    }

    // 3. Validate trùng username hoặc email
    const users = db.users;
    const isUsernameTaken = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (isUsernameTaken) {
      return {
        success: false,
        error: 'Tên tài khoản đã tồn tại trong hệ thống.',
      };
    }

    const isEmailTaken = users.some(u => u.email.toLowerCase() === email);
    if (isEmailTaken) {
      return {
        success: false,
        error: 'Email đã được sử dụng bởi một tài khoản khác.',
      };
    }

    // 4. Tạo User mới (Mật khẩu bảo mật, không trả về trong payload)
    const newUser: User = {
      id: 'USR' + String(Date.now()).slice(-6),
      username,
      email,
      role: input.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.setUsers([...users, newUser]);

    return {
      success: true,
      data: newUser,
    };
  }

  public getUsers(): User[] {
    return db.users;
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

export const authService = new AuthService();
