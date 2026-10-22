import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { db } from './database';
import { productService } from './productService';
import { createDraft, saveDraftItems } from './bao-service';
beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});db.reset();});
afterEach(()=>vi.unstubAllGlobals());
it('edits and soft-deletes a product while preserving invoice snapshots',()=>{
  const product=db.products[0],draft=createDraft('USR001');saveDraftItems('USR001',draft.id,{[product.id]:1});
  const input={...product,actorId:'USR001',name:'Gọng kính An Nhiên',price:999000,imageUrl:'data:image/png;base64,AAAA',currentActorRole:'admin' as const};
  expect(productService.updateProduct(product.id,input).success).toBe(true);
  expect(db.products[0]).toMatchObject({name:input.name,imageOverride:true});
  expect(db.invoices[0].items[0]).toMatchObject({productName:product.name,unitPrice:product.price});
  expect(productService.deleteProduct(product.id,'employee').success).toBe(false);
  expect(productService.deleteProduct(product.id,'admin').success).toBe(true);
  expect(productService.searchProducts().some(p=>p.id===product.id)).toBe(false);
  expect(db.invoices[0].items[0].productId).toBe(product.id);
});
it('rejects duplicate SKU, invalid quantities, inactive categories and employee edits',()=>{
  const product=db.products[0],input={...product,actorId:'USR001',currentActorRole:'admin' as const};
  expect(productService.updateProduct(product.id,{...input,sku:db.products[1].sku}).success).toBe(false);
  expect(productService.updateProduct(product.id,{...input,stock:-1}).success).toBe(false);
  expect(productService.updateProduct(product.id,{...input,categoryId:'missing'}).success).toBe(false);
  expect(productService.updateProduct(product.id,{...input,currentActorRole:'employee'}).success).toBe(false);
  expect(db.products[0]).toEqual(product);
});
