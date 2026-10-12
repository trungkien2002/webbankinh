// src/services/productService.ts
// Phân hệ Sản phẩm kính - SP001 (Thêm SP thủ công) & SP005 (Tìm kiếm SP)

import { Product, ProductType } from '../contracts/domain';
import { db } from './database';

export interface CreateProductInput {
  sku: string;
  name: string;
  categoryId: string;
  productType: ProductType;
  brand?: string;
  material?: string;
  color?: string;
  shape?: string;
  barcode?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  currentActorRole: 'admin' | 'employee';
}

export interface SearchProductFilter {
  query?: string; // Tìm theo SKU hoặc Tên hoặc barcode
  categoryId?: string;
  productType?: ProductType;
  brand?: string;
  shape?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ProductService {
  /**
   * SP001: Thêm sản phẩm kính thủ công
   * - Chỉ Admin mới có quyền
   * - Validate SKU bắt buộc, không trùng
   * - Validate CategoryId phải tồn tại và chưa bị xóa mềm
   * - Validate Giá bán >= 0, Tồn kho >= 0
   */
  public createProduct(input: CreateProductInput): ServiceResult<Product> {
    if (input.currentActorRole !== 'admin') {
      return {
        success: false,
        error: 'Quyền bị từ chối: Chỉ quản trị viên (Admin) mới có quyền thêm sản phẩm.',
      };
    }

    const sku = input.sku?.trim().toUpperCase();
    const name = input.name?.trim();

    if (!sku) {
      return { success: false, error: 'Mã SKU sản phẩm không được để trống.' };
    }
    if (!name) {
      return { success: false, error: 'Tên sản phẩm không được để trống.' };
    }

    // Validate SKU trùng
    const isSkuTaken = db.products.some(p => p.sku.toUpperCase() === sku && !p.isDeleted);
    if (isSkuTaken) {
      return { success: false, error: `Mã SKU "${sku}" đã tồn tại trên hệ thống.` };
    }

    // Validate Category hợp lệ
    const category = db.categories.find(c => c.id === input.categoryId);
    if (!category || category.isDeleted) {
      return { success: false, error: 'Phân loại kính không hợp lệ hoặc đã ngừng hoạt động.' };
    }

    // Validate Giá & Tồn kho
    if (typeof input.price !== 'number' || input.price < 0) {
      return { success: false, error: 'Giá bán phải là số hợp lệ và không được âm.' };
    }
    if (typeof input.stock !== 'number' || input.stock < 0) {
      return { success: false, error: 'Số lượng tồn kho không được âm.' };
    }

    const newProduct: Product = {
      id: 'PRD' + String(Date.now()).slice(-6),
      sku,
      name,
      categoryId: input.categoryId,
      productType: input.productType || 'Gọng kính',
      brand: input.brand?.trim(),
      material: input.material?.trim(),
      color: input.color?.trim(),
      shape: input.shape?.trim(),
      barcode: input.barcode?.trim(),
      price: input.price,
      stock: input.stock,
      imageUrl: input.imageUrl,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.setProducts([...db.products, newProduct]);

    return {
      success: true,
      data: newProduct,
    };
  }

  /**
   * SP005: Tìm kiếm & Lọc nâng cao sản phẩm kính
   * - Hỗ trợ tìm kiếm không dấu / có dấu
   * - Lọc theo SKU, barcode, tên, hãng, dáng mắt, khoảng giá
   */
  public searchProducts(filter: SearchProductFilter = {}): Product[] {
    let result = db.products.filter(p => !p.isDeleted);

    if (filter.query) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (filter.categoryId) {
      result = result.filter(p => p.categoryId === filter.categoryId);
    }

    if (filter.productType) {
      result = result.filter(p => p.productType === filter.productType);
    }

    if (filter.brand) {
      const b = filter.brand.trim().toLowerCase();
      result = result.filter(p => p.brand && p.brand.toLowerCase() === b);
    }

    if (filter.shape) {
      const s = filter.shape.trim().toLowerCase();
      result = result.filter(p => p.shape && p.shape.toLowerCase() === s);
    }

    if (filter.color) {
      const c = filter.color.trim().toLowerCase();
      result = result.filter(p => p.color && p.color.toLowerCase().includes(c));
    }

    if (typeof filter.minPrice === 'number') {
      result = result.filter(p => p.price >= filter.minPrice!);
    }

    if (typeof filter.maxPrice === 'number') {
      result = result.filter(p => p.price <= filter.maxPrice!);
    }

    if (filter.inStockOnly) {
      result = result.filter(p => p.stock > 0);
    }

    return result;
  }

  public getAllActiveProducts(): Product[] {
    return db.products.filter(p => !p.isDeleted);
  }
}

export const productService = new ProductService();
