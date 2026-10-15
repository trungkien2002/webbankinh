import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { createDraft, saveDraftItems, saveMeasurement } from './bao-service';
import {
  commitCategoryImport,
  commitProductImport,
  importKeyFor,
  payInvoice,
  previewCategoryImport,
  previewProductImport,
  removeInvoiceItem,
  searchCategories,
  searchInvoices,
  sellableProducts,
  setUserLocked,
  softDeleteProduct,
  updateCustomer,
  vietQrPayload,
} from './hoan-service';
import { loginDemo, getDemoSession } from './demoSession';
import { EyePrescription } from '../contracts/domain';

const prescription: EyePrescription = {
  sphereRight: -1.5, cylinderRight: -0.5, axisRight: 90,
  sphereLeft: -1, cylinderLeft: 0, axisLeft: 0,
  pupillaryDistance: 62, measuredAt: '2026-10-13', notes: 'Hoan fixture',
};
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  db.reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('LSP002/LSP005 — category import and search', () => {
  it('previews row errors, imports valid rows once, and searches without accent', () => {
    const sheet = [
      ['Tên', 'Mô tả', 'Chất liệu'],
      ['Gọng titan mới', 'Nhẹ', 'Titanium'],
      ['', 'Thiếu tên', 'Acetate'],
      ['Gọng kính', 'Trùng hệ thống', 'Acetate'],
      ['Gọng titan mới', 'Trùng trong file', 'Titanium'],
    ];
    const preview = previewCategoryImport('USR001', sheet);
    expect(preview.valid).toHaveLength(1);
    expect(preview.errors.map(e => e.line)).toEqual([3, 4, 5]);
    expect(() => previewCategoryImport('USR002', sheet)).toThrow(/quyền/);
    const key = importKeyFor('category-import', preview.valid);
    expect(commitCategoryImport('USR001', preview.valid, key).imported).toBe(1);
    expect(commitCategoryImport('USR001', preview.valid, key).duplicate).toBe(true);
    expect(searchCategories('USR002', { q: 'gong titan' }).some(c => c.name === 'Gọng titan mới')).toBe(true);
    expect(searchCategories('USR001', { material: 'titanium' }).some(c => c.material === 'Titanium')).toBe(true);
  });
});

describe('SP002/SP003 — product import and soft delete', () => {
  it('increments stock by barcode/lot and does not apply the same file twice', () => {
    const sheet = [
      ['SKU', 'Barcode', 'Số lượng', 'Lô'],
      ['GK001', '893111111111', '2', 'LO-01'],
      ['MISSING', '1', '1', ''],
      ['GK001', '', '0', ''],
    ];
    const preview = previewProductImport('USR002', sheet);
    expect(preview.valid).toEqual([{ sku: 'GK001', barcode: '893111111111', quantity: 2, lot: 'LO-01' }]);
    expect(preview.errors).toHaveLength(2);
    const key = importKeyFor('product-import', preview.valid);
    expect(db.products[0].stock).toBe(12);
    expect(commitProductImport('USR002', preview.valid, key).imported).toBe(1);
    expect(db.products[0].stock).toBe(14);
    expect(db.products[0].barcode).toBe('893111111111');
    expect(commitProductImport('USR002', preview.valid, key).duplicate).toBe(true);
    expect(db.products[0].stock).toBe(14);
  });

  it('hides deleted products from sellable list but keeps invoice history', () => {
    const draft = createDraft('USR001');
    saveDraftItems('USR001', draft.id, { PRD001: 1 });
    expect(() => softDeleteProduct('USR002', 'PRD001')).toThrow(/quyền/);
    softDeleteProduct('USR001', 'PRD001');
    expect(sellableProducts().some(p => p.id === 'PRD001')).toBe(false);
    expect(db.invoices[0].items[0].productName).toContain('Céleste');
  });
});

