import { deleteUnpaidInvoice } from './bao-service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { categoryDetail, completeDraft, createDraft, createVoucher, customerList, editCategory, editEmployee, invoiceDetail, saveDraftItems, saveMeasurement, setDraftCustomer } from './bao-service';
import { adminResetPassword, confirmPasswordReset, requestPasswordReset } from './password-reset';
import { getDemoSession, loginDemo } from './demoSession';
import { EyePrescription } from '../contracts/domain';
const prescription: EyePrescription = { sphereRight: -1.5, cylinderRight: -0.5, axisRight: 90, sphereLeft: -1, cylinderLeft: 0, axisLeft: 0, pupillaryDistance: 62, measuredAt: '2026-10-13', notes: 'Fixture demo' };
const voucher = { code: ' new10 ', name: 'Ưu đãi thử', discountType: 'percentage' as const, discountValue: 10, minOrderValue: 0, startDate: '2026-01-01', endDate: '2099-12-31', isActive: true };
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  vi.stubGlobal('localStorage', storage); vi.stubGlobal('sessionStorage', storage); db.reset();
});
afterEach(() => vi.unstubAllGlobals());

describe('LSP003/LSP007 — shared categories', () => {
  it('saves metadata, preserves product relation, rejects duplicate/blank/role/missing ID', () => {
    editCategory('USR001', 'CAT001', { name: 'Gọng mới', description: 'Quy cách', material: 'Titan' });
    expect(categoryDetail('USR002', 'CAT001').category.material).toBe('Titan');
    expect(categoryDetail('USR002', 'CAT001').products[0].categoryId).toBe('CAT001');
    for (const name of ['', ' TRÒNG KÍNH ']) expect(() => editCategory('USR001', 'CAT001', { name, description: '' })).toThrow();
    expect(() => editCategory('USR002', 'CAT001', { name: 'X', description: '' })).toThrow();
    expect(() => categoryDetail('USR001', 'missing')).toThrow();
    expect(categoryDetail('USR001', 'CAT004').products).toEqual([]);
    expect(JSON.parse(store.get('webbankinh_db')!).categories[0].name).toBe('Gọng mới');
  });
});
describe('BH001/BH005/HD003/KH003 — draft to payment', () => {
  it('removes an emptied editable order and preserves other invoices and stock', () => {
    const draft = createDraft('USR001');
    const other = createDraft('USR001');
    const stock = db.products[0].stock;
    saveDraftItems('USR001', draft.id, { PRD001: 1 });
    saveDraftItems('USR001', draft.id, {});
    expect(db.invoices.some(i => i.id === draft.id)).toBe(false);
    expect(db.invoices.some(i => i.id === other.id)).toBe(true);
    expect(db.products[0].stock).toBe(stock);
    expect(JSON.parse(store.get('webbankinh_db')!).invoices.some((i: {id:string}) => i.id === draft.id)).toBe(false);
    saveDraftItems('USR001', other.id, { PRD001: 1 });
    completeDraft('USR001', other.id, true, 'cash');
    expect(() => saveDraftItems('USR001', other.id, {})).toThrow();
    expect(db.invoices.find(i => i.id === other.id)?.paymentStatus).toBe('paid');
  });
  it('creates distinct draft codes, zero totals, no revenue/stock mutation', () => {
    const first = createDraft('USR001'); const second = createDraft('USR001');
    expect(first.invoiceCode).not.toBe(second.invoiceCode); expect(first.id).not.toBe(second.id);
    expect(first.items).toEqual([]); expect(first.paymentStatus).toBe('draft');
    expect(db.products[0].stock).toBe(12); expect(customerList('USR001')[0].purchaseCount).toBe(0);
    expect(() => createDraft('missing')).toThrow();
    expect(() => completeDraft('USR001', first.id, true, 'cash')).toThrow();
  });
  it('persists cart, copies snapshots and charges once with a voucher', () => {
    const draft = createDraft('USR001'); createVoucher('USR001', voucher);
    saveDraftItems('USR001', draft.id, { PRD001: 2 }, 'new10');
    saveMeasurement('USR001', draft.id, 'CUS001', prescription);
    const saved = invoiceDetail('USR002', draft.id);
    expect(saved.totalAmount).toBe(1683000);
    expect(JSON.parse(store.get('webbankinh_db')!).invoices[0].items).toHaveLength(1);
    prescription.sphereRight = -1.5;
    completeDraft('USR001', draft.id, true, 'transfer');
    expect(db.products[0].stock).toBe(10); expect(db.vouchers.at(-1)!.usageCount).toBe(1);
    expect(() => completeDraft('USR001', draft.id, true, 'cash')).toThrow();
    db.transaction(data => { data.products[0].price = 1; data.customers[0].prescriptions.push({ ...prescription, sphereRight: -5 }); });
    expect(invoiceDetail('USR001', draft.id).items[0].unitPrice).toBe(850000);
    expect(invoiceDetail('USR001', draft.id).prescription?.sphereRight).toBe(-1.5);
    expect(customerList('USR002')[0].purchaseCount).toBe(1);
    expect(() => saveMeasurement('USR001', draft.id, 'CUS001', prescription)).toThrow();
  });
  it('pending does not count as a purchase; bad quantity/ID/measurements preserve data', () => {
    const draft = createDraft('USR001');
    for (const quantity of [-1, 0, 0.5, NaN, 13]) expect(() => saveDraftItems('USR001', draft.id, { PRD001: quantity })).toThrow();
    expect(() => saveDraftItems('USR001', draft.id, { missing: 1 })).toThrow();
    for (const bad of [{ axisRight: 181 }, { pupillaryDistance: 0 }, { sphereLeft: NaN }, { cylinderLeft: 11 }, { measuredAt: '2026-02-30' }])
      expect(() => saveMeasurement('USR001', draft.id, 'CUS001', { ...prescription, ...bad })).toThrow();
    expect(db.customers[0].prescriptions).toHaveLength(1);
    saveDraftItems('USR001', draft.id, { PRD001: 1 }); setDraftCustomer('USR001', draft.id, 'CUS001');
    completeDraft('USR001', draft.id, false, 'cash');
    expect(customerList('USR001')[0].purchaseCount).toBe(0); expect(db.products[0].stock).toBe(12);
  });
  it('requires measurement for lens and preserves state when stock or storage fails', () => {
    const draft = createDraft('USR001'); saveDraftItems('USR001', draft.id, { PRD002: 1 });
    expect(() => completeDraft('USR001', draft.id, true, 'cash')).toThrow(/thông số/);
    saveMeasurement('USR001', draft.id, 'CUS001', prescription);
    db.transaction(data => { data.products[1].stock = 0; });
    expect(() => completeDraft('USR001', draft.id, true, 'cash')).toThrow(/tồn kho/);
    expect(db.invoices[0].paymentStatus).toBe('draft');
    db.transaction(data => { data.products[1].stock = 3; });
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Quota exceeded'); } });
    expect(() => completeDraft('USR001', draft.id, true, 'cash')).toThrow('Quota exceeded');
    expect(db.products[1].stock).toBe(3); expect(db.invoices[0].paymentStatus).toBe('draft');
  });
  it('customer switch clears old prescription and missing customer is rejected', () => {
    const draft = createDraft('USR001'); saveMeasurement('USR001', draft.id, 'CUS001', prescription);
    setDraftCustomer('USR001', draft.id, 'CUS002'); expect(db.invoices[0].prescription).toBeUndefined();
    expect(() => setDraftCustomer('USR001', draft.id, 'missing')).toThrow();
    expect(() => invoiceDetail('USR001', 'missing')).toThrow();
  });
  it('revalidates a paused voucher before paying a pending invoice', () => {
    createVoucher('USR001', voucher);
    const draft = createDraft('USR001'); saveDraftItems('USR001', draft.id, { PRD001: 1 }, 'NEW10');
    completeDraft('USR001', draft.id, false, 'cash');
    db.transaction(data => { data.vouchers.at(-1)!.isActive = false; });
    expect(() => completeDraft('USR001', draft.id, true, 'cash')).toThrow();
    expect(db.invoices[0].paymentStatus).toBe('pending'); expect(db.products[0].stock).toBe(12);
  });
});
describe('VC001/NV002 — admin changes', () => {
  it('validates voucher uniqueness, percentages, money and real dates', () => {
    expect(createVoucher('USR001', voucher).code).toBe('NEW10');
    expect(() => createVoucher('USR001', voucher)).toThrow(/tồn tại/);
    expect(() => createVoucher('USR002', { ...voucher, code: 'OTHER' })).toThrow();
    for (const bad of [{ discountValue: 101 }, { discountValue: NaN }, { minOrderValue: -1 }, { startDate: '2026-02-30' }, { startDate: '2100-01-01' }])
      expect(() => createVoucher('USR001', { ...voucher, code: 'OTHER', ...bad })).toThrow();
  });
  it('updates linked user/email/role, preserves invoice employee snapshot', () => {
    expect(() => editEmployee('USR002', 'EMP001', { ...db.employees[0] })).toThrow();
    const draft = createDraft('USR002');
    editEmployee('USR001', 'EMP002', { fullName: 'Nhân viên mới', phone: '0900000002', email: 'new@example.com', position: 'Kỹ thuật', role: 'admin', shift: 'Sáng', branch: 'Demo' });
    expect(db.users[1].email).toBe('new@example.com'); expect(db.users[1].role).toBe('admin');
    expect(invoiceDetail('USR001', draft.id).employeeName).not.toBe('Nhân viên mới');
    expect(db.employees[1].shift).toBe('Sáng');
    expect(() => editEmployee('USR001', 'EMP002', { ...db.employees[1], email: 'admin@example.com' })).toThrow();
    expect(() => editEmployee('USR001', 'EMP001', { ...db.employees[0], role: 'employee' })).toThrow();
  });
});
describe('DN003 — local OTP and session invalidation', () => {
  it('migrates only the admin fixture and preserves a later password reset', async () => {
    await expect(loginDemo('admin@example.com', 'Demo@123')).rejects.toThrow();
    await expect(loginDemo('b', 'b')).resolves.toMatchObject({ id: 'USR001' });
    await expect(loginDemo('hoan@example.com', 'Demo@123')).resolves.toMatchObject({ id: 'USR002' });
    const reset = requestPasswordReset('admin@example.com');
    await confirmPasswordReset(reset.challengeId, reset.demoCode, 'NewPass123');
    await expect(loginDemo('b', 'b')).rejects.toThrow();
    await expect(loginDemo('admin@example.com', 'NewPass123')).resolves.toMatchObject({ id: 'USR001' });
  });
  it('returns same request shape for known/unknown email, rate-limits and expires codes', async () => {
    const known = requestPasswordReset('admin@example.com', 1000);
    const unknown = requestPasswordReset('nobody@example.com', 1000);
    expect(known.message).toBe(unknown.message); expect(unknown.demoCode).toHaveLength(6);
    expect(() => requestPasswordReset('admin@example.com', 2000)).toThrow(/60/);
    await expect(confirmPasswordReset(known.challengeId, known.demoCode, 'NewPass123', 301001)).rejects.toThrow(/hết hạn/);
  });
  it('invalidates old sessions/password, consumes one time and supports reload of challenge', async () => {
    await loginDemo('b', 'b'); expect(getDemoSession()?.id).toBe('USR001');
    const reset = requestPasswordReset('admin@example.com');
    await confirmPasswordReset(reset.challengeId, reset.demoCode, 'NewPass123');
    expect(getDemoSession()).toBeNull();
    await expect(loginDemo('b', 'b')).rejects.toThrow();
    await expect(loginDemo('admin@example.com', 'NewPass123')).resolves.toMatchObject({ id: 'USR001' });
    await expect(confirmPasswordReset(reset.challengeId, reset.demoCode, 'OtherPass123')).rejects.toThrow();
  });
  it('locks after five wrong attempts and admin reset rejects employee actor', async () => {
    const reset = requestPasswordReset('admin@example.com');
    const wrong = reset.demoCode === '000000' ? '111111' : '000000';
    for (let n = 0; n < 5; n++) await expect(confirmPasswordReset(reset.challengeId, wrong, 'NewPass123')).rejects.toThrow();
    await expect(confirmPasswordReset(reset.challengeId, reset.demoCode, 'NewPass123')).rejects.toThrow(/số lần/);
    await expect(adminResetPassword('USR002', 'EMP001', 'NewPass123')).rejects.toThrow();
    await adminResetPassword('USR001', 'EMP002', 'NewPass123');
    await expect(loginDemo('hoan@example.com', 'NewPass123')).resolves.toMatchObject({ id: 'USR002' });
  });
});

it('deletes draft and pending invoices but rejects a paid invoice and invalid actor', () => {
  const draft=createDraft('USR001');
  expect(()=>deleteUnpaidInvoice('missing',draft.id)).toThrow();
  deleteUnpaidInvoice('USR001',draft.id);
  expect(db.invoices.find(i=>i.id===draft.id)).toBeUndefined();
  const pending=createDraft('USR001');saveDraftItems('USR001',pending.id,{PRD001:1});completeDraft('USR001',pending.id,false,'cash');
  const stock=db.products[0].stock;deleteUnpaidInvoice('USR001',pending.id);
  expect(db.products[0].stock).toBe(stock);
  expect(db.invoices.find(i=>i.id===pending.id)).toBeUndefined();
  const paid=createDraft('USR001');saveDraftItems('USR001',paid.id,{PRD001:1});completeDraft('USR001',paid.id,true,'cash');
  expect(()=>deleteUnpaidInvoice('USR001',paid.id)).toThrow(/đã thanh toán/);
  expect(db.invoices.find(i=>i.id===paid.id)?.paymentStatus).toBe('paid');
});