import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { invoiceService } from './invoiceService';
import { voucherService } from './voucherService';
import { customerService } from './customerService';
import { EyePrescription } from '../contracts/domain';

const rx: EyePrescription = {sphereRight:-1,sphereLeft:-1,cylinderRight:0,cylinderLeft:0,axisRight:0,axisLeft:0,pupillaryDistance:62,measuredAt:'2026-10-23'};
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T05:00:00Z')); db.reset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Khánh review regression', () => {
  it('rejects impossible and malformed invoice dates', () => {
    expect(()=>invoiceService.filterInvoices({fromDate:'2026-02-30'})).toThrow();
    expect(()=>invoiceService.filterInvoices({toDate:'bad'})).toThrow();
  });
  it('includes the last millisecond of the final VN day, independent of machine timezone', () => {
    const result=invoiceService.holdPendingInvoice({employeeId:'EMP001',employeeName:'Fixture',items:[{id:'row',productId:'PRD001',productName:'Fixture',sku:'GK001',unitPrice:100,quantity:1,lineTotal:100}]});
    const inv=db.invoices.find(i=>i.id===result.data!.id)!;
    inv.createdAt='2026-10-22T16:59:59.999Z';
    expect(invoiceService.filterInvoices({fromDate:'2026-10-22',toDate:'2026-10-22'}).map(i=>i.id)).toContain(inv.id);
    inv.createdAt='2026-10-22T17:00:00.000Z';
    expect(invoiceService.filterInvoices({fromDate:'2026-10-22',toDate:'2026-10-22'}).map(i=>i.id)).not.toContain(inv.id);
  });
  it('uses identical VN midnight boundaries for status and voucher application', () => {
    const voucher=db.vouchers[0]; voucher.startDate='2026-10-23';voucher.endDate='2026-10-23';
    vi.setSystemTime(new Date('2026-10-22T17:00:00.000Z'));
    expect(voucherService.getVoucherStatus(voucher)).toBe('active');
    expect(voucherService.applyVoucher({voucherCode:voucher.code,subtotal:1000000}).success).toBe(true);
    vi.setSystemTime(new Date('2026-10-23T16:59:59.999Z'));
    expect(voucherService.getVoucherStatus(voucher)).toBe('active');
    expect(voucherService.applyVoucher({voucherCode:voucher.code,subtotal:1000000}).success).toBe(true);
  });
  it('cannot backdate an update to bypass the expiry guard', () => {
    vi.setSystemTime(new Date('2026-11-05T05:00:00Z'));
    expect(voucherService.updateVoucher({voucherId:'VOU001',name:'Bypass',currentActorRole:'admin',...{currentDateStr:'2026-10-15'}}).success).toBe(false);
  });
  it('rejects invalid voucher dates and non-finite or negative values without mutation', () => {
    const before=JSON.stringify(db.vouchers);
    for (const change of [{startDate:'bad'},{endDate:'2026-02-30'},{discountValue:NaN},{minOrderValue:-1},{maxDiscountAmount:-1}])
      expect(voucherService.updateVoucher({voucherId:'VOU001',currentActorRole:'admin',...change}).success).toBe(false);
    expect(JSON.stringify(db.vouchers)).toBe(before);
  });
  it('rejects invalid initial prescriptions before creating a customer', () => {
    const before=db.customers.length;
    for (const change of [{axisRight:1.5},{sphereRight:NaN},{measuredAt:'2026-02-30'}])
      expect(customerService.addCustomer({fullName:'Fixture',phone:'0987654321',prescription:{...rx,...change}}).success).toBe(false);
    expect(db.customers).toHaveLength(before);
  });
  it('does not create duplicate contact records and clones the initial prescription', () => {
    expect(customerService.addCustomer({fullName:'Duplicate',phone:db.customers[0].phone}).success).toBe(false);
    const result=customerService.addCustomer({fullName:'Fixture',phone:'0987654321',prescription:rx});
    expect(result.success).toBe(true);
    rx.sphereRight=-5;expect(result.data!.prescriptions[0].sphereRight).toBe(-1);rx.sphereRight=-1;
  });
  it('keeps expired toggles allowed, preserves invoice snapshots and disabled-status precedence', () => {
    vi.setSystemTime(new Date('2026-11-05T05:00:00Z'));
    const invoice=invoiceService.holdPendingInvoice({employeeId:'EMP001',employeeName:'Fixture',voucherCode:'KINH10',voucherDiscountSnapshot:10,
      items:[{id:'row',productId:'PRD001',productName:'Fixture',sku:'GK001',unitPrice:100,quantity:1,lineTotal:100}]}).data!;
    expect(voucherService.updateVoucher({voucherId:'VOU001',isActive:false,currentActorRole:'admin'}).success).toBe(true);
    expect(voucherService.getVoucherStatus(db.vouchers[0])).toBe('disabled');
    expect(voucherService.filterVouchers({query:'KINH10',status:'disabled'}).map(v=>v.id)).toEqual(['VOU001']);
    expect(db.invoices.find(i=>i.id===invoice.id)!.discountAmount).toBe(10);
  });
  it('rolls back both customer and voucher changes on persistence failure', () => {
    const customers=JSON.stringify(db.customers),vouchers=JSON.stringify(db.vouchers);
    vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('Storage full');}});
    expect(customerService.addCustomer({fullName:'Fixture',phone:'0987654321',prescription:rx}).success).toBe(false);
    expect(voucherService.updateVoucher({voucherId:'VOU001',name:'Storage failure',currentActorRole:'admin'}).success).toBe(false);
    expect(JSON.stringify(db.customers)).toBe(customers);expect(JSON.stringify(db.vouchers)).toBe(vouchers);
  });
  it('allocates distinct customer identities on the same millisecond and rejects invalid contacts', () => {
    const a=customerService.addCustomer({fullName:'Fixture A',phone:'0987654321',email:'a@example.com'});
    const b=customerService.addCustomer({fullName:'Fixture B',phone:'0987654322'});
    expect(a.success&&b.success).toBe(true);expect(a.data!.id).not.toBe(b.data!.id);expect(a.data!.customerCode).not.toBe(b.data!.customerCode);
    expect(customerService.addCustomer({fullName:'Duplicate',phone:'0987654323',email:'A@example.com'}).success).toBe(false);
    expect(customerService.addCustomer({fullName:'Bad phone',phone:'abc123456789'}).success).toBe(false);
  });
});
