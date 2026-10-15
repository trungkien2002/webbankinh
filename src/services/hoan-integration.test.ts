import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from './database';
import { createDraft, saveDraftItems } from './bao-service';
import { commitCategoryImport, commitProductImport, foldText, payInvoice, removeInvoiceItem } from './hoan-service';
beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});db.reset();});
afterEach(()=>vi.unstubAllGlobals());

it('binds payment keys to the invoice and method and charges only once',()=>{
  const first=createDraft('USR001'),second=createDraft('USR001');
  saveDraftItems('USR001',first.id,{PRD001:1});saveDraftItems('USR001',second.id,{PRD001:1});
  payInvoice('USR001',first.id,{method:'transfer',idempotencyKey:'one'});
  expect(()=>payInvoice('USR001',second.id,{method:'transfer',idempotencyKey:'one'})).toThrow(/khác/);
  expect(()=>payInvoice('USR001',first.id,{method:'qr',idempotencyKey:'one'})).toThrow(/khác/);
  expect(db.products[0].stock).toBe(11);expect(db.payments).toHaveLength(1);
  expect(db.invoices.find(v=>v.id===second.id)?.paymentStatus).toBe('draft');
});
it('rolls back stock, payment and invoice together if storage fails',()=>{
  const draft=createDraft('USR001');saveDraftItems('USR001',draft.id,{PRD001:1});
  const before=JSON.stringify({products:db.products,invoices:db.invoices,payments:db.payments});
  vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new Error('Storage full');});
  expect(()=>payInvoice('USR001',draft.id,{method:'transfer',idempotencyKey:'fail'})).toThrow();
  expect(JSON.stringify({products:db.products,invoices:db.invoices,payments:db.payments})).toBe(before);
});
it('keeps the approved empty-order deletion rule when removing the last line',()=>{
  const draft=createDraft('USR001');saveDraftItems('USR001',draft.id,{PRD001:1});
  const item=db.invoices[0].items[0];
  expect(removeInvoiceItem('USR001',draft.id,item.id)).toBeUndefined();
  expect(db.invoices).toHaveLength(0);expect(db.products[0].stock).toBe(12);
});
it('validates again at import commit and does not partially import bad rows',()=>{
  expect(()=>commitProductImport('USR001',[{sku:'GK001',quantity:2},{sku:'missing',quantity:1}],'bad')).toThrow();
  expect(db.products[0].stock).toBe(12);expect(db.stockMovements).toHaveLength(0);expect(db.importKeys).toHaveLength(0);
  const count=db.categories.length;
  expect(()=>commitCategoryImport('USR001',[{name:'Gọng kính',description:''}],'duplicate')).toThrow();
  expect(db.categories).toHaveLength(count);
  expect(foldText('Đơn hàng')).toBe('don hang');
});
it('adds new ledgers to existing browser data without replacing products or invoices',async()=>{
  const legacy={users:db.users,employees:db.employees,categories:db.categories,products:db.products,vouchers:db.vouchers,customers:db.customers,invoices:db.invoices};
  localStorage.setItem('webbankinh_db',JSON.stringify(legacy));
  vi.resetModules();const {db:fresh}=await import('./database');
  expect(fresh.products).toEqual(legacy.products);expect(fresh.invoices).toEqual(legacy.invoices);
  expect(fresh.payments).toEqual([]);expect(fresh.stockMovements).toEqual([]);expect(fresh.importKeys).toEqual([]);
});
