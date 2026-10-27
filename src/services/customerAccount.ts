import { db } from './database';
import { Customer } from '../contracts/domain';
import demoAccounts from '../../data/demo-customer-accounts.json';
type Account = { customerId: string; salt: string; hash: string };
const key = 'elan_customer_accounts';
const sessionKey = 'elan_customer_session';
function accounts(): Record<string, Account> {
  let stored: Record<string, Account> = {};
  try { stored = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { /* Giữ khả năng đăng nhập bộ dữ liệu mẫu. */ }
  const defaults: Record<string, Account> = {};
  // ASVS 6.2: dùng hash PBKDF2 của tài khoản hư cấu; không ghi đè mật khẩu người dùng đã đặt.
  for (const account of demoAccounts) {
    const customer = db.customers.find(c => c.id === account.customerId && c.email?.toLowerCase() === account.email);
    if (!customer) continue;
    const record = stored[account.email] || { customerId: customer.id, salt: account.salt, hash: account.hash };
    defaults[account.alias] = record;
    defaults[account.email] = record;
  }
  return { ...defaults, ...stored };
}
async function hash(password: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 600000, hash: 'SHA-256' }, material, 256);
  return Array.from(new Uint8Array(bits)).map(v => v.toString(16).padStart(2,'0')).join('');
}
// Xác thực cục bộ cho phạm vi môn học; không cung cấp xác thực server (ASVS 7.2.1).
export function customerSession(): Customer | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    // ASVS 7.3.2/7.4.1: hết hạn tuyệt đối 8 giờ và vô hiệu khi đăng xuất.
    if (!session || !session.token || session.expiresAt <= Date.now()) { sessionStorage.removeItem(sessionKey); return null; }
    return db.customers.find(c => c.id === session.customerId) || null;
  } catch { return null; }
}
function session(customerId: string) { sessionStorage.setItem(sessionKey, JSON.stringify({ customerId, token: crypto.randomUUID(), expiresAt: Date.now()+8*3600000 })); return customerSession()!; }
export function customerLogout() { sessionStorage.removeItem(sessionKey); }
export async function customerLogin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const attemptsKey = 'elan_customer_login_attempts';
  const attempts = JSON.parse(sessionStorage.getItem(attemptsKey) || '{"count":0,"until":0}');
  if (attempts.until > Date.now()) throw new Error('Thử lại sau một phút.');
  const records = accounts();
  // Tài khoản mẫu liên kết hồ sơ có sẵn; không ghi mật khẩu nhập vào ra log.
  const seed = db.customers.find(c => c.id === 'CUS001');
  if (seed && !localStorage.getItem('elan_customer_alias_v2')) {
    const salt = crypto.randomUUID();
    for (const [identifier, record] of Object.entries(records)) if (record.customerId === seed.id && !demoAccounts.some(account=>account.alias===identifier)) delete records[identifier];
    const fixture = { customerId: seed.id, salt, hash: await hash('a', salt) };
    records.a = fixture;
    if (seed.email) records[seed.email.toLowerCase()] = fixture;
    localStorage.setItem(key, JSON.stringify(records));
    localStorage.setItem('elan_customer_alias_v2', '1');
  }
  const record = records[normalized];
  const valid = record && (await hash(password, record.salt)) === record.hash;
  if (!valid) {
    const count = attempts.until <= Date.now() && attempts.until ? 1 : attempts.count+1;
    // ASVS 6.3.1: giới hạn thử trong luồng local, không thay thế giới hạn server.
    sessionStorage.setItem(attemptsKey,JSON.stringify({count,until:count>=5?Date.now()+60000:0}));
    throw new Error('Email hoặc mật khẩu chưa đúng.');
  }
  sessionStorage.removeItem(attemptsKey);
  if (!db.customers.some(c=>c.id===record.customerId)) throw new Error('Tài khoản không còn hoạt động.');
  return session(record.customerId);
}
export async function customerRegister(input: { name: string; email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  // ASVS 6.2.1/6.2.8: ít nhất 8 ký tự và kiểm tra mật khẩu nguyên vẹn.
  if (!input.name.trim() || !/^\d{9,11}$/.test(input.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.password.length<8)
    throw new Error('Nhập tên, email, số điện thoại hợp lệ và mật khẩu tối thiểu 8 ký tự.');
  const records = accounts();
  if (records[email] || db.customers.some(c=>c.email?.toLowerCase()===email)) throw new Error('Email đã được sử dụng.');
  const customer: Customer = { id: crypto.randomUUID(), customerCode: 'KH-'+crypto.randomUUID().slice(0,8).toUpperCase(), fullName:input.name.trim(),email,phone:input.phone,address:'',prescriptions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };
  const salt=crypto.randomUUID(); records[email]={customerId:customer.id,salt,hash:await hash(input.password,salt)};
  const previous=localStorage.getItem(key);
  localStorage.setItem(key,JSON.stringify(records));
  try { db.transaction(data=>data.customers.push(customer)); } catch(e) { if(previous) localStorage.setItem(key,previous); else localStorage.removeItem(key); throw e; }
  return session(customer.id);
}
export function customerOrders() { const customer=customerSession(); if(!customer) throw new Error('Vui lòng đăng nhập.'); return db.invoices.filter(i=>i.customerId===customer.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
export function updateCustomerProfile(input: { name: string; address: string }) {
  const customer=customerSession(); if(!customer) throw new Error('Vui lòng đăng nhập.'); if(!input.name.trim()) throw new Error('Họ tên không được trống.');
  db.transaction(data=>Object.assign(data.customers.find(c=>c.id===customer.id)!,{fullName:input.name.trim(),address:input.address.trim(),updatedAt:new Date().toISOString()}));
  return customerSession()!;
}
