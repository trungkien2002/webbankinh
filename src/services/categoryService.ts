// src/services/categoryService.ts
// Phân hệ Phân loại kính - LSP004: Xóa phân loại kính (Soft delete & validation)

import { Category } from '../contracts/domain';
import { db } from './database';

export interface DeleteCategoryInput {
  categoryId: string;
  currentActorRole: 'admin' | 'employee';
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CategoryService {
  /**
   * Lấy danh sách phân loại đang hoạt động (không lấy các mục đã xóa mềm)
   */
  public getActiveCategories(): Category[] {
    return db.categories.filter(c => !c.isDeleted);
  }

  /**
   * Lấy tất cả phân loại (bao gồm cả phân loại đã xóa cho Admin theo dõi)
   */
  public getAllCategories(): Category[] {
    return db.categories;
  }

  /**
   * LSP004: Xóa mềm phân loại kính
   * - Validate quyền Admin
   * - Validate tồn tại
   * - Validate ràng buộc sản phẩm liên kết (nếu có sản phẩm đang dùng danh mục thì chặn không cho xóa)
   * - Xóa mềm (soft delete), cập nhật deletedAt, không cascade làm mất sản phẩm hay hóa đơn cũ
   */
  public deleteCategory(input: DeleteCategoryInput): ServiceResult<Category> {
    // 1. Phân quyền Admin
    if (input.currentActorRole !== 'admin') {
      return {
        success: false,
        error: 'Quyền bị từ chối: Chỉ quản trị viên (Admin) mới có quyền xóa phân loại kính.',
      };
    }

    const { categoryId } = input;
    const categories = db.categories;
    const targetIndex = categories.findIndex(c => c.id === categoryId);

    if (targetIndex === -1) {
      return {
        success: false,
        error: 'Phân loại kính không tồn tại.',
      };
    }

    const targetCategory = categories[targetIndex];

    if (targetCategory.isDeleted) {
      return {
        success: false,
        error: 'Phân loại kính này đã bị xóa trước đó.',
      };
    }

    // 2. Kiểm tra ràng buộc sản phẩm liên kết
    const linkedProducts = db.products.filter(p => p.categoryId === categoryId && !p.isDeleted);
    if (linkedProducts.length > 0) {
      return {
        success: false,
        error: `Không thể xóa: Phân loại đang liên kết với ${linkedProducts.length} sản phẩm đang kinh doanh (${linkedProducts.map(p => p.name).slice(0, 3).join(', ')}...). Vui lòng chuyển hoặc xóa sản phẩm trước.`,
      };
    }

    // 3. Thực hiện Soft Delete
    const updatedCategory: Category = {
      ...targetCategory,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newCategories = [...categories];
    newCategories[targetIndex] = updatedCategory;
    db.setCategories(newCategories);

    return {
      success: true,
      data: updatedCategory,
    };
  }

  /**
   * Thêm phân loại mới (hỗ trợ tạo fixture test & nghiệp vụ)
   */
  public createCategory(name: string, description: string): ServiceResult<Category> {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Tên phân loại không được để trống.' };
    }

    const exists = db.categories.some(c => !c.isDeleted && c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'Tên phân loại đã tồn tại.' };
    }

    const newCat: Category = {
      id: 'CAT' + String(Date.now()).slice(-6),
      name: trimmed,
      description,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.setCategories([...db.categories, newCat]);
    return { success: true, data: newCat };
  }
}

export const categoryService = new CategoryService();
