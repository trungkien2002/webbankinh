import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {db} from './database';
import {listCategories,assignBarcode,revenueReport,revenueRows} from './kien-service';
import {createDraft,saveDraftItems,saveMeasurement,addDraftCombo,removeDraftCombo,completeDraft,setDraftCustomer} from './bao-service';
import {itemQuantities} from './combo';
import {productService} from './productService';
import {payInvoice} from './hoan-service';
import {workbookBytes} from './spreadsheet-export';
import {EyePrescription} from '../contracts/domain';

const rx:EyePrescription={sphereRight:-1,sphereLeft:-2,cylinderRight:0,cylinderLeft:0,axisRight:0,axisLeft:0,pupillaryDistance:62,measuredAt:'2026-10-22'};
beforeEach(()=>{const store=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)});db.reset();
  db.products.push({...db.products[0],id:'PRD003',sku:'LENS-PAIR',name:'Tròng theo đôi',productType:'Tròng kính',price:350000,stock:20,barcode:undefined});
});
afterEach(()=>vi.unstubAllGlobals());
const setup=()=>{const draft=createDraft('USR001');saveMeasurement('USR001',draft.id,'CUS001',rx);return draft;};
describe('Kiên completion',()=>{
  it('sorts and searches active categories without changing shared order, rejects locked actors',async()=>{
    const before=db.categories.map(c=>c.id);
    const asc=await listCategories('USR002','','name-asc'),desc=await listCategories('USR002','','name-desc');
    expect(desc.map(c=>c.name)).toEqual(asc.map(c=>c.name).reverse());
    expect((await listCategories('USR001','gong','name-asc')).map(c=>c.name)).toContain('Gọng kính');
    expect(db.categories.map(c=>c.id)).toEqual(before);
    db.users[0].isActive=false;await expect(listCategories('USR001','','newest')).rejects.toThrow(/quyền/);
  });
  it('assigns unique barcodes, persists and rejects employee/duplicate/malformed codes',()=>{
    assignBarcode('USR001','PRD001','ELAN-001');expect(db.products[0].barcode).toBe('ELAN-001');
    expect(()=>assignBarcode('USR001','PRD002','elan-001')).toThrow(/khác/);
    expect(()=>assignBarcode('USR002','PRD001','EMP-1')).toThrow(/quyền/);
    expect(()=>assignBarcode('USR001','PRD001','<script>')).toThrow(/1–48/);
    const result=productService.createProduct({sku:'NEW',name:'New',categoryId:'CAT001',productType:'Gọng kính',price:1,stock:1,barcode:'ELAN-001',currentActorRole:'admin'});
    expect(result.success).toBe(false);
  });
  it('stores combo snapshots and charges assembly once, pays stock once for a pair',()=>{
    const draft=setup();const frame=db.products.find(p=>p.id==='PRD001')!,lens=db.products.find(p=>p.id==='PRD003')!;
    expect(lens.productType).toBe('Tròng kính');const stocks=[frame.stock,lens.stock];
    addDraftCombo('USR001',draft.id,frame.id,lens.id,2);
    let current=db.invoices.find(i=>i.id===draft.id)!;
    expect(current.assemblyFee).toBe(100000);expect(current.subtotal).toBe(2*(frame.price+lens.price));
    expect(current.totalAmount).toBe((current.subtotal+100000)*1.1);
    const originalPrice=current.items[0].unitPrice;db.products[0].price+=123;
    saveDraftItems('USR001',draft.id,itemQuantities(current.items));current=db.invoices.find(i=>i.id===draft.id)!;
    expect(current.items[0].unitPrice).toBe(originalPrice);
    const paid=payInvoice('USR001',draft.id,{method:'cash',cashReceived:current.totalAmount,idempotencyKey:'combo-paid'});
    expect(paid.paymentStatus).toBe('paid');expect([db.products[0].stock,db.products.find(p=>p.id===lens.id)!.stock]).toEqual(stocks.map(n=>n-2));
    payInvoice('USR001',draft.id,{method:'cash',cashReceived:current.totalAmount,idempotencyKey:'combo-paid'});
    expect(db.products[0].stock).toBe(stocks[0]-2);
    expect(()=>removeDraftCombo('USR001',draft.id,paid.combos![0].id)).toThrow(/không thể sửa/);
  });
  it('rejects missing measurements, invalid product types and overselling atomically',()=>{
    const plain=createDraft('USR001');expect(()=>addDraftCombo('USR001',plain.id,'PRD001','PRD003',1)).toThrow(/thông số/);
    const draft=setup();expect(()=>addDraftCombo('USR001',draft.id,'PRD003','PRD001',1)).toThrow(/Chọn đúng/);
    expect(()=>addDraftCombo('USR001',draft.id,'PRD001','PRD003',99999)).toThrow(/tồn kho/);
    expect(db.invoices.find(i=>i.id===draft.id)!.items).toHaveLength(0);
  });
  it('removes selected shared-product combo and its fee, deletes an empty draft',()=>{
    const draft=setup();addDraftCombo('USR001',draft.id,'PRD001','PRD003',1);addDraftCombo('USR001',draft.id,'PRD001','PRD003',1);
    let current=db.invoices.find(i=>i.id===draft.id)!;const ids=current.combos!.map(c=>c.id);
    removeDraftCombo('USR001',draft.id,ids[0]);current=db.invoices.find(i=>i.id===draft.id)!;
    expect(current.combos!.map(c=>c.id)).toEqual([ids[1]]);expect(current.assemblyFee).toBe(50000);
    expect(itemQuantities(current.items)).toEqual({PRD001:1,PRD003:1});
    expect(()=>setDraftCustomer('USR001',draft.id,'CUS002')).toThrow(/Xóa combo/);
    removeDraftCombo('USR001',draft.id,ids[1]);expect(db.invoices.find(i=>i.id===draft.id)).toBeUndefined();expect(db.products[0].stock).toBe(12);
  });
  it('unlinks incomplete combos after reducing a component without leaving assembly fees',()=>{
    const draft=setup();addDraftCombo('USR001',draft.id,'PRD001','PRD003',1);
    saveDraftItems('USR001',draft.id,{PRD001:1});const current=db.invoices.find(i=>i.id===draft.id)!;
    expect(current.combos).toHaveLength(0);expect(current.assemblyFee).toBe(0);expect(current.totalAmount).toBe(Math.round(db.products[0].price*1.1));
  });
  it('discounts products only and requires cash to cover the separate assembly fee',()=>{
    const draft=setup();addDraftCombo('USR001',draft.id,'PRD001','PRD003',1);
    db.vouchers.push({id:'V-TEST',code:'TEST10',name:'Giảm thử',discountType:'percentage',discountValue:10,minOrderValue:0,
      startDate:'2000-01-01',endDate:'2099-12-31',isActive:true,usageCount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    let current=db.invoices.find(i=>i.id===draft.id)!;
    saveDraftItems('USR001',draft.id,itemQuantities(current.items),'TEST10');current=db.invoices.find(i=>i.id===draft.id)!;
    expect(current.discountAmount).toBe(current.subtotal*.1);expect(current.totalAmount).toBe((current.subtotal*.9+50000)*1.1);
    expect(()=>payInvoice('USR001',draft.id,{method:'cash',cashReceived:current.totalAmount-1,idempotencyKey:'short'})).toThrow(/tiền mặt/);
    expect(db.products[0].stock).toBe(12);
    payInvoice('USR001',draft.id,{method:'cash',cashReceived:current.totalAmount,idempotencyKey:'full'});
    const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
    const report=revenueReport('USR001',day,day);expect(report.groups.Combo).toBe(current.totalAmount-(current.taxAmount||0));
  });
  it('rolls back combo writes when local storage cannot persist',()=>{
    const draft=setup();const before=JSON.stringify(db.invoices);
    vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('Storage full');}});
    expect(()=>addDraftCombo('USR001',draft.id,'PRD001','PRD003',1)).toThrow('Storage full');
    expect(JSON.stringify(db.invoices)).toBe(before);expect(db.products[0].stock).toBe(12);
  });
  it('aggregates paid revenue by VN creation date with exact group totals and historical snapshots',()=>{
    const draft=setup();addDraftCombo('USR001',draft.id,'PRD001','PRD003',1);
    let current=db.invoices.find(i=>i.id===draft.id)!;saveDraftItems('USR001',draft.id,{...itemQuantities(current.items),PRD002:1});
    completeDraft('USR001',draft.id,true,'transfer');
    db.invoices.find(i=>i.id===draft.id)!.createdAt='2026-10-21T17:00:00.000Z';
    const pending=createDraft('USR001');saveDraftItems('USR001',pending.id,{PRD001:1});
    db.products[1].productType='Phụ kiện';
    const report=revenueReport('USR001','2026-10-22','2026-10-22');
    expect(report.invoices).toHaveLength(1);expect(report.timeline[0].label).toBe('2026-10-22');
    expect(Object.values(report.groups).reduce((s,n)=>s+n,0)).toBe(report.total);
    expect(report.groups['Tròng kính']).toBeGreaterThan(0);expect(report.groups['Phụ kiện']).toBe(0);
    expect(revenueReport('USR001','2026-10-21','2026-10-21').total).toBe(0);
    expect(()=>revenueReport('USR002','2026-10-22','2026-10-22')).toThrow(/quyền/);
    expect(()=>revenueReport('USR001','2026-10-23','2026-10-22')).toThrow(/Từ ngày/);
    expect(()=>revenueReport('USR001','2026-02-30','2026-10-22')).toThrow(/Ngày/);
    expect(revenueRows(report).some(r=>r[0]==='Tổng thu'&&r[1]===report.total)).toBe(true);
  });
  it('exports a real ZIP OOXML workbook with escaped text and no formula cells',()=>{
    const bytes=workbookBytes([['Tên','Doanh thu'],['=CMD()',123],['Kính & <tròng>',456]]);
    expect([...bytes.slice(0,4)]).toEqual([80,75,3,4]);
    const xml=new TextDecoder().decode(bytes);expect(xml).toContain('Kính &amp; &lt;tròng&gt;');expect(xml).toContain('=CMD()');expect(xml).not.toContain('<f>');
    writeFileSync(join(tmpdir(),'elan-revenue-export-test.xlsx'),bytes);
  });
});
