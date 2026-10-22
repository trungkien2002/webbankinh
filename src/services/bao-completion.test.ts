import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { updateCustomer, setUserLocked } from './hoan-service';
import { queryEmployees } from './employeeService';
import { createDraft, saveDraftItems, saveMeasurement, invoiceDetail } from './bao-service';
import { getDemoSession, loginDemo } from './demoSession';
import { customerService } from './customerService';
import { invoiceList, vietnamInvoiceDate } from './invoice-list';
import { productService } from './productService';
import { EyePrescription } from '../contracts/domain';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
  const session = new Map();
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => session.set(k, v), removeItem: (k: string) => session.delete(k) });
  db.reset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const prescription: EyePrescription = { sphereRight: -1, cylinderRight: 0, axisRight: 0, sphereLeft: -1.5, cylinderLeft: 0, axisLeft: 0, pupillaryDistance: 62, measuredAt: '2026-10-22' };

describe('KH002 customer management adapter', () => {
  it('employee edits contact and appends measurements without changing code, past measurements or invoice snapshots', () => {
    const draft = createDraft('USR001'); saveDraftItems('USR001', draft.id, { PRD001: 1 });
    saveMeasurement('USR001', draft.id, 'CUS001', prescription);
    db.transaction(data => { data.invoices.find(i => i.id === draft.id)!.paymentStatus = 'paid'; });
    const snapshot = invoiceDetail('USR001', draft.id);
    const customer = structuredClone(db.customers[0]);
    updateCustomer('USR002', customer.id, { fullName: 'Khách Demo Mới', phone: '090 222 3333', email: 'new@example.com', address: 'Địa chỉ demo' }, { ...prescription, sphereRight: -2 });
    expect(db.customers[0]).toMatchObject({ customerCode: customer.customerCode, phone: '0902223333', fullName: 'Khách Demo Mới' });
    expect(db.customers[0].prescriptions.slice(0, -1)).toEqual(customer.prescriptions);
    expect(db.customers[0].prescriptions.at(-1)?.sphereRight).toBe(-2);
    expect(invoiceDetail('USR001', draft.id)).toEqual(snapshot);
    expect(customerService.searchCustomers({ query: '0902223333' }).customers[0].id).toBe(customer.id);
    expect(JSON.parse(store.get('webbankinh_db')!).customers[0].fullName).toBe('Khách Demo Mới');
  });
  it.each([{ fullName: '' }, { phone: 'x' }, { phone: '0900000002' }, { email: 'bad' }, { email: 'binh.tran@example.com' }])('rejects invalid or duplicate contact: %j', bad => {
    const before = structuredClone(db.customers);
    expect(() => updateCustomer('USR002', 'CUS001', { ...db.customers[0], ...bad })).toThrow();
    expect(db.customers).toEqual(before);
  });
  it('requires an active employee and existing customer; storage failure leaves original intact', () => {
    const before = structuredClone(db.customers);
    expect(() => updateCustomer('missing', 'CUS001', db.customers[0])).toThrow();
    expect(() => updateCustomer('USR001', 'missing', db.customers[0])).toThrow();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => updateCustomer('USR001', 'CUS001', { ...db.customers[0], fullName: 'Changed' })).toThrow();
    expect(db.customers).toEqual(before);
  });
});

describe('NV003 account actions reuse lock/revocation service', () => {
  it('locks login and live session, unlocks without restoring revoked session, preserves employees and invoices', async () => {
    await loginDemo('hoan@example.com', 'Demo@123');
    createDraft('USR001'); const history = structuredClone({ employees: db.employees, invoices: db.invoices });
    setUserLocked('USR001', 'USR002', true);
    expect(getDemoSession()).toBeNull();
    await expect(loginDemo('hoan@example.com', 'Demo@123')).rejects.toThrow();
    setUserLocked('USR001', 'USR002', false);
    expect(getDemoSession()).toBeNull();
    await expect(loginDemo('hoan@example.com', 'Demo@123')).resolves.toMatchObject({ id: 'USR002' });
    expect({ employees: db.employees, invoices: db.invoices }).toEqual(history);
  });
  it('direct calls cannot lock last admin and employee cannot mutate accounts', () => {
    expect(() => setUserLocked('USR001', 'USR001', true)).toThrow(/cuối cùng/);
    expect(() => setUserLocked('USR002', 'USR001', true)).toThrow();
    expect(() => setUserLocked('USR001', 'missing', true)).toThrow();
    expect(db.users[0].isActive).toBe(true);
  });
});

