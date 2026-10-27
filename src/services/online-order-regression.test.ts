import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { invoiceService, CreatePendingInvoiceInput } from './invoiceService';
import { createDraft, deleteUnpaidInvoice, saveDraftItems, saveMeasurement, completeDraft } from './bao-service';

let stored: Map<string, string>;
const order = (): CreatePendingInvoiceInput => ({
  employeeId: 'ONLINE', employeeName: 'Cửa hàng trực tuyến',
  customerName: 'Nguyễn An', customerPhone: '0381234567', deliveryAddress: '12 Đường Mùa Thu',
  taxRate: 10,
  items: [{ id: 'line', productId: 'PRD001', productName: 'Gọng kính', sku: 'GK001', quantity: 1, unitPrice: 850000, lineTotal: 850000 }],
});
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
    removeItem: (key: string) => { stored.delete(key); },
  });
  db.reset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Online orders and persistence regression', () => {
  it('keeps invoice codes unique after deleting a middle invoice and mixing POS with online', () => {
    invoiceService.holdPendingInvoice(order());
    const middle = createDraft('USR001');
    const third = invoiceService.holdPendingInvoice(order()).data!;
    deleteUnpaidInvoice('USR001', middle.id);
    const next = invoiceService.holdPendingInvoice(order()).data!;
    expect(next.invoiceCode).not.toBe(third.invoiceCode);
    createDraft('USR001');
    expect(new Set(db.invoices.map(i => i.invoiceCode)).size).toBe(4);
  });

  it('returns a clear error without a ghost order when storage fails; retry creates one order', () => {
    const before = stored.get('webbankinh_db');
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const result = invoiceService.holdPendingInvoice(order());
    expect(result.success).toBe(false);
    expect(result.error).toContain('Không thể lưu đơn hàng');
    expect(db.invoices).toHaveLength(0);
    expect(stored.get('webbankinh_db')).toBe(before);
    write.mockRestore();
    expect(invoiceService.holdPendingInvoice(order()).success).toBe(true);
    expect(db.invoices).toHaveLength(1);
  });

  it('rolls back the invoice setter on storage failure', () => {
    const invoice = invoiceService.holdPendingInvoice(order()).data!;
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    expect(() => db.setInvoices([])).toThrow();
    expect(db.invoices.map(i => i.id)).toEqual([invoice.id]);
  });

  it('keeps stock and payment unchanged on failed save, then pays exactly once on retry', () => {
    const invoice = invoiceService.holdPendingInvoice(order()).data!;
    const stock = db.products[0].stock;
    const before = stored.get('webbankinh_db');
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(false);
    expect(db.invoices[0].paymentStatus).toBe('pending');
    expect(db.products[0].stock).toBe(stock);
    expect(stored.get('webbankinh_db')).toBe(before);
    write.mockRestore();
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(true);
    expect(db.products[0].stock).toBe(stock - 1);
    expect(invoiceService.markAsPaid(invoice.id).success).toBe(false);
    expect(db.products[0].stock).toBe(stock - 1);
    expect(JSON.parse(stored.get('webbankinh_db')!).invoices[0].paymentStatus).toBe('paid');
  });

  it.each([undefined, '', '   '])('rejects missing delivery address: %s', address => {
    const result = invoiceService.holdPendingInvoice({ ...order(), deliveryAddress: address });
    expect(result.success).toBe(false);
    expect(result.error).toContain('địa chỉ nhận hàng');
    expect(db.invoices).toHaveLength(0);
  });

  it('trims delivery data and retains the address in the invoice', () => {
    const result = invoiceService.holdPendingInvoice({ ...order(), customerName: '  Nguyễn An  ', deliveryAddress: '  12 Đường Mùa Thu  ' });
    expect(result.data?.customerName).toBe('Nguyễn An');
    expect(result.data?.notes).toBe('Giao đến: 12 Đường Mùa Thu');
    expect(result.data?.totalAmount).toBe(935000);
  });

  it('allows a counter order without a delivery address', () => {
    expect(invoiceService.holdPendingInvoice({ ...order(), employeeId: 'EMP001', deliveryAddress: undefined }).success).toBe(true);
  });

  it.each(['Gọng kính', 'Tròng kính', 'Phụ kiện'] as const)('does not start grinding for a new %s order without measurements', type => {
    db.products[0].productType = type;
    const invoice = invoiceService.holdPendingInvoice(order()).data!;
    expect(invoice.productionStatus).toBe('none');
    expect(invoice.prescription).toBeUndefined();
  });

  it('still starts grinding after staff saves a prescription and confirms a lens order', () => {
    const draft = createDraft('USR001');
    saveDraftItems('USR001', draft.id, { PRD002: 1 });
    saveMeasurement('USR001', draft.id, 'CUS001', {
      sphereRight: -1, sphereLeft: -1, cylinderRight: 0, cylinderLeft: 0,
      axisRight: 0, axisLeft: 0, pupillaryDistance: 62, measuredAt: '2026-10-27',
    });
    completeDraft('USR001', draft.id, false, 'cash');
    expect(db.invoices[0].productionStatus).toBe('cutting_lens');
  });
});
