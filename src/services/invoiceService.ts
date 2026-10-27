// src/services/invoiceService.ts
// Phân hệ Hóa đơn - BH002: Treo hoá đơn & HD004: Lọc hóa đơn theo thời gian, trạng thái

import { Invoice, InvoiceItem, InvoicePaymentStatus, InvoiceProductionStatus } from '../contracts/domain';
import { db } from './database';
import { isCalendarDay, vietnamDayStart } from './vietnam-date';
import {invoiceTotals} from './invoice-totals';
import { nextInvoiceCode } from './invoice-code';

export interface CreatePendingInvoiceInput {
  taxRate?: number;
  items: InvoiceItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  employeeId: string;
  employeeName: string;
  voucherCode?: string;
  voucherDiscountSnapshot?: number;
  notes?: string;
  deliveryAddress?: string;
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
   * - Lưu đơn chờ; chỉ bắt đầu gia công sau khi nhân viên lưu số đo và xử lý đơn.
   * - Giúp nhân viên tiếp tục phục vụ khách hàng khác mà không mất giỏ hàng đang đo
   */
  public holdPendingInvoice(input: CreatePendingInvoiceInput): ServiceResult<Invoice> {
    const customerName = input.customerName?.trim();
    const customerPhone = input.customerPhone?.trim();
    const deliveryAddress = input.deliveryAddress?.trim();
    if (input.employeeId === 'ONLINE') {
      if (!customerName || !/^\d{9,11}$/.test(customerPhone || ''))
        return { success: false, error: 'Vui lòng nhập tên và số điện thoại từ 9 đến 11 chữ số.' };
      if (!deliveryAddress)
        return { success: false, error: 'Vui lòng nhập địa chỉ nhận hàng.' };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Không thể treo hóa đơn khi giỏ hàng chưa có sản phẩm.' };
    }
    if (input.items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      return { success: false, error: 'Số lượng và giá sản phẩm không hợp lệ.' };
    }

    const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = input.voucherDiscountSnapshot || 0;
    let totals;
    try {totals=invoiceTotals(subtotal,discountAmount,0,input.taxRate||0);}catch(e){return {success:false,error:(e as Error).message};}

    const invoiceCode = nextInvoiceCode(db.invoices);

    const newInvoice: Invoice = {
      id: 'INV' + String(Date.now()) + '_' + Math.random().toString(36).substr(2, 5),
      invoiceCode,
      customerId: input.customerId,
      customerName: customerName || 'Khách vãng lai',
      customerPhone,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      items: input.items,
      subtotal,
      discountAmount,
      voucherCode: input.voucherCode,
      voucherDiscountSnapshot: discountAmount,
      ...totals,
      paymentMethod: 'cash',
      paymentStatus: 'pending', // Treo đơn
      productionStatus: 'none',
      notes: deliveryAddress ? `Giao đến: ${deliveryAddress}` : input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      db.transaction(data => { data.invoices.push(newInvoice); });
    } catch {
      return { success: false, error: 'Không thể lưu đơn hàng trên trình duyệt. Vui lòng kiểm tra dung lượng lưu trữ và thử lại.' };
    }

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
    try {
      db.transaction(data => {
        data.products = data.products.map(product => ({ ...product, stock: product.stock - (quantities.get(product.id) || 0) }));
        data.invoices = newInvoices;
      });
    } catch {
      return { success: false, error: 'Không thể lưu thanh toán. Đơn hàng và tồn kho được giữ nguyên, vui lòng thử lại.' };
    }

    return { success: true, data: updated };
  }

  /**
   * Kiểm tra khoảng ngày hợp lệ
   */
  public validateDateRange(fromDate?: string, toDate?: string): { valid: boolean; error?: string } {
    if ((fromDate && !isCalendarDay(fromDate)) || (toDate && !isCalendarDay(toDate)))
      return {valid:false,error:'Ngày không hợp lệ (YYYY-MM-DD).'};
    if (fromDate && toDate && fromDate > toDate) {
      return { valid: false, error: 'Từ ngày không được lớn hơn đến ngày.' };
    }
    return { valid: true };
  }

  /**
   * HD004: Lọc hóa đơn theo thời gian, trạng thái thanh toán và trạng thái mài lắp
   */
  public filterInvoices(filter: FilterInvoiceInput): Invoice[] {
    const dateCheck = this.validateDateRange(filter.fromDate, filter.toDate);
    if (!dateCheck.valid) {
      throw new Error(dateCheck.error);
    }

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
      const from = vietnamDayStart(filter.fromDate);
      result = result.filter(inv => Date.parse(inv.createdAt) >= from);
    }
    if (filter.toDate) {
      const endExclusive = vietnamDayStart(filter.toDate) + 86_400_000;
      result = result.filter(inv => Date.parse(inv.createdAt) < endExclusive);
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
