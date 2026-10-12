// src/services/sprint1.test.ts
// Test suites cho Sprint 1: DN004 & LSP004

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import { authService } from './authService';
import { categoryService } from './categoryService';

describe('Sprint 1 - DN004: Tạo tài khoản', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Admin tạo tài khoản nhân viên mới hợp lệ', () => {
    const result = authService.createUser({
      username: 'khanh_sales',
      email: 'khanh@example.com',
      password: 'password123',
      role: 'employee',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.username).toBe('khanh_sales');
    expect(result.data?.email).toBe('khanh@example.com');
    expect(result.data?.role).toBe('employee');
    expect(result.data?.isActive).toBe(true);
    // Mật khẩu không được lộ trong đối tượng trả về
    expect((result.data as any).password).toBeUndefined();

    // Dữ liệu phải được lưu trong DB
    const savedUser = db.users.find(u => u.username === 'khanh_sales');
    expect(savedUser).toBeDefined();
  });

  it('Thất bại: Từ chối khi người thực hiện không phải Admin', () => {
    const result = authService.createUser({
      username: 'test_user',
      email: 'test@example.com',
      role: 'employee',
      currentActorRole: 'employee', // Nhân viên tự tạo tài khoản
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Quyền bị từ chối');
  });

  it('Thất bại: Báo lỗi khi tên tài khoản (username) bị trùng', () => {
    // 'admin' đã có trong seed DB
    const result = authService.createUser({
      username: 'admin',
      email: 'another_admin@example.com',
      role: 'admin',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tên tài khoản đã tồn tại');
  });

  it('Thất bại: Báo lỗi khi email bị trùng', () => {
    // 'admin@example.com' đã có trong seed DB
    const result = authService.createUser({
      username: 'new_unique_user',
      email: 'admin@example.com',
      role: 'employee',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email đã được sử dụng');
  });

  it('Thất bại: Báo lỗi khi thông tin không hợp lệ', () => {
    const resultInvalidEmail = authService.createUser({
      username: 'validuser',
      email: 'not-an-email',
      role: 'employee',
      currentActorRole: 'admin',
    });
    expect(resultInvalidEmail.success).toBe(false);
    expect(resultInvalidEmail.error).toContain('Email không hợp lệ');

    const resultShortUsername = authService.createUser({
      username: 'ab',
      email: 'ab@example.com',
      role: 'employee',
      currentActorRole: 'admin',
    });
    expect(resultShortUsername.success).toBe(false);
    expect(resultShortUsername.error).toContain('ít nhất 3 ký tự');
  });
});

describe('Sprint 1 - LSP004: Xóa phân loại kính', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Admin xóa mềm phân loại kính không có sản phẩm liên kết', () => {
    // CAT004 (Phụ kiện) không có sản phẩm nào trong initialDatabase
    const result = categoryService.deleteCategory({
      categoryId: 'CAT004',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(true);
    expect(result.data?.isDeleted).toBe(true);
    expect(result.data?.deletedAt).toBeDefined();

    // Danh sách active categories không còn CAT004
    const active = categoryService.getActiveCategories();
    expect(active.some(c => c.id === 'CAT004')).toBe(false);

    // Lịch sử toàn bộ categories vẫn giữ nguyên bản ghi
    const all = categoryService.getAllCategories();
    expect(all.some(c => c.id === 'CAT004')).toBe(true);
  });

  it('Thất bại: Chặn xóa khi phân loại có sản phẩm liên kết', () => {
    // CAT001 (Gọng kính) có sản phẩm PRD001 đang kinh doanh
    const result = categoryService.deleteCategory({
      categoryId: 'CAT001',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Phân loại đang liên kết với');

    // CAT001 không bị xóa
    const cat = db.categories.find(c => c.id === 'CAT001');
    expect(cat?.isDeleted).toBe(false);
  });

  it('Thất bại: Từ chối xóa khi người thực hiện không phải Admin', () => {
    const result = categoryService.deleteCategory({
      categoryId: 'CAT004',
      currentActorRole: 'employee',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Quyền bị từ chối');
  });

  it('Thất bại: Báo lỗi khi ID phân loại không tồn tại', () => {
    const result = categoryService.deleteCategory({
      categoryId: 'CAT_NON_EXISTENT',
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('không tồn tại');
  });

  it('Thất bại: Báo lỗi khi xóa lại phân loại đã bị xóa', () => {
    // Xóa lần 1 thành công
    categoryService.deleteCategory({
      categoryId: 'CAT004',
      currentActorRole: 'admin',
    });

    // Xóa lần 2
    const resultRepeat = categoryService.deleteCategory({
      categoryId: 'CAT004',
      currentActorRole: 'admin',
    });

    expect(resultRepeat.success).toBe(false);
    expect(resultRepeat.error).toContain('đã bị xóa trước đó');
  });
});
