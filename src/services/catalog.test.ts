import { describe, expect, it, afterEach, vi } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import database from "../../data/local-database.json";
import { db } from "./database";
import { prepareDemoCatalog } from "./catalog";
import { invoiceService } from './invoiceService';

describe("Database local dùng chung", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("Có đúng 50 mã hàng, bốn phân loại và ảnh local hợp lệ", () => {
    expect(database.products).toHaveLength(50);
    expect(new Set(database.products.map((p) => p.id)).size).toBe(50);
    expect(new Set(database.products.map((p) => p.sku)).size).toBe(50);
    expect(new Set(database.products.map((p) => p.categoryId)).size).toBe(4);
    for (const product of database.products) {
      expect(database.categories.some((c) => c.id === product.categoryId)).toBe(
        true,
      );
      expect(Number.isFinite(product.price) && product.price > 0).toBe(true);
      expect(Number.isInteger(product.stock) && product.stock >= 0).toBe(true);
      expect(existsSync(resolve("assets/catalog", `${product.sku}.jpg`))).toBe(
        true,
      );
    }
  });
  it("Nạp seed một lần, giữ hóa đơn cũ và mã hàng lịch sử", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    db.reset();
    invoiceService.holdPendingInvoice({employeeId: 'EMP001', employeeName: 'Nhân viên', items: [{id:'line1', productId:'PRD001', productName:'Céleste', sku:'GK001', unitPrice:850000, quantity:1, lineTotal:850000}]});
    const historical = [...db.invoices];
    prepareDemoCatalog();
    prepareDemoCatalog();
    expect(db.products.filter((p) => !p.isDeleted)).toHaveLength(50);
    expect(db.products.find((p) => p.id === "PRD001")?.isDeleted).toBe(true);
    expect(db.invoices).toEqual(historical);
    expect(
      JSON.parse(store.get("webbankinh_db")!).products.filter(
        (p: { isDeleted: boolean }) => !p.isDeleted,
      ),
    ).toHaveLength(50);
  });
});