describe('NV004 employee query', () => {
  beforeEach(() => db.transaction(data => { data.employees[0].shift = 'Ca sáng'; data.employees[1].shift = 'Ca chiều'; }));
  it('normalizes case/spacing/diacritics; combines name, phone and shift with AND', () => {
    expect(queryEmployees('USR001', { query: '  NGUYEN   van HOAN ' }).map(e => e.id)).toEqual(['EMP002']);
    expect(queryEmployees('USR001', { query: 'hoan 0987', shift: ' CHIEU ' }).map(e => e.id)).toEqual(['EMP002']);
    expect(queryEmployees('USR001', { query: 'hoan', shift: 'sáng' })).toEqual([]);
    expect(queryEmployees('USR001', { query: '090 987 6543' }).map(e => e.id)).toEqual(['EMP002']);
    expect(queryEmployees('USR001', { query: 'ca chieu' }).map(e => e.id)).toEqual(['EMP002']);
  });
  it('numeric queries only search phone, not names or shift; clearing restores all', () => {
    db.transaction(data => { data.employees[0].shift = 'Ca 999'; data.employees[0].fullName = 'Demo 999'; });
    expect(queryEmployees('USR001', { query: '999' })).toEqual([]);
    expect(queryEmployees('USR001', { query: ' ' })).toHaveLength(2);
    expect(queryEmployees('USR001', { query: 'không tìm thấy' })).toHaveLength(0);
    expect(() => queryEmployees('USR002')).toThrow();
  });
  it('reflects latest edits, account role and lock state without cached copies', () => {
    db.transaction(data => { data.employees[1].phone = '0911111111'; data.users[1].isActive = false; });
    const result = queryEmployees('USR001', { query: '0911' });
    expect(result[0]).toMatchObject({ id: 'EMP002', accountRole: 'employee', accountActive: false });
    expect(queryEmployees('USR001', { query: '090987' })).toEqual([]);
  });
});

describe('HD001 filtered invoice list', () => {
  beforeEach(() => {
    const base = createDraft('USR001');
    db.transaction(data => {
      data.invoices = Array.from({ length: 27 }, (_, n) => ({ ...base, id: `INV-${String(n).padStart(2, '0')}`, invoiceCode: `HD${n}`,
        customerName: n < 25 ? 'Nhóm A' : 'Nhóm B', totalAmount: 100000, createdAt: '2026-10-21T18:30:00.000Z',
        paymentStatus: n % 2 === 0 ? 'paid' : 'pending' }));
    });
  });
  it('sums paid revenue across all filtered pages, excludes pending and resets with cleared filters', () => {
    const all = invoiceList('USR001', { searchQuery: 'Nhóm A' });
    expect(all.invoices).toHaveLength(25); expect(all.paidCount).toBe(13); expect(all.paidRevenue).toBe(1300000);
    const pending = invoiceList('USR002', { paymentStatus: 'pending' });
    expect(pending.invoices).toHaveLength(13); expect(pending.paidRevenue).toBe(0);
    expect(invoiceList('USR001').invoices).toHaveLength(27);
    expect(invoiceList('USR001', { searchQuery: 'missing' }).paidRevenue).toBe(0);
  });
  it('sorts ties consistently, formats Vietnam time independent of machine timezone and enforces actor', () => {
    const first = invoiceList('USR001').invoices.map(i => i.id);
    db.transaction(data => { data.invoices.reverse(); });
    expect(invoiceList('USR001').invoices.map(i => i.id)).toEqual(first);
    expect(new Set(first).size).toBe(27);
    expect(vietnamInvoiceDate('2026-10-21T18:30:00.000Z')).toContain('22/10/2026');
    expect(vietnamInvoiceDate('2026-10-21T18:30:00.000Z')).toContain('01:30');
    expect(() => invoiceList('missing')).toThrow();
  });
});

describe('SP002 additional product fields (price ledger awaiting shared model)', () => {
  it('preserves omitted attributes/image on price-only edits; saves and filters explicit changes', () => {
    const product = db.products[0];
    const initial = { ...product, color: 'Nâu', material: 'Titan', shape: 'Tròn', imageUrl: 'data:image/png;base64,AAAA', currentActorRole: 'admin' as const };
    expect(productService.updateProduct(product.id, initial).success).toBe(true);
    const { color, material, shape, imageUrl, ...priceOnly } = initial;
    expect(productService.updateProduct(product.id, { ...priceOnly, price: product.price + 1 }).success).toBe(true);
    expect(db.products[0]).toMatchObject({ color, material, shape, imageUrl, imageOverride: true });
    expect(productService.searchProducts({ material: 'tit', color: 'nâu', shape: 'tròn' }).map(p => p.id)).toContain(product.id);
    expect(JSON.parse(store.get('webbankinh_db')!).products[0].material).toBe('Titan');
  });
});
