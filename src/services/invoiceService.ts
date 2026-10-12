// src/services/invoiceService.ts
// Phân hệ Hóa đơn - BH002: Treo hoá đơn & HD004: Lọc hóa đơn theo thời gian, trạng thái

import { Invoice, InvoiceItem, InvoicePaymentStatus, InvoiceProductionStatus } from '../contracts/domain';
import { db } from './database';

export interface CreatePendingInvoiceInput {
  items: InvoiceItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  employeeId: string;
  employeeName: string;
  voucherCode?: string;
  voucherDiscountSnapshot?: number;
  notes?: string;
}

export interface FilterInvoiceInput {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  paymentStatus?: InvoicePaymentStatus | 'all';
  productionStatus?: InvoiceProductionStatus | 'all';
  searchQuery?: string; // Tìm theo mã HD hoặc Tên/SĐT khách
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class InvoiceService {
  /**
   * BH002: Treo hoá đơn (Lưu đơn chờ thanh toán / chờ mài lắp tròng)
   * - Chuyển đơn sang trạng thái paymentStatus: 'pending', productionStatus: 'cutting_lens'
   * - Giúp nhân viên tiếp tục phục vụ khách hàng khác mà không mất giỏ hàng đang đo
   */
  public holdPendingInvoice(input: CreatePendingInvoiceInput): ServiceResult<Invoice> {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Không thể treo hóa đơn khi giỏ hàng chưa có sản phẩm.' };
    }
    if (input.items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      return { success: false, error: 'Số lượng và giá sản phẩm không hợp lệ.' };
    }

    const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = input.voucherDiscountSnapshot || 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const invoiceCount = db.invoices.length + 1;
    const invoiceCode = 'HD' + String(invoiceCount).padStart(4, '0');

    const newInvoice: Invoice = {
      id: 'INV' + String(Date.now()) + '_' + Math.random().toString(36).substr(2, 5),
      invoiceCode,
      customerId: input.customerId,
      customerName: input.customerName || 'Khách vãng lai',
      customerPhone: input.customerPhone,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      items: input.items,
      subtotal,
      discountAmount,
      voucherCode: input.voucherCode,
      voucherDiscountSnapshot: discountAmount,
      totalAmount,
      paymentMethod: 'cash',
      paymentStatus: 'pending', // Treo đơn
      productionStatus: 'cutting_lens', // Chờ mài lắp kính
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.setInvoices([...db.invoices, newInvoice]);

    return {
      success: true,
      data: newInvoice,
    };
  }

  /**
   * Lấy danh sách hóa đơn đang treo (Pending) để nhân viên tải lại vào POS
   */
  public getPendingInvoices(): Invoice[] {
    return db.invoices.filter(inv => inv.paymentStatus === 'pending');
  }

  /**
   * Khôi phục / thanh toán hóa đơn treo
   */
  public markAsPaid(invoiceId: string, paymentMethod: 'cash' | 'transfer' = 'cash'): ServiceResult<Invoice> {
    const invoices = db.invoices;
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) {
      return { success: false, error: 'Hóa đơn không tồn tại.' };
    }

    const target = invoices[idx];
    if (target.paymentStatus === 'paid') {
      return { success: false, error: 'Hóa đơn này đã được thanh toán trước đó.' };
    }
    if (target.paymentStatus === 'cancelled') return { success: false, error: 'Đơn đã hủy không thể thanh toán.' };
    const quantities = new Map<string, number>();
    for (const item of target.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    for (const [id, quantity] of quantities) {
      const product = db.products.find(p => p.id === id && !p.isDeleted);
      if (!product || product.stock < quantity) return { success: false, error: 'Sản phẩm không còn đủ tồn kho để thanh toán.' };
    }

    const updated: Invoice = {
      ...target,
      paymentStatus: 'paid',
      productionStatus: 'completed',
      paymentMethod,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newInvoices = [...invoices];
    newInvoices[idx] = updated;
    db.setProducts(db.products.map(product => ({ ...product, stock: product.stock - (quantities.get(product.id) || 0) })));
    db.setInvoices(newInvoices);

    return { success: true, data: updated };
  }

  /**
   * HD004: Lọc hóa đơn theo thời gian, trạng thái thanh toán và trạng thái mài lắp
   */
  public filterInvoices(filter: FilterInvoiceInput): Invoice[] {
    let result = db.invoices;

    // 1. Lọc theo trạng thái thanh toán
    if (filter.paymentStatus && filter.paymentStatus !== 'all') {
      result = result.filter(inv => inv.paymentStatus === filter.paymentStatus);
    }

    // 2. Lọc theo trạng thái mài lắp kỹ thuật
    if (filter.productionStatus && filter.productionStatus !== 'all') {
      result = result.filter(inv => inv.productionStatus === filter.productionStatus);
    }

    // 3. Lọc theo khoảng ngày (tính theo múi giờ địa phương)
    if (filter.fromDate) {
      const from = new Date(filter.fromDate + 'T00:00:00');
      result = result.filter(inv => new Date(inv.createdAt) >= from);
    }
    if (filter.toDate) {
      const to = new Date(filter.toDate + 'T23:59:59');
      result = result.filter(inv => new Date(inv.createdAt) <= to);
    }

    // 4. Tìm kiếm từ khóa mã HD hoặc Tên/SĐT
    if (filter.searchQuery) {
      const q = filter.searchQuery.trim().toLowerCase();
      result = result.filter(
        inv =>
          inv.invoiceCode.toLowerCase().includes(q) ||
          (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
          (inv.customerPhone && inv.customerPhone.includes(q))
      );
    }

    return result;
  }
}

export const invoiceService = new InvoiceService();
