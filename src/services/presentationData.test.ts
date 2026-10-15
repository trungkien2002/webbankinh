import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from './database';
import { preparePresentationData } from './presentationData';
import { createDraft, setDraftCustomer } from './bao-service';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) || null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  db.reset();
});
afterEach(() => vi.unstubAllGlobals());

it('relabels presentation data while retaining invoice ownership, values and later profile edits', () => {
  const invoice = createDraft('USR001');
  setDraftCustomer('USR001', invoice.id, 'CUS001');
  const before = db.invoices.find(v => v.id === invoice.id)!;
  const total = before.totalAmount;
  preparePresentationData();
  expect(db.customers.find(v => v.id === 'CUS001')).toMatchObject({ fullName: 'Nguyễn Minh Anh', phone: '0384756291' });
  expect(db.invoices.find(v => v.id === invoice.id)).toMatchObject({ customerId: 'CUS001', customerName: 'Nguyễn Minh Anh', customerPhone: '0384756291', totalAmount: total });
  db.transaction(data => { data.customers[0].fullName = 'Nguyễn An Nhiên'; });
  preparePresentationData();
  expect(db.customers[0].fullName).toBe('Nguyễn An Nhiên');
});
