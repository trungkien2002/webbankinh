import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DOMParser} from '@xmldom/xmldom';
import {deflateRawSync} from 'node:zlib';
import {db} from './database';
import {loginDemo,getDemoSession,logoutDemo,STAFF_SESSION_MS,revokeUserSessions} from './demoSession';
import {invoiceTotals} from './invoice-totals';
import {createDraft,saveDraftItems,completeDraft} from './bao-service';
import {previewProductImport,payInvoice,removeInvoiceItem} from './hoan-service';
import {prescriptionFromForm} from './prescription-form';
import {workbookBytes} from './spreadsheet-export';
import {excelParts,readExcel} from './excel-reader';
import {productService} from './productService';
function storage(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)};}
beforeEach(()=>{vi.stubGlobal('localStorage',storage());vi.stubGlobal('sessionStorage',storage());vi.stubGlobal('DOMParser',DOMParser);db.reset();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function zipSheet(xml:string){
 const name=Buffer.from('xl/worksheets/sheet1.xml'),data=Buffer.from(xml),packed=deflateRawSync(data);let crc=0xffffffff;
 for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50);dir.writeUInt16LE(8,10);dir.writeUInt32LE(crc,16);dir.writeUInt32LE(packed.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(dir.length+name.length,12);end.writeUInt32LE(local.length+name.length+packed.length,16);
 return new Uint8Array(Buffer.concat([local,name,packed,dir,name,end]));
}
const file=(bytes:Uint8Array,name='import.xlsx')=>new File([new Uint8Array(bytes)],name);
const xml=(cell:string,row=1)=>`<worksheet><sheetData><row r="${row}">${cell}</row></sheetData></worksheet>`;
describe('remaining local acceptance',()=>{
 it('expires staff sessions at exactly eight hours and does not extend on reads',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-25T00:00:00Z'));await loginDemo('b','b');const original=sessionStorage.getItem('elan_demo_session');
  vi.advanceTimersByTime(STAFF_SESSION_MS-1);expect(getDemoSession()?.id).toBe('USR001');expect(sessionStorage.getItem('elan_demo_session')).toBe(original);
  vi.advanceTimersByTime(1);expect(getDemoSession()).toBeNull();expect(sessionStorage.getItem('elan_demo_session')).toBeNull();
 });
 it('rejects legacy sessions, locked users, password revocation and logout',async()=>{
  sessionStorage.setItem('elan_demo_session',JSON.stringify({id:'USR001',version:null}));expect(getDemoSession()).toBeNull();
  await loginDemo('b','b');revokeUserSessions('USR001');expect(getDemoSession()).toBeNull();
  await loginDemo('b','b');db.users[0].isActive=false;expect(getDemoSession()).toBeNull();db.users[0].isActive=true;
  await loginDemo('b','b');logoutDemo();expect(getDemoSession()).toBeNull();
 });
 it('taxes discounted merchandise plus assembly, rounds VND and rejects invalid totals',()=>{
  expect(invoiceTotals(1000000,100000,50000,10)).toEqual({taxRate:10,taxAmount:95000,totalAmount:1045000});
  expect(invoiceTotals(101,0,0,10).taxAmount).toBe(10);
  for(const args of [[1,2,0,10],[1,0,-1,10],[1,0,0,NaN]])expect(()=>invoiceTotals(...args as [number,number,number,number])).toThrow();
 });
 it('recomputes tax after removal, pays once and protects the paid snapshot',()=>{
  const draft=createDraft('USR001');saveDraftItems('USR001',draft.id,{PRD001:2,PRD002:1});let current=db.invoices.find(i=>i.id===draft.id)!;
  removeInvoiceItem('USR001',draft.id,current.items.find(i=>i.productId==='PRD002')!.id);current=db.invoices.find(i=>i.id===draft.id)!;
  expect(current.taxAmount).toBe(Math.round(current.subtotal*.1));const total=current.totalAmount,stock=db.products[0].stock;
  payInvoice('USR001',draft.id,{method:'card',idempotencyKey:'tax-card',reference:'CARD-001'});payInvoice('USR001',draft.id,{method:'card',idempotencyKey:'tax-card',reference:'CARD-001'});
  expect(db.payments.filter(p=>p.invoiceId===draft.id)).toHaveLength(1);expect(db.payments.find(p=>p.invoiceId===draft.id)?.reference).toBe('CARD-001');expect(db.products[0].stock).toBe(stock-2);
  expect(()=>saveDraftItems('USR001',draft.id,{PRD001:1})).toThrow();expect(db.invoices.find(i=>i.id===draft.id)!.totalAmount).toBe(total);
 });
 it('keeps legacy no-tax invoices unchanged when completed',()=>{
  const draft=createDraft('USR001');delete draft.taxRate;delete draft.taxAmount;saveDraftItems('USR001',draft.id,{PRD001:1});completeDraft('USR001',draft.id,false,'cash');
  const current=db.invoices.find(i=>i.id===draft.id)!;expect(current.taxAmount).toBe(0);expect(current.totalAmount).toBe(current.subtotal);
 });
 it('ignores hidden measurements and validates initial measurements through shared rules',()=>{
  expect(prescriptionFromForm({required:'no',axisRight:'garbage'})).toBeUndefined();
  const form={required:'yes',sphereRight:'-1',sphereLeft:'-2',cylinderRight:'0',cylinderLeft:'0',axisRight:'90',axisLeft:'0',pupillaryDistance:'62',measuredAt:'2026-10-25'};
  expect(prescriptionFromForm(form)?.axisRight).toBe(90);
  for(const patch of [{axisRight:'90.5'},{sphereRight:''},{pupillaryDistance:'81'},{measuredAt:'2026-02-30'}])expect(()=>prescriptionFromForm({...form,...patch})).toThrow();
 });
 it('combines shared filters without mutating product order',()=>{
  const first=db.products[0];Object.assign(first,{brand:'Elan',shape:'Round',material:'Titanium'});const ids=db.products.map(p=>p.id);
  expect(productService.searchProducts({query:first.sku,brand:'Elan',shape:'Round',material:'Titanium'}).map(p=>p.id)).toEqual([first.id]);
  expect(productService.searchProducts({brand:'Elan',shape:'Square'})).toHaveLength(0);expect(db.products.map(p=>p.id)).toEqual(ids);
 });
 it('applies the same barcode rules to Excel, including case and safe stock totals',()=>{
  const first=db.products[0],second=db.products[1];first.barcode='ELAN-001';const headers=['SKU','Barcode','Số lượng','Lô'];
  expect(previewProductImport('USR001',[headers,[second.sku,'elan-001',1,'A']]).errors).toHaveLength(1);
  expect(previewProductImport('USR001',[headers,[first.sku,'<script>',1,'A']]).errors).toHaveLength(1);
  expect(previewProductImport('USR001',[headers,[first.sku,'NEW',1,'A'],[second.sku,'new',1,'B']]).errors).toHaveLength(1);
  expect(previewProductImport('USR001',[headers,[first.sku,'',Number.MAX_SAFE_INTEGER,'A']]).errors).toHaveLength(1);
 });
 it('reads templates and compressed Excel with sparse cells',async()=>{
  expect(await readExcel(file(workbookBytes([['Tên','Mô tả','Chất liệu'],['Gọng mới','Nhẹ','Titanium']])))).toEqual([['Tên','Mô tả','Chất liệu'],['Gọng mới','Nhẹ','Titanium']]);
  const rows=await readExcel(file(zipSheet(xml('<c r="A1" t="inlineStr"><is><t>SKU</t></is></c><c r="C1"><v>12</v></c>'))));
  expect(rows[0][0]).toBe('SKU');expect(rows[0][1]).toBeUndefined();expect(rows[0][2]).toBe('12');
 });
 it('rejects formulas, DTD, excessive rows, invalid shared strings and wrong extensions',async()=>{
  for(const source of [xml('<c r="A1"><f>1+1</f><v>2</v></c>'),'<!DOCTYPE a>'+xml('<c r="A1"><v>1</v></c>'),xml('<c r="A10002"><v>1</v></c>',10002),xml('<c r="A1" t="s"><v>99</v></c>')])await expect(readExcel(file(zipSheet(source)))).rejects.toThrow();
  await expect(readExcel(file(workbookBytes([['x']]),'wrong.csv'))).rejects.toThrow(/xlsx/);
 });
 it('rejects malformed ZIP offsets, bad CRC and dishonest decompression size',async()=>{
  await expect(excelParts(new Uint8Array(5))).rejects.toThrow();
  const bytes=zipSheet(xml('<c r="A1"><v>1</v></c>'));const bad=bytes.slice();new DataView(bad.buffer).setUint32(bad.length-6,0xffffffff,true);await expect(excelParts(bad)).rejects.toThrow();
  const crc=bytes.slice();crc[14]^=1;const end=crc.length-22,dir=new DataView(crc.buffer).getUint32(end+16,true);crc[dir+16]^=1;await expect(excelParts(crc)).rejects.toThrow(/CRC/);
  const size=bytes.slice();new DataView(size.buffer).setUint32(dir+24,1,true);await expect(excelParts(size)).rejects.toThrow(/giới hạn/);
 });
});
