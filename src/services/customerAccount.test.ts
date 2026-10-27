import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { db } from './database';
import { customerLogin, customerRegister, customerSession, customerLogout, customerOrders, updateCustomerProfile } from './customerAccount';
import { createDraft, setDraftCustomer } from './bao-service';
import { invoiceService } from './invoiceService';
beforeEach(() => {
  const local=new Map<string,string>(); const sessions=new Map<string,string>();
  const storage=(map:Map<string,string>)=>({getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)});
  vi.stubGlobal('localStorage',storage(local));vi.stubGlobal('sessionStorage',storage(sessions));db.reset();
});
afterEach(()=>vi.unstubAllGlobals());
describe('Customer local account',()=>{
  it.each(['existing', 'registered'])('keeps the %s customer signed in after checkout and database transactions', async kind=>{
    const customer=kind==='existing'?await customerLogin('a','a'):await customerRegister({name:'Nguyễn An',email:'checkout@example.com',phone:'0381234567',password:'Checkout123'});
    const before=sessionStorage.getItem('elan_customer_session');
    const result=invoiceService.holdPendingInvoice({
      employeeId:'ONLINE',employeeName:'Cửa hàng trực tuyến',customerId:customer.id,customerName:customer.fullName,customerPhone:customer.phone,
      deliveryAddress:'12 Đường Hoa Ban',
      items:[{id:'line',productId:'PRD001',productName:'Gọng kính',sku:'GK001',quantity:1,unitPrice:850000,lineTotal:850000}],
    });
    expect(result.success).toBe(true);
    localStorage.removeItem('elan_shopping_cart');
    expect(sessionStorage.getItem('elan_customer_session')).toBe(before);
    expect(customerSession()?.id).toBe(customer.id);
    expect(customerOrders().map(i=>i.id)).toContain(result.data!.id);
    // Reading the profile again must resolve the cloned customer in the updated database.
    expect(customerSession()).toBe(db.customers.find(c=>c.id===customer.id));
  });
  it('does not log the customer out when checkout cannot persist',async()=>{
    const customer=await customerLogin('a','a');
    const before=sessionStorage.getItem('elan_customer_session');
    const write=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new Error('QuotaExceededError');});
    try {
      expect(invoiceService.holdPendingInvoice({employeeId:'ONLINE',employeeName:'Cửa hàng trực tuyến',customerId:customer.id,customerName:customer.fullName,customerPhone:customer.phone,deliveryAddress:'12 Đường Hoa Ban',items:[{id:'line',productId:'PRD001',productName:'Gọng kính',sku:'GK001',quantity:1,unitPrice:850000,lineTotal:850000}]}).success).toBe(false);
      expect(sessionStorage.getItem('elan_customer_session')).toBe(before);
      expect(customerSession()?.id).toBe(customer.id);
    } finally {write.mockRestore();}
  });
  it('signs in the requested customer alias without accepting the admin alias',async()=>{
    await expect(customerLogin('a','a')).resolves.toMatchObject({id:'CUS001'});
    customerLogout();
    await expect(customerLogin('b','b')).rejects.toThrow();
    await expect(customerLogin('a','a')).resolves.toMatchObject({id:'CUS001'});
  });
  it('registers, persists a hash, logs in and terminates the session on logout',async()=>{
    const c=await customerRegister({name:'Khách kiểm thử',email:'buyer@example.com',phone:'0900000099',password:'TestBuyer123'});
    expect(customerSession()?.id).toBe(c.id);
    expect(localStorage.getItem('elan_customer_accounts')).not.toContain('TestBuyer123');
    customerLogout();expect(customerSession()).toBeNull();
    await expect(customerLogin('BUYER@example.com','wrong')).rejects.toThrow();
    await expect(customerLogin('buyer@example.com','TestBuyer123')).resolves.toMatchObject({id:c.id});
    const session=JSON.parse(sessionStorage.getItem('elan_customer_session')!);session.expiresAt=Date.now()-1;sessionStorage.setItem('elan_customer_session',JSON.stringify(session));
    expect(customerSession()).toBeNull();
  });
  it('restricts order history and profile edits to the signed-in customer',async()=>{
    const c=await customerRegister({name:'Khách mới',email:'buyer@example.com',phone:'0900000099',password:'TestBuyer123'});
    const own=createDraft('USR001');setDraftCustomer('USR001',own.id,c.id);
    const other=createDraft('USR001');setDraftCustomer('USR001',other.id,'CUS001');
    expect(customerOrders().map(i=>i.id)).toEqual([own.id]);
    updateCustomerProfile({name:'Tên mới',address:'Địa chỉ kiểm thử'});
    expect(customerSession()?.fullName).toBe('Tên mới');expect(db.customers[0].fullName).not.toBe('Tên mới');
    customerLogout();expect(()=>customerOrders()).toThrow();expect(()=>updateCustomerProfile({name:'X',address:''})).toThrow();
  });
  it('rejects invalid and duplicate registrations',async()=>{
    await expect(customerRegister({name:'',email:'bad',phone:'1',password:'x'})).rejects.toThrow();
    const input={name:'Khách',email:'buyer@example.com',phone:'0900000099',password:'TestBuyer123'};
    await customerRegister(input);await expect(customerRegister(input)).rejects.toThrow(/Email/);
  });
});
