import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { prepareDemoCatalog } from './catalog';
import { preparePresentationData } from './presentationData';
import { prepareReportSamples } from './reportSamples';
import { customerLogin, customerLogout, customerOrders } from './customerAccount';
import { revenueReport } from './kien-service';
import { invoiceTotals } from './invoice-totals';
import { createDraft } from './bao-service';

beforeEach(()=>{
  const local=new Map<string,string>(), session=new Map<string,string>();
  const storage=(values:Map<string,string>)=>({getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}});
  vi.stubGlobal('localStorage',storage(local));vi.stubGlobal('sessionStorage',storage(session));
  db.reset();prepareDemoCatalog();preparePresentationData();
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('Report demonstration data',()=>{
  it('adds a consistent historical dataset once without changing customers, orders or inventory already present',()=>{
    const customer=JSON.stringify(db.customers[0]);
    const stock=db.products.map(p=>p.stock);
    prepareReportSamples();
    expect(db.customers).toHaveLength(12);
    expect(JSON.stringify(db.customers[0])).toBe(customer);
    expect(db.invoices).toHaveLength(48);
    expect(db.products.map(p=>p.stock)).toEqual(stock);
    expect(db.invoices.filter(i=>i.paymentStatus==='paid')).toHaveLength(36);
    expect(db.invoices.filter(i=>i.paymentStatus==='pending')).toHaveLength(8);
    expect(db.invoices.filter(i=>i.paymentStatus==='cancelled')).toHaveLength(4);
    expect(db.payments).toHaveLength(36);
    expect(new Set(db.invoices.map(i=>i.invoiceCode)).size).toBe(48);
    for(const invoice of db.invoices){
      expect(db.customers.some(c=>c.id===invoice.customerId)).toBe(true);
      expect(invoice.totalAmount).toBe(invoiceTotals(invoice.subtotal,invoice.discountAmount,0,10).totalAmount);
      expect(invoice.items.every(line=>db.products.some(p=>p.id===line.productId))).toBe(true);
      if(invoice.employeeId!=='ONLINE')expect(invoice.createdBy?.account).toBeTruthy();
      expect(Boolean(invoice.paidAt)).toBe(invoice.paymentStatus==='paid');
    }
    const report=revenueReport('USR001','2026-10-01','2026-10-31');
    expect(report.total).toBe(db.invoices.filter(i=>i.paymentStatus==='paid').reduce((sum,i)=>sum+i.totalAmount,0));
    for(const group of ['Gọng kính','Tròng kính','Kính râm','Phụ kiện'] as const)expect(report.groups[group]).toBeGreaterThan(0);
    prepareReportSamples();expect(db.invoices).toHaveLength(48);
    db.transaction(data=>{data.invoices=data.invoices.filter(i=>i.id!=='SAMPLE_INV_005');});
    prepareReportSamples();expect(db.invoices).toHaveLength(47);
  });
  it('rolls back when saving fails and can safely retry',()=>{
    const write=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new Error('storage full');});
    expect(()=>prepareReportSamples()).toThrow();expect(db.invoices).toHaveLength(0);expect(db.customers).toHaveLength(2);
    write.mockRestore();prepareReportSamples();expect(db.invoices).toHaveLength(48);
  });
  it('retains an existing order and resolves an overlapping sample invoice code',()=>{
    const draft=createDraft('USR001');
    db.transaction(data=>{data.invoices.find(i=>i.id===draft.id)!.invoiceCode='HDM0001';});
    const before=JSON.stringify(db.invoices[0]);
    prepareReportSamples();
    expect(db.invoices).toHaveLength(49);
    expect(JSON.stringify(db.invoices.find(i=>i.id===draft.id))).toBe(before);
    expect(new Set(db.invoices.map(i=>i.invoiceCode)).size).toBe(49);
  });
  it('allows all sample aliases to log in and see only their own orders while retaining the existing alias',async()=>{
    prepareReportSamples();
    for(let i=1;i<=12;i++){
      const customer=await customerLogin(`kh${String(i).padStart(2,'0')}`,'Elan@2026');
      expect(customerOrders()).toHaveLength(4);
      expect(customerOrders().every(order=>order.customerId===customer.id)).toBe(true);
      customerLogout();
    }
    await expect(customerLogin('a','a')).resolves.toMatchObject({id:'CUS001'});
    await expect(customerLogin('kh12','wrong')).rejects.toThrow();
  });
});
