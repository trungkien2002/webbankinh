import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { db } from './database';
import { customerLogin, customerRegister, customerSession, customerLogout, customerOrders, updateCustomerProfile } from './customerAccount';
import { createDraft, setDraftCustomer } from './bao-service';
beforeEach(() => {
  const local=new Map<string,string>(); const sessions=new Map<string,string>();
  const storage=(map:Map<string,string>)=>({getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)});
  vi.stubGlobal('localStorage',storage(local));vi.stubGlobal('sessionStorage',storage(sessions));db.reset();
});
afterEach(()=>vi.unstubAllGlobals());
describe('Customer local account',()=>{
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
