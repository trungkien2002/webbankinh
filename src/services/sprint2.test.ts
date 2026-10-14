// src/services/sprint2.test.ts
// Test suites cho Sprint 2: SP001 & SP005

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import { productService } from './productService';

describe('Sprint 2 - SP001: Thêm sản phẩm kính thủ công', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Admin thêm mẫu gọng kính mới đầy đủ thông số', () => {
    const result = productService.createProduct({
      sku: 'GK999',
      name: 'Gọng kính Titanium Pro',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      brand: 'RayBan',
      material: 'Titanium',
      color: 'Bạc ánh kim',
      shape: 'Tròn',
      barcode: '893999999999',
      price: 1500000,
      stock: 10,
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.sku).toBe('GK999');
    expect(result.data?.price).toBe(1500000);
    expect(result.data?.stock).toBe(10);

    // Kiểm tra lưu DB
    const saved = db.products.find(p => p.sku === 'GK999');
    expect(saved).toBeDefined();
  });

  it('Thất bại: Chặn nhân viên thêm sản phẩm (Role check)', () => {
    const result = productService.createProduct({
      sku: 'GK999',
      name: 'Gọng kính Titanium Pro',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      price: 1500000,
      stock: 10,
      currentActorRole: 'employee',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Quyền bị từ chối');
  });

  it('Thất bại: Báo lỗi khi SKU đã tồn tại', () => {
    // GK001 đã có trong seed DB
    const result = productService.createProduct({
      sku: 'GK001',
      name: 'Gọng kính mẫu mới',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      price: 800000,
      stock: 5,
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('đã tồn tại trên hệ thống');
  });

  it('Thất bại: Báo lỗi khi danh mục không hợp lệ hoặc đã bị xóa', () => {
    const result = productService.createProduct({
      sku: 'GK002',
      name: 'Gọng kính mẫu mới',
      categoryId: 'INVALID_CATEGORY',
      productType: 'Gọng kính',
      price: 800000,
      stock: 5,
      currentActorRole: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Phân loại kính không hợp lệ');
  });

  it('Thất bại: Báo lỗi khi giá hoặc tồn kho âm', () => {
    const resultNegativePrice = productService.createProduct({
      sku: 'GK003',
      name: 'Gọng kính giá âm',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      price: -1000,
      stock: 5,
      currentActorRole: 'admin',
    });
    expect(resultNegativePrice.success).toBe(false);
    expect(resultNegativePrice.error).toContain('không được âm');

    const resultNegativeStock = productService.createProduct({
      sku: 'GK004',
      name: 'Gọng kính tồn âm',
      categoryId: 'CAT001',
      productType: 'Gọng kính',
      price: 500000,
      stock: -2,
      currentActorRole: 'admin',
    });
    expect(resultNegativeStock.success).toBe(false);
    expect(resultNegativeStock.error).toContain('không được âm');
  });
});

describe('Sprint 2 - SP005: Tìm kiếm sản phẩm kính', () => {
  beforeEach(() => {
    db.reset();
  });

  it('Thành công: Tìm kiếm theo tên sản phẩm', () => {
    const found = productService.searchProducts({ query: 'Céleste' });
    expect(found.length).toBe(1);
    expect(found[0].sku).toBe('GK001');
  });

  it('Thành công: Tìm kiếm theo SKU', () => {
    const found = productService.searchProducts({ query: 'TR001' });
    expect(found.length).toBe(1);
    expect(found[0].name).toBe('Tròng kính BlueCut 1.60');
  });

  it('Thành công: Lọc đa tiêu chí kết hợp (Phân loại + Dáng mắt)', () => {
    const found = productService.searchProducts({
      categoryId: 'CAT001',
      shape: 'Vuông bo viền',
    });
    expect(found.length).toBe(1);
    expect(found[0].sku).toBe('GK001');
  });

  it('Thành công: Lọc theo khoảng giá', () => {
    const found = productService.searchProducts({
      minPrice: 500000,
      maxPrice: 1000000,
    });
    expect(found.length).toBe(1);
    expect(found[0].price).toBe(850000);
  });

  it('Thành công: Tìm kiếm không khớp trả về mảng rỗng', () => {
    const found = productService.searchProducts({ query: 'KHONG_CO_SAN_PHAM' });
    expect(found.length).toBe(0);
  });
});
