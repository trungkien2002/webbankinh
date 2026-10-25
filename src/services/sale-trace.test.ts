import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {db} from './database';
import {createDraft,saveDraftItems} from './bao-service';
import {payInvoice} from './hoan-service';
import {saleTrace} from './sale-trace';
import {revenueReport,revenueRows} from './kien-service';
beforeEach(()=>{const map=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)});db.reset();});
afterEach(()=>vi.unstubAllGlobals());
it('keeps creator and collector snapshots separately when a different account collects',()=>{
 const draft=createDraft('USR002');saveDraftItems('USR002',draft.id,{PRD001:1});const expected=db.users.find(u=>u.id==='USR002')!.username;
 const paid=payInvoice('USR001',draft.id,{method:'transfer',idempotencyKey:'TRACE-1',reference:'SALE-001'});
 expect(paid.createdBy?.userId).toBe('USR002');expect(paid.paidBy?.userId).toBe('USR001');
 db.users.find(u=>u.id==='USR002')!.username='Renamed';db.employees.find(e=>e.userId==='USR002')!.fullName='Đổi tên';
 expect(saleTrace(paid).account).toBe(expected);expect(saleTrace(paid).seller).toBe(paid.createdBy!.employeeName);
 const report=revenueReport('USR001','2020-01-01','2099-01-01','day',expected);expect(report.invoices.map(i=>i.id)).toContain(paid.id);
 const rows=revenueRows(report),header=rows.findIndex(r=>r[0]==='Hóa đơn');expect(rows[header]).toContain('Tài khoản thu');expect(rows[header+1]).toContain(paid.paidBy!.account);expect(rows[header+1]).toContain('Khách vãng lai');
});
it('does not fabricate historical accounts or collector names for old invoices',()=>{
 const draft=createDraft('USR001');delete draft.createdBy;
 expect(saleTrace(draft).account).toBe('Chưa lưu tài khoản');expect(saleTrace(draft).collector).toBe('Chưa ghi nhận');
});
it('searches customer names and keeps report totals aligned with filtered transactions',()=>{
 const draft=createDraft('USR001');saveDraftItems('USR001',draft.id,{PRD001:1});draft.customerName='Lê Hoài An';
 const current=db.invoices.find(i=>i.id===draft.id)!;current.customerName='Lê Hoài An';
 const paid=payInvoice('USR001',draft.id,{method:'card',idempotencyKey:'TRACE-2'});
 expect(revenueReport('USR001','2020-01-01','2099-01-01','day','hoai an').total).toBe(paid.totalAmount);
 expect(revenueReport('USR001','2020-01-01','2099-01-01','day','khong-co').total).toBe(0);
});
