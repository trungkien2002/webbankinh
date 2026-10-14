import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./database";
import { invoiceService } from "./invoiceService";
import { productService } from "./productService";
const order = (quantity = 1) => ({
  employeeId: "EMP001",
  employeeName: "Nhân viên demo",
  items: [
    {
      id: "item",
      productId: "PRD001",
      productName: "Céleste",
      sku: "GK001",
      quantity,
      unitPrice: 850000,
      lineTotal: quantity * 850000,
    },
  ],
});
describe("Luồng bán hàng và tồn kho của web", () => {
  beforeEach(() => db.reset());
  it("Đơn chờ giữ tồn kho; thanh toán trừ tồn đúng một lần", () => {
    const invoice = invoiceService.holdPendingInvoice(order(2)).data!;
    expect(db.products[0].stock).toBe(12);
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(true);
    expect(db.products[0].stock).toBe(10);
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(false);
    expect(db.products[0].stock).toBe(10);
  });
  it("Không thanh toán khi hàng đã hết; hóa đơn vẫn chờ", () => {
    const invoice = invoiceService.holdPendingInvoice(order(13)).data!;
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(false);
    expect(db.invoices[0].paymentStatus).toBe("pending");
    expect(db.products[0].stock).toBe(12);
  });
  it("Chặn số lượng âm, lẻ hoặc không phải số", () => {
    for (const quantity of [-1, 0, 1.5, NaN])
      expect(invoiceService.holdPendingInvoice(order(quantity)).success).toBe(
        false,
      );
    expect(db.invoices).toHaveLength(0);
  });
  it("Chặn giá NaN và tồn kho lẻ khi thêm sản phẩm", () => {
    const input = {
      sku: "TEST",
      name: "Kính thử",
      categoryId: "CAT001",
      productType: "Gọng kính" as const,
      currentActorRole: "admin" as const,
      price: NaN,
      stock: 1,
    };
    expect(productService.createProduct(input).success).toBe(false);
    expect(
      productService.createProduct({ ...input, price: 100, stock: 1.5 })
        .success,
    ).toBe(false);
  });
});
