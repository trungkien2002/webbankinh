import {saleActor} from './sale-trace';
// Local demo operations for Bao. This module does not provide server authorization.
import { Category, Employee, EyePrescription, Invoice, InvoiceItem, User, Voucher } from '../contracts/domain';
import { db } from './database';
import { voucherService } from './voucherService';
import { ASSEMBLY_UNIT_FEE, buildDraftItems, itemQuantities } from './combo';
import { invoiceTotals, DEMO_TAX_RATE } from './invoice-totals';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function actor(userId: string, admin = false): User {
  const user = db.users.find(u => u.id === userId && u.isActive);
  if (!user || (admin && user.role !== 'admin')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
  return user;
}
function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new Error('Ngày không hợp lệ (YYYY-MM-DD).');
  return value;
}
export function categoryDetail(userId: string, categoryId: string) {
  actor(userId);
  const category = db.categories.find(c => c.id === categoryId && !c.isDeleted);
  if (!category) throw new Error('Phân loại không tồn tại hoặc đã bị xóa.');
  return { category, products: db.products.filter(p => p.categoryId === categoryId && !p.isDeleted) };
}
export function editCategory(userId: string, categoryId: string, input: Pick<Category, 'name' | 'description' | 'material'>) {
  actor(userId, true);
  categoryDetail(userId, categoryId);
  const name = input.name.trim();
  if (!name) throw new Error('Tên phân loại không được để trống.');
  if (db.categories.some(c => c.id !== categoryId && !c.isDeleted && c.name.toLocaleLowerCase() === name.toLocaleLowerCase()))
    throw new Error('Tên phân loại đã tồn tại.');
  db.transaction(data => {
    const category = data.categories.find(c => c.id === categoryId)!;
    Object.assign(category, { name, description: input.description.trim(), material: input.material?.trim(), updatedAt: now() });
  });
}
export function createDraft(userId: string): Invoice {
  actor(userId);
  const employee = db.employees.find(e => e.userId === userId);
  if (!employee) throw new Error('Tài khoản chưa có hồ sơ nhân viên để tạo đơn.');
  const codes = new Set(db.invoices.map(i => i.invoiceCode));
  let number = db.invoices.length + 1;
  while (codes.has(`HD${String(number).padStart(4, '0')}`)) number++;
  const invoice: Invoice = {
    createdBy:saleActor(userId), id: id('INV'), invoiceCode: `HD${String(number).padStart(4, '0')}`,
    employeeId: employee.id, employeeName: employee.fullName, items: [],
    subtotal: 0, discountAmount: 0, totalAmount: 0, taxRate:DEMO_TAX_RATE,taxAmount:0,
    paymentMethod: 'cash', paymentStatus: 'draft', productionStatus: 'none',
    createdAt: now(), updatedAt: now(),
  };
  db.transaction(data => { data.invoices.push(invoice); });
  return invoice;
}
export function invoiceDetail(userId: string, invoiceId: string): Invoice {
  actor(userId);
  const invoice = db.invoices.find(i => i.id === invoiceId);
  if (!invoice) throw new Error('Hóa đơn không tồn tại.');
  return JSON.parse(JSON.stringify(invoice));
}
export function deleteUnpaidInvoice(userId: string, invoiceId: string) {
  const invoice = invoiceDetail(userId, invoiceId);
  if (invoice.paymentStatus === 'paid') throw new Error('Không thể xóa hóa đơn đã thanh toán.');
  db.transaction(data => { data.invoices = data.invoices.filter(i => i.id !== invoiceId); });
}
function editable(userId: string, invoiceId: string) {
  const invoice = invoiceDetail(userId, invoiceId);
  if (!['draft', 'pending'].includes(invoice.paymentStatus)) throw new Error('Đơn đã thanh toán hoặc đã hủy, không thể sửa.');
  return invoice;
}
export function saveDraftItems(userId: string, invoiceId: string, quantities: Record<string, number>, voucherCode = '') {
  const previous = editable(userId, invoiceId);
  const { items, combos, assemblyFee } = buildDraftItems(quantities, previous);
  if (!items.length) {
    db.transaction(data => { data.invoices = data.invoices.filter(i => i.id !== invoiceId); });
    return;
  }
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = voucherCode.trim() ? voucherService.applyVoucher({ voucherCode, subtotal }) : undefined;
  if (discount && !discount.success) throw new Error(discount.error);
  db.transaction(data => {
    const invoice = data.invoices.find(i => i.id === invoiceId)!;
    Object.assign(invoice, { items, combos, assemblyFee, subtotal, discountAmount: discount?.discountAmount || 0,
      voucherCode: discount?.voucherCode, voucherDiscountSnapshot: discount?.discountAmount || 0,
      ...invoiceTotals(subtotal,discount?.discountAmount||0,assemblyFee,previous.taxRate||0), updatedAt: now() });
  });
}
export function addDraftCombo(userId: string, invoiceId: string, frameId: string, lensId: string, quantity: number) {
  const invoice = editable(userId,invoiceId);
  if (!invoice.prescription) throw new Error('Lưu khách hàng và thông số đo mắt trước khi thêm combo.');
  validatePrescription(invoice.prescription);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Số combo phải là số nguyên dương.');
  const frame = db.products.find(p=>p.id===frameId&&!p.isDeleted&&p.productType==='Gọng kính');
  const lens = db.products.find(p=>p.id===lensId&&!p.isDeleted&&p.productType==='Tròng kính');
  if (!frame || !lens) throw new Error('Chọn đúng gọng kính và tròng kính còn hoạt động.');
  const quantities = itemQuantities(invoice.items);
  quantities[frameId] = (quantities[frameId] || 0) + quantity;
  quantities[lensId] = (quantities[lensId] || 0) + quantity;
  const combo = {id:id('COMBO'),frameId,lensId,quantity,framePrice:frame.price,lensPrice:lens.price,
    assemblyUnitFee:ASSEMBLY_UNIT_FEE,prescription:JSON.parse(JSON.stringify(invoice.prescription))};
  const result = buildDraftItems(quantities,invoice,[...(invoice.combos||[]),combo]);
  const subtotal = result.items.reduce((s,i)=>s+i.lineTotal,0);
  const discount = invoice.voucherCode ? voucherService.applyVoucher({voucherCode:invoice.voucherCode,subtotal}) : undefined;
  if (discount && !discount.success) throw new Error(discount.error);
  db.transaction(data=>Object.assign(data.invoices.find(i=>i.id===invoiceId)!, result, {subtotal,discountAmount:discount?.discountAmount||0,
    voucherDiscountSnapshot:discount?.discountAmount||0,...invoiceTotals(subtotal,discount?.discountAmount||0,result.assemblyFee,invoice.taxRate||0),updatedAt:now()}));
}
export function removeDraftCombo(userId: string, invoiceId: string, comboId: string) {
  const invoice = editable(userId,invoiceId), combo = invoice.combos?.find(c=>c.id===comboId);
  if (!combo) throw new Error('Combo không tồn tại.');
  const quantities = itemQuantities(invoice.items);
  for (const id of [combo.frameId,combo.lensId]) { quantities[id] -= combo.quantity; if (!quantities[id]) delete quantities[id]; }
  // Remove the selected allocation first when several combos share components.
  const filtered = {...invoice,combos:invoice.combos?.filter(c=>c.id!==comboId)};
  const result = buildDraftItems(quantities,filtered);
  if (!result.items.length) { deleteUnpaidInvoice(userId,invoiceId); return; }
  const subtotal = result.items.reduce((s,i)=>s+i.lineTotal,0);
  const discount = invoice.voucherCode ? voucherService.applyVoucher({voucherCode:invoice.voucherCode,subtotal}) : undefined;
  if (discount && !discount.success) throw new Error(discount.error);
  db.transaction(data=>Object.assign(data.invoices.find(i=>i.id===invoiceId)!,result,{subtotal,discountAmount:discount?.discountAmount||0,
    voucherDiscountSnapshot:discount?.discountAmount||0,...invoiceTotals(subtotal,discount?.discountAmount||0,result.assemblyFee,invoice.taxRate||0),updatedAt:now()}));
}
export function setDraftCustomer(userId: string, invoiceId: string, customerId: string) {
  const current = editable(userId, invoiceId);
  if (current.combos?.length) throw new Error('Xóa combo trước khi đổi khách hàng hoặc số đo của đơn.');
  const customer = customerId ? db.customers.find(c => c.id === customerId) : undefined;
  if (customerId && !customer) throw new Error('Khách hàng không tồn tại.');
  db.transaction(data => {
    const invoice = data.invoices.find(i => i.id === invoiceId)!;
    Object.assign(invoice, { customerId: customer?.id, customerName: customer?.fullName || 'Khách vãng lai', customerPhone: customer?.phone, updatedAt: now() });
    delete invoice.prescription;
  });
}
// Input limits for the local demo, not medical interpretation or a clinical standard.
export const measurementLimits = { sphere: [-30, 30], cylinder: [-10, 10], axis: [0, 180], pd: [40, 80] } as const;
export function validatePrescription(p: EyePrescription) {
  for (const key of ['sphereRight', 'sphereLeft'] as const)
    if (!Number.isFinite(p[key]) || p[key] < -30 || p[key] > 30) throw new Error('SPH phải là số từ -30 đến 30 theo quy tắc nhập demo.');
  for (const key of ['cylinderRight', 'cylinderLeft'] as const)
    if (!Number.isFinite(p[key]) || p[key] < -10 || p[key] > 10) throw new Error('CYL phải là số từ -10 đến 10 theo quy tắc nhập demo.');
  for (const key of ['axisRight', 'axisLeft'] as const)
    if (!Number.isInteger(p[key]) || p[key] < 0 || p[key] > 180) throw new Error('AXIS phải là số nguyên từ 0 đến 180.');
  if (!Number.isFinite(p.pupillaryDistance) || p.pupillaryDistance < 40 || p.pupillaryDistance > 80)
    throw new Error('PD phải từ 40 đến 80 mm theo quy tắc nhập demo.');
  date(p.measuredAt);
}
export function saveMeasurement(userId: string, invoiceId: string, customerId: string, prescription?: EyePrescription) {
  const current = editable(userId, invoiceId);
  if (current.combos?.length) throw new Error('Xóa combo trước khi đổi khách hàng hoặc số đo của đơn.');
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) throw new Error('Hãy chọn khách hàng có hồ sơ.');
  if (prescription) validatePrescription(prescription);
  db.transaction(data => {
    const invoice = data.invoices.find(i => i.id === invoiceId)!;
    const target = data.customers.find(c => c.id === customerId)!;
    if (prescription) target.prescriptions.push(JSON.parse(JSON.stringify(prescription)));
    target.updatedAt = now();
    Object.assign(invoice, { customerId, customerName: target.fullName, customerPhone: target.phone,
      prescription: prescription ? JSON.parse(JSON.stringify(prescription)) : undefined, updatedAt: now() });
  });
}
export function completeDraft(userId: string, invoiceId: string, paid: boolean, paymentMethod: import('../contracts/domain').InvoicePaymentMethod, idempotencyKey?: string, reference?: string) {
  if(reference!==undefined&&(!reference.trim()||reference.length>80))throw new Error('Mã tham chiếu phải có 1–80 ký tự.');
  if (!['cash', 'transfer', 'card', 'qr'].includes(paymentMethod)) throw new Error('Phương thức thanh toán không hợp lệ.');
  const invoice = editable(userId, invoiceId);
  if (!invoice.items.length) throw new Error('Hãy thêm sản phẩm trước khi lưu đơn chờ hoặc thanh toán.');
  if (invoice.items.some(item => db.products.find(p => p.id === item.productId)?.productType === 'Tròng kính') && !invoice.prescription)
    throw new Error('Đơn có tròng kính cần lưu thông số đo mắt trước khi hoàn tất.');
  const quantities = new Map<string, number>();
  for (const item of invoice.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  if (paid) for (const [productId, quantity] of quantities) {
    const product = db.products.find(p => p.id === productId && !p.isDeleted);
    if (!product || product.stock < quantity) throw new Error('Không đủ tồn kho để thanh toán.');
  }
  const discount = invoice.voucherCode ? voucherService.applyVoucher({ voucherCode: invoice.voucherCode, subtotal: invoice.subtotal }) : undefined;
  if (discount && !discount.success) throw new Error(discount.error);
  db.transaction(data => {
    const target = data.invoices.find(i => i.id === invoiceId)!;
    Object.assign(target, { paymentStatus: paid ? 'paid' : 'pending', paymentMethod, ...(paid?{paidBy:saleActor(userId)}:{}),
      productionStatus: target.prescription ? 'cutting_lens' : 'none', paidAt: paid ? now() : undefined, updatedAt: now(),
      discountAmount: discount?.discountAmount || 0, voucherDiscountSnapshot: discount?.discountAmount || 0,
      ...invoiceTotals(target.subtotal,discount?.discountAmount||0,target.assemblyFee||0,target.taxRate||0) });
    if (paid) {
      if (idempotencyKey) {
        if (data.payments.some(p => p.idempotencyKey === idempotencyKey)) throw new Error('Khóa thanh toán đã được sử dụng.');
        data.payments.push({id: id('PAY'), invoiceId, idempotencyKey, reference:paymentMethod!=='cash'?reference?.trim():undefined, method: paymentMethod, amount: target.totalAmount, createdAt: now()});
      }
      for (const product of data.products) product.stock -= quantities.get(product.id) || 0;
      const voucher = data.vouchers.find(v => v.code === target.voucherCode);
      if (voucher) voucher.usageCount++;
    }
  });
}
export function createVoucher(userId: string, input: Omit<Voucher, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) {
  actor(userId, true);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Mã voucher cần 3–32 ký tự chữ, số, _ hoặc -.');
  if (!input.name.trim()) throw new Error('Tên voucher không được trống.');
  if (db.vouchers.some(v => v.code.trim().toUpperCase() === code)) throw new Error('Mã voucher đã tồn tại.');
  if (!['fixed', 'percentage'].includes(input.discountType) || !Number.isFinite(input.discountValue) || input.discountValue <= 0 || (input.discountType === 'percentage' && input.discountValue > 100))
    throw new Error('Mức giảm không hợp lệ (% phải lớn hơn 0 và không quá 100).');
  if (!Number.isFinite(input.minOrderValue) || input.minOrderValue < 0 || (input.maxDiscountAmount !== undefined && (!Number.isFinite(input.maxDiscountAmount) || input.maxDiscountAmount <= 0)))
    throw new Error('Giá trị đơn tối thiểu hoặc trần giảm không hợp lệ.');
  if (date(input.startDate) > date(input.endDate)) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  const voucher: Voucher = { ...input, code, name: input.name.trim(), id: id('VOU'), usageCount: 0, createdAt: now(), updatedAt: now() };
  db.transaction(data => { data.vouchers.push(voucher); });
  return voucher;
}
export function customerList(userId: string, query = '') {
  actor(userId);
  const normalized = query.trim().toLocaleLowerCase();
  return db.customers.filter(c => `${c.fullName} ${c.phone} ${c.customerCode} ${c.email || ''}`.toLocaleLowerCase().includes(normalized))
    .map(customer => {
      const paid = db.invoices.filter(i => i.customerId === customer.id && i.paymentStatus === 'paid');
      return { ...customer, purchaseCount: paid.length, lastPurchase: paid.map(i => i.paidAt || i.createdAt).sort().at(-1) };
    });
}
export function editEmployee(userId: string, employeeId: string, input: Pick<Employee, 'fullName' | 'email' | 'phone' | 'position' | 'shift' | 'branch'> & { role?: User['role'] }) {
  actor(userId, true);
  const employee = db.employees.find(e => e.id === employeeId);
  if (!employee) throw new Error('Nhân viên không tồn tại.');
  const email = input.email.trim().toLowerCase();
  if (!input.fullName.trim() || !input.position.trim() || !/^\d{9,11}$/.test(input.phone.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Hãy nhập họ tên, vị trí, email và số điện thoại 9–11 chữ số hợp lệ.');
  if (input.role && !['admin', 'employee'].includes(input.role)) throw new Error('Vai trò không hợp lệ.');
  if (db.employees.some(e => e.id !== employeeId && e.email.toLowerCase() === email) || db.users.some(u => u.id !== employee.userId && u.email.toLowerCase() === email))
    throw new Error('Email đã được sử dụng.');
  const linkedUser = db.users.find(u => u.id === employee.userId);
  if (input.role && !linkedUser) throw new Error('Nhân viên chưa có tài khoản liên kết.');
  if (linkedUser?.id === userId && input.role && input.role !== 'admin') throw new Error('Không tự hạ quyền quản trị của phiên đang dùng.');
  db.transaction(data => {
    Object.assign(data.employees.find(e => e.id === employeeId)!, { email, fullName: input.fullName.trim(), phone: input.phone.trim(), position: input.position.trim(), shift: input.shift?.trim(), branch: input.branch?.trim() });
    const user = data.users.find(u => u.id === employee.userId);
    if (user) Object.assign(user, { email, role: input.role || user.role, updatedAt: now() });
  });
}
