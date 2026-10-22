import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { productService } from './productService';
import { createDraft, saveDraftItems } from './bao-service';

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  db.reset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const edit = (price: number) => productService.updateProduct(db.products[0].id, { ...db.products[0], price, actorId: 'USR001', currentActorRole: 'admin' });

describe('SP002 real local price-change ledger', () => {
  it('records product, old/new price, timestamp and actual active admin in the same persisted transaction', () => {
    const old = structuredClone(db.products[0]);
    expect(edit(old.price + 100).success).toBe(true);
    expect(db.productPriceChanges).toHaveLength(1);
    expect(db.productPriceChanges[0]).toMatchObject({ productId: old.id, oldPrice: old.price, newPrice: old.price + 100, changedBy: 'USR001' });
    expect(Number.isFinite(Date.parse(db.productPriceChanges[0].changedAt))).toBe(true);
    const persisted = JSON.parse(storage.get('webbankinh_db')!);
    expect(persisted.productPriceChanges).toEqual(db.productPriceChanges);
    expect(persisted.products[0].price).toBe(old.price + 100);
    expect(edit(old.price + 250).success).toBe(true);
    expect(db.productPriceChanges[1].oldPrice).toBe(old.price + 100);
    expect(new Set(db.productPriceChanges.map(log => log.id)).size).toBe(2);
  });
  it('does not backfill seed history or log unchanged prices, attribute/image edits or repeated saves', () => {
    expect(db.productPriceChanges).toEqual([]);
    const product = db.products[0];
    const input = { ...product, actorId: 'USR001', currentActorRole: 'admin' as const, imageUrl: 'data:image/png;base64,AAAA', color: 'Nâu', material: 'Titan', shape: 'Tròn' };
    expect(productService.updateProduct(product.id, input).success).toBe(true);
    expect(productService.updateProduct(product.id, input).success).toBe(true);
    expect(db.productPriceChanges).toEqual([]);
    expect(edit(product.price + 1).success).toBe(true);
    expect(edit(product.price + 1).success).toBe(true);
    expect(db.productPriceChanges).toHaveLength(1);
  });
  it.each([-1, NaN, Infinity])('rejects invalid price %s without data or ledger changes', price => {
    const before = structuredClone(db.products);
    expect(edit(price).success).toBe(false);
    expect(db.products).toEqual(before); expect(db.productPriceChanges).toEqual([]);
  });
  it('requires a real active admin even if caller supplies the admin role string', () => {
    const product = db.products[0];
    for (const actorId of [undefined, 'missing', 'USR002']) {
      expect(productService.updateProduct(product.id, { ...product, price: product.price + 1, actorId, currentActorRole: 'admin' }).success).toBe(false);
    }
    db.transaction(data => { data.users[0].isActive = false; });
    expect(edit(product.price + 1).success).toBe(false);
    expect(db.productPriceChanges).toEqual([]);
  });
  it('rolls back product and history together on storage failure', () => {
    const before = structuredClone({ products: db.products, logs: db.productPriceChanges });
    const persisted = storage.get('webbankinh_db');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(edit(db.products[0].price + 50).success).toBe(false);
    expect({ products: db.products, logs: db.productPriceChanges }).toEqual(before);
    expect(storage.get('webbankinh_db')).toBe(persisted);
  });
  it('preserves paid invoice item snapshots and other product histories', () => {
    const draft = createDraft('USR001'); saveDraftItems('USR001', draft.id, { PRD001: 1 });
    db.transaction(data => { data.invoices[0].paymentStatus = 'paid'; });
    const invoice = structuredClone(db.invoices[0]);
    expect(edit(db.products[0].price + 100).success).toBe(true);
    const other = db.products[1];
    expect(productService.updateProduct(other.id, { ...other, price: other.price + 20, actorId: 'USR001', currentActorRole: 'admin' }).success).toBe(true);
    expect(db.invoices[0]).toEqual(invoice);
    expect(db.productPriceChanges.filter(log => log.productId === 'PRD001')).toHaveLength(1);
    expect(db.productPriceChanges.filter(log => log.productId === other.id)).toHaveLength(1);
  });
  it('migrates legacy data to an empty ledger without resetting customers, appointments or invoices; reload retains later edits', async () => {
    const legacy = JSON.parse(storage.get('webbankinh_db')!); delete legacy.productPriceChanges;
    legacy.appointments.push({ id: 'legacy-apt', customerId: 'CUS001', scheduledAt: '2026-12-20T02:00:00Z', status: 'scheduled', notes: '', createdAt: '', updatedAt: '', createdBy: 'USR001', updatedBy: 'USR001' });
    storage.set('webbankinh_db', JSON.stringify(legacy));
    vi.resetModules(); const { db: fresh } = await import('./database');
    expect(fresh.productPriceChanges).toEqual([]); expect(fresh.appointments).toEqual(legacy.appointments);
    expect(fresh.customers).toEqual(legacy.customers); expect(fresh.invoices).toEqual(legacy.invoices);
    const { productService: service } = await import('./productService');
    const product = fresh.products[0];
    expect(service.updateProduct(product.id, { ...product, price: product.price + 100, actorId: 'USR001', currentActorRole: 'admin' }).success).toBe(true);
    vi.resetModules(); const { db: reloaded } = await import('./database');
    expect(reloaded.productPriceChanges).toHaveLength(1); expect(reloaded.products[0].price).toBe(product.price + 100);
    expect(reloaded.appointments).toEqual(legacy.appointments);
  });
});