describe('BH003/BH004/HD001 — cart line, pay, search invoices', () => {
  it('removes a line, recalculates totals, and rejects paid invoices', () => {
    const draft = createDraft('USR001');
    saveDraftItems('USR001', draft.id, { PRD001: 2, PRD002: 1 });
    const line = db.invoices[0].items.find(i => i.productId === 'PRD002')!;
    const next = removeInvoiceItem('USR001', draft.id, line.id);
    expect(next.items).toHaveLength(1);
    expect(next.subtotal).toBe(1700000);
    expect(() => removeInvoiceItem('USR001', draft.id, 'missing')).toThrow();
  });

  it('charges cash/QR once, keeps VietQR amount in payload, and searches by phone digits', () => {
    const draft = createDraft('USR001');
    saveDraftItems('USR001', draft.id, { PRD001: 1 });
    expect(() => payInvoice('USR001', draft.id, { method: 'cash', cashReceived: 100, idempotencyKey: 'pay-1' })).toThrow(/tiền mặt/);
    const key = 'pay-once';
    const paid = payInvoice('USR001', draft.id, { method: 'cash', cashReceived: 850000, idempotencyKey: key });
    expect(paid.paymentStatus).toBe('paid');
    expect(db.products[0].stock).toBe(11);
    expect(payInvoice('USR001', draft.id, { method: 'cash', cashReceived: 850000, idempotencyKey: key }).id).toBe(paid.id);
    expect(db.products[0].stock).toBe(11);
    const qrDraft = createDraft('USR001');
    saveMeasurement('USR001', qrDraft.id, 'CUS001', prescription);
    saveDraftItems('USR001', qrDraft.id, { PRD002: 1 });
    const qrPaid = payInvoice('USR001', qrDraft.id, { method: 'qr', idempotencyKey: 'qr-1' });
    expect(vietQrPayload(qrPaid)).toContain(String(qrPaid.totalAmount));
    expect(searchInvoices('USR001', '0901').some(i => i.id === paid.id)).toBe(false);
    expect(searchInvoices('USR001', db.customers[0].phone).some(i => i.id === qrPaid.id)).toBe(true);
    expect(searchInvoices('USR002', paid.invoiceCode, { status: 'paid' }).length).toBeGreaterThan(0);
  });
});

describe('KH002/NV003 — customer edit and account lock', () => {
  it('adds a new prescription without rewriting paid snapshots and rejects duplicate phones', () => {
    const draft = createDraft('USR001');
    saveDraftItems('USR001', draft.id, { PRD001: 1 });
    saveMeasurement('USR001', draft.id, 'CUS001', prescription);
    payInvoice('USR001', draft.id, { method: 'transfer', idempotencyKey: 't-1' });
    const snapshot = db.invoices[0].prescription?.sphereRight;
    updateCustomer('USR001', 'CUS001', { fullName: 'Khách mới', phone: '0912345678', address: 'Q1' }, {
      ...prescription, sphereRight: -9, measuredAt: '2026-10-14',
    });
    expect(db.customers[0].fullName).toBe('Khách mới');
    expect(db.customers[0].prescriptions.at(-1)?.sphereRight).toBe(-9);
    expect(db.invoices[0].prescription?.sphereRight).toBe(snapshot);
    expect(() => updateCustomer('USR001', 'CUS001', { fullName: 'X', phone: db.customers[1].phone })).toThrow(/điện thoại/);
  });

  it('locks an employee, revokes the session, and refuses locking the last admin', async () => {
    await loginDemo('hoan@example.com', 'Demo@123');
    expect(getDemoSession()?.id).toBe('USR002');
    setUserLocked('USR001', 'USR002', true);
    expect(db.users[1].isActive).toBe(false);
    expect(getDemoSession()).toBeNull();
    await expect(loginDemo('hoan@example.com', 'Demo@123')).rejects.toThrow(/khóa/);
    setUserLocked('USR001', 'USR002', false);
    await expect(loginDemo('hoan@example.com', 'Demo@123')).resolves.toMatchObject({ id: 'USR002' });
    expect(() => setUserLocked('USR002', 'USR001', true)).toThrow(/quyền/);
    expect(() => setUserLocked('USR001', 'USR001', true)).toThrow(/cuối cùng/);
  });
});
