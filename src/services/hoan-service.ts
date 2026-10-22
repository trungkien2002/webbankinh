import {
  Category,
  Customer,
  EyePrescription,
  Invoice,
  InvoiceItem,
  InvoicePaymentMethod,
  Product,
  User,
} from '../contracts/domain';
import { db } from './database';
import { completeDraft, deleteUnpaidInvoice, invoiceDetail, validatePrescription } from './bao-service';
import { voucherService } from './voucherService';
import { revokeUserSessions } from './demoSession';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const paying = new Set<string>();

export function foldText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim();
}

function actor(userId: string, admin = false): User {
  const user = db.users.find(u => u.id === userId && u.isActive);
  if (!user || (admin && user.role !== 'admin')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
  return user;
}

function editableInvoice(userId: string, invoiceId: string): Invoice {
  const invoice = invoiceDetail(userId, invoiceId);
  if (!['draft', 'pending'].includes(invoice.paymentStatus)) throw new Error('Đơn đã thanh toán hoặc đã hủy, không thể sửa.');
  return invoice;
}

function totals(items: InvoiceItem[], voucherCode = '') {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = voucherCode.trim() ? voucherService.applyVoucher({ voucherCode, subtotal }) : undefined;
  const applied = discount?.success ? discount : undefined;
  return {
    subtotal,
    discountAmount: applied?.discountAmount || 0,
    voucherCode: applied?.voucherCode,
    voucherDiscountSnapshot: applied?.discountAmount || 0,
    totalAmount: subtotal - (applied?.discountAmount || 0),
  };
}

export function searchCategories(userId: string, filter: { q?: string; material?: string; type?: string } = {}): Category[] {
  actor(userId);
  const q = foldText(filter.q || '');
  const material = foldText(filter.material || '');
  const type = foldText(filter.type || '');
  return db.categories.filter(c => {
    if (c.isDeleted) return false;
    const hay = foldText(`${c.name} ${c.description} ${c.material || ''}`);
    if (q && !hay.includes(q) && !foldText(c.name).includes(q)) return false;
    if (material && foldText(c.material || '') !== material && !foldText(c.material || '').includes(material)) return false;
    if (type && !hay.includes(type)) return false;
    return true;
  });
}

export type ImportRowError = { line: number; message: string };
export type CategoryImportRow = { name: string; description: string; material?: string };
export type ProductImportRow = { sku: string; barcode?: string; quantity: number; lot?: string };

function headerMap(headers: string[]) {
  return Object.fromEntries(headers.map((h, i) => [foldText(h).replace(/\s+/g, ''), i]));
}

export function rowsFromSheet(sheet: unknown[][]): { headers: string[]; rows: string[][]; error?: string } {
  if (!sheet.length) return { headers: [], rows: [], error: 'File Excel không có dữ liệu.' };
  const headers = (sheet[0] || []).map(v => String(v || '').trim());
  if (headers.every(h => !h)) return { headers: [], rows: [], error: 'Thiếu dòng tiêu đề.' };
  const rows = sheet.slice(1).map(row => headers.map((_, i) => String(row[i] ?? '').trim()));
  return { headers, rows };
}

export function previewCategoryImport(userId: string, sheet: unknown[][]) {
  actor(userId, true);
  const parsed = rowsFromSheet(sheet);
  if (parsed.error) throw new Error(parsed.error);
  const cols = headerMap(parsed.headers);
  if (cols['ten'] === undefined && cols['name'] === undefined) throw new Error('Thiếu cột Tên.');
  const nameIdx = cols['ten'] ?? cols['name'];
  const descIdx = cols['mota'] ?? cols['description'];
  const materialIdx = cols['chatlieu'] ?? cols['material'];
  const errors: ImportRowError[] = [];
  const valid: CategoryImportRow[] = [];
  const seen = new Set<string>();
  parsed.rows.forEach((row, index) => {
    const line = index + 2;
    if (row.every(cell => !cell)) return;
    const name = (row[nameIdx] || '').trim();
    const description = descIdx === undefined ? '' : row[descIdx] || '';
    const material = materialIdx === undefined ? undefined : row[materialIdx] || undefined;
    if (!name) {
      errors.push({ line, message: 'Thiếu tên phân loại.' });
      return;
    }
    const key = foldText(name);
    if (seen.has(key)) {
      errors.push({ line, message: `Tên trùng trong file: ${name}` });
      return;
    }
    seen.add(key);
    if (db.categories.some(c => !c.isDeleted && foldText(c.name) === key)) {
      errors.push({ line, message: `Tên đã tồn tại trên hệ thống: ${name}` });
      return;
    }
    valid.push({ name, description, material: material?.trim() || undefined });
  });
  return { valid, errors, totalRows: parsed.rows.filter(r => r.some(Boolean)).length };
}

export function commitCategoryImport(userId: string, rows: CategoryImportRow[], importKey: string) {
  actor(userId, true);
  if (!importKey.trim()) throw new Error('Thiếu khóa import.');
  if (db.importKeys.includes(importKey)) {
    return { imported: 0, duplicate: true };
  }
  const previewLike = rows.map(r => [r.name, r.description, r.material || '']);
  const check = previewCategoryImport(userId, [['Tên', 'Mô tả', 'Chất liệu'], ...previewLike]);
  if (check.errors.length) throw new Error(check.errors.map(e => `Dòng ${e.line}: ${e.message}`).join('\n'));
  db.transaction(data => {
    if (data.importKeys.includes(importKey)) return;
    const stamp = now();
    for (const row of rows) {
      data.categories.push({
        id: id('CAT'),
        name: row.name.trim(),
        description: row.description.trim(),
        material: row.material?.trim(),
        isDeleted: false,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    data.importKeys.push(importKey);
  });
  return { imported: rows.length, duplicate: false };
}

export function previewProductImport(userId: string, sheet: unknown[][]) {
  actor(userId);
  const parsed = rowsFromSheet(sheet);
  if (parsed.error) throw new Error(parsed.error);
  const cols = headerMap(parsed.headers);
  if (cols['sku'] === undefined && cols['ma'] === undefined) throw new Error('Thiếu cột SKU.');
  if (cols['soluong'] === undefined && cols['quantity'] === undefined && cols['ton'] === undefined) throw new Error('Thiếu cột Số lượng.');
  const skuIdx = cols['sku'] ?? cols['ma'];
  const qtyIdx = cols['soluong'] ?? cols['quantity'] ?? cols['ton'];
  const barcodeIdx = cols['barcode'] ?? cols['mavach'];
  const lotIdx = cols['lo'] ?? cols['lot'] ?? cols['solo'];
  const errors: ImportRowError[] = [];
  const valid: ProductImportRow[] = [];
  const barcodes = new Map<string, string>();
  parsed.rows.forEach((row, index) => {
    const line = index + 2;
    if (row.every(cell => !cell)) return;
    const sku = (row[skuIdx] || '').trim().toUpperCase();
    const quantity = Number(row[qtyIdx]);
    const barcode = barcodeIdx === undefined ? undefined : (row[barcodeIdx] || '').trim();
    const lot = lotIdx === undefined ? undefined : (row[lotIdx] || '').trim();
    if (!sku) {
      errors.push({ line, message: 'Thiếu SKU.' });
      return;
    }
    const product = db.products.find(p => p.sku.toUpperCase() === sku && !p.isDeleted);
    if (!product) {
      errors.push({ line, message: `SKU không có trên hệ thống: ${sku}` });
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({ line, message: 'Số lượng phải là số nguyên dương.' });
      return;
    }
    if (barcode) {
      if ((barcodes.has(barcode) && barcodes.get(barcode) !== sku) || db.products.some(p => p.barcode === barcode && p.id !== product.id && !p.isDeleted)) {
        errors.push({ line, message: `Mã vạch trùng: ${barcode}` });
        return;
      }
      barcodes.set(barcode, sku);
    }
    valid.push({ sku, barcode, quantity, lot: lot || undefined });
  });
  return { valid, errors, totalRows: parsed.rows.filter(r => r.some(Boolean)).length };
}

export function commitProductImport(userId: string, rows: ProductImportRow[], importKey: string) {
  actor(userId);
  if (!importKey.trim()) throw new Error('Thiếu khóa import.');
  if (db.importKeys.includes(importKey)) return { imported: 0, duplicate: true };
  const sheet = [['SKU', 'Barcode', 'Số lượng', 'Lô'], ...rows.map(r => [r.sku, r.barcode || '', String(r.quantity), r.lot || ''])];
  const check = previewProductImport(userId, sheet);
  if (check.errors.length) throw new Error(check.errors.map(e => `Dòng ${e.line}: ${e.message}`).join('\n'));
  db.transaction(data => {
    if (data.importKeys.includes(importKey)) return;
    const stamp = now();
    for (const row of rows) {
      const product = data.products.find(p => p.sku.toUpperCase() === row.sku.toUpperCase() && !p.isDeleted);
      if (!product) throw new Error(`SKU không có trên hệ thống: ${row.sku}`);
      product.stock += row.quantity;
      product.updatedAt = stamp;
      if (row.barcode) product.barcode = row.barcode;
      data.stockMovements.push({
        id: id('MOV'),
        productId: product.id,
        quantity: row.quantity,
        reason: 'import',
        importKey,
        lot: row.lot,
        createdAt: stamp,
      });
    }
    data.importKeys.push(importKey);
  });
  return { imported: rows.length, duplicate: false };
}

export function softDeleteProduct(userId: string, productId: string) {
  actor(userId, true);
  const product = db.products.find(p => p.id === productId);
  if (!product) throw new Error('Sản phẩm không tồn tại.');
  if (product.isDeleted) return product;
  db.transaction(data => {
    const target = data.products.find(p => p.id === productId);
    if (!target || target.isDeleted) return;
    target.isDeleted = true;
    target.updatedAt = now();
  });
  return db.products.find(p => p.id === productId)!;
}

export function removeInvoiceItem(userId: string, invoiceId: string, itemId: string) {
  const invoice = editableInvoice(userId, invoiceId);
  const item = invoice.items.find(i => i.id === itemId);
  if (!item) throw new Error('Dòng hóa đơn không tồn tại.');
  const items = invoice.items.filter(i => i.id !== itemId);
  if (!items.length) { deleteUnpaidInvoice(userId, invoiceId); return undefined; }
  const next = totals(items, invoice.voucherCode);
  db.transaction(data => {
    const target = data.invoices.find(i => i.id === invoiceId)!;
    if (!['draft', 'pending'].includes(target.paymentStatus)) throw new Error('Đơn đã thanh toán hoặc đã hủy, không thể sửa.');
    Object.assign(target, { items, ...next, updatedAt: now() });
    if (!next.voucherCode) {
      delete target.voucherCode;
      delete target.voucherDiscountSnapshot;
    }
  });
  return db.invoices.find(i => i.id === invoiceId)!;
}

export function paymentLabel(method: InvoicePaymentMethod) {
  return method === 'cash' ? 'Tiền mặt' : method === 'card' ? 'Thẻ' : method === 'qr' ? 'QR / VietQR' : 'Chuyển khoản';
}

export function vietQrPayload(invoice: Invoice) {
  const amount = Math.max(0, Math.round(invoice.totalAmount)).toString();
  const add = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;
  const merchant = add('00', 'A000000727') + add('01', add('00', '970415') + add('01', 'V3DEMO123456')) + add('02', 'QRIBFTTA');
  const content = add('00', '01') + add('01', '12') + add('38', merchant) + add('53', '704') + add('54', amount) + add('58', 'VN') + add('62', add('08', invoice.invoiceCode));
  return content + add('63', crc16(content + '6304'));
}

function crc16(value: string) {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function payInvoice(
  userId: string,
  invoiceId: string,
  input: { method: InvoicePaymentMethod; cashReceived?: number; idempotencyKey: string },
): Invoice {
  actor(userId);
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error('Thiếu khóa chống gửi lại.');
  if (!['cash', 'transfer', 'card', 'qr'].includes(input.method)) throw new Error('Phương thức thanh toán không hợp lệ.');
  const existing = db.payments.find(p => p.idempotencyKey === key);
  if (existing) {
    if (existing.invoiceId !== invoiceId || existing.method !== input.method) throw new Error('Khóa thanh toán đã gắn với giao dịch khác.');
    const invoice = db.invoices.find(i => i.id === existing.invoiceId);
    if (!invoice) throw new Error('Hóa đơn không tồn tại.');
    return invoice;
  }
  if (paying.has(invoiceId)) throw new Error('Đang xử lý thanh toán.');
  paying.add(invoiceId);
  try {
    const invoice = editableInvoice(userId, invoiceId);
    const discount = invoice.voucherCode ? voucherService.applyVoucher({voucherCode:invoice.voucherCode,subtotal:invoice.subtotal}) : undefined;
    if (discount && !discount.success) throw new Error(discount.error || 'Ưu đãi không hợp lệ.');
    const payable = invoice.subtotal - (discount?.discountAmount || 0);
    if (input.method === 'cash') {
      if (!Number.isFinite(input.cashReceived) || (input.cashReceived || 0) < payable) {
        throw new Error('Số tiền mặt nhận chưa đủ để thanh toán.');
      }
    }
    completeDraft(userId, invoiceId, true, input.method, key);
    return db.invoices.find(i => i.id === invoiceId)!;
  } finally {
    paying.delete(invoiceId);
  }
}

export function searchInvoices(userId: string, query = '', filter: { from?: string; to?: string; status?: string } = {}) {
  const user = actor(userId);
  const q = foldText(query);
  const digits = query.replace(/\D/g, '');
  let list = db.invoices.filter(inv => {
    if (user.role !== 'admin' && inv.employeeId && !db.employees.some(e => e.userId === user.id && e.id === inv.employeeId) && inv.paymentStatus === 'draft') {
      return false;
    }
    if (filter.status && filter.status !== 'all' && inv.paymentStatus !== filter.status) return false;
    if (filter.from && inv.createdAt.slice(0, 10) < filter.from) return false;
    if (filter.to && inv.createdAt.slice(0, 10) > filter.to) return false;
    if (!q && !digits) return true;
    const hay = foldText(`${inv.invoiceCode} ${inv.customerName || ''} ${inv.customerPhone || ''} ${inv.employeeName}`);
    const phone = (inv.customerPhone || '').replace(/\D/g, '');
    return hay.includes(q) || !!(digits && phone.includes(digits));
  });
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export function updateCustomer(
  userId: string,
  customerId: string,
  input: { fullName: string; phone: string; email?: string; address?: string },
  prescription?: EyePrescription,
) {
  actor(userId);
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại.');
  const fullName = input.fullName.trim();
  const phone = input.phone.replace(/[\s.\-()]/g, '');
  const email = input.email?.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
  if (email && db.customers.some(c=>c.id!==customerId&&c.email?.toLowerCase()===email)) throw new Error('Email đã được sử dụng.');
  if (!fullName) throw new Error('Họ tên không được để trống.');
  if (!/^\d{9,11}$/.test(phone)) throw new Error('Số điện thoại phải gồm 9–11 chữ số.');
  if (db.customers.some(c => c.id !== customerId && c.phone.replace(/[\s.\-()]/g, '') === phone)) {
    throw new Error('Số điện thoại đã được dùng bởi khách khác.');
  }
  if (prescription) validatePrescription(prescription);
  const snapshot = prescription ? JSON.parse(JSON.stringify(prescription)) : undefined;
  db.transaction(data => {
    const target = data.customers.find(c => c.id === customerId);
    if (!target) throw new Error('Khách hàng không tồn tại.');
    Object.assign(target, {
      fullName,
      phone,
      email: email || undefined,
      address: input.address?.trim() || undefined,
      updatedAt: now(),
    });
    if (snapshot) target.prescriptions.push(snapshot);
  });
  return db.customers.find(c => c.id === customerId)!;
}

export function setUserLocked(userId: string, targetUserId: string, locked: boolean) {
  actor(userId, true);
  const target = db.users.find(u => u.id === targetUserId);
  if (!target) throw new Error('Tài khoản không tồn tại.');
  if (locked && target.role === 'admin') {
    const activeAdmins = db.users.filter(u => u.role === 'admin' && u.isActive && u.id !== targetUserId);
    if (!activeAdmins.length) throw new Error('Không thể khóa quản trị viên cuối cùng.');
  }
  db.transaction(data => {
    const user = data.users.find(u => u.id === targetUserId);
    if (!user) throw new Error('Tài khoản không tồn tại.');
    user.isActive = !locked;
    user.updatedAt = now();
  });
  if (locked) revokeUserSessions(targetUserId);
  return db.users.find(u => u.id === targetUserId)!;
}

export function importKeyFor(kind: string, rows: unknown) {
  return `${kind}:${JSON.stringify(rows)}`;
}

export function sellableProducts() {
  return db.products.filter(p => !p.isDeleted);
}
