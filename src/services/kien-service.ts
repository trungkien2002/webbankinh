import { Invoice, ProductType } from '../contracts/domain';
import { db } from './database';
import { foldText } from './hoan-service';

export function staff(actorId: string, admin = false) {
  const user = db.users.find(u => u.id === actorId && u.isActive);
  if (!user || (admin && user.role !== 'admin')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
  return user;
}
export type CategorySort = 'name-asc' | 'name-desc' | 'newest';
export async function listCategories(actorId: string, query: string, sort: CategorySort) {
  staff(actorId);
  const q = foldText(query);
  return db.categories.filter(c => !c.isDeleted && foldText(`${c.name} ${c.description}`).includes(q))
    .sort((a, b) => sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
      : (sort === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id));
}
export function validateBarcode(value: string, productId?: string) {
  const barcode = value.trim();
  if (barcode && !/^[A-Za-z0-9_-]{1,48}$/.test(barcode)) throw new Error('Mã vạch gồm 1–48 chữ, số, dấu _ hoặc -.');
  if (barcode && db.products.some(p => !p.isDeleted && p.id !== productId && p.barcode?.toUpperCase() === barcode.toUpperCase()))
    throw new Error('Mã vạch đã gắn với sản phẩm khác.');
  return barcode;
}
export function assignBarcode(actorId: string, productId: string, value: string) {
  staff(actorId, true);
  if (!db.products.some(p => p.id === productId && !p.isDeleted)) throw new Error('Sản phẩm không tồn tại.');
  const barcode = validateBarcode(value, productId);
  if (!barcode) throw new Error('Nhập mã vạch trước khi lưu.');
  db.transaction(data => Object.assign(data.products.find(p => p.id === productId)!, { barcode, updatedAt: new Date().toISOString() }));
}
export function vnDay(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)
    throw new Error('Ngày không hợp lệ.');
  return value;
}
export type RevenueGroup = ProductType | 'Combo' | 'Khác';
export function revenueReport(actorId: string, from: string, to: string, period: 'day' | 'month' | 'year' = 'day') {
  staff(actorId, true);
  if (validDay(from) > validDay(to)) throw new Error('Từ ngày phải trước hoặc bằng đến ngày.');
  if (!['day','month','year'].includes(period)) throw new Error('Kỳ báo cáo không hợp lệ.');
  const invoices = db.invoices.filter(i => i.paymentStatus === 'paid' && vnDay(i.createdAt) >= from && vnDay(i.createdAt) <= to);
  const groups: Record<RevenueGroup, number> = { 'Gọng kính':0, 'Tròng kính':0, 'Kính râm':0, 'Phụ kiện':0, Combo:0, 'Khác':0 };
  const timeline = new Map<string, number>();
  for (const inv of invoices) {
    const key = vnDay(inv.createdAt).slice(0, period === 'day' ? 10 : period === 'month' ? 7 : 4);
    timeline.set(key, (timeline.get(key) || 0) + inv.totalAmount);
    const buckets = new Map<RevenueGroup, number>();
    for (const line of inv.items) {
      const type: RevenueGroup = line.comboId ? 'Combo' : line.productTypeSnapshot || db.products.find(p => p.id === line.productId)?.productType || 'Khác';
      buckets.set(type, (buckets.get(type) || 0) + line.lineTotal);
    }
    const base = [...buckets.values()].reduce((a,b) => a+b,0);
    let allocated = 0;
    const entries = [...buckets.entries()];
    entries.forEach(([type, amount], index) => {
      const net = index === entries.length - 1 ? inv.totalAmount - (inv.assemblyFee || 0) - allocated : base ? Math.round((inv.totalAmount - (inv.assemblyFee || 0)) * amount / base) : 0;
      groups[type] += net; allocated += net;
    });
    if (!entries.length) groups['Khác'] += inv.totalAmount;
    else groups.Combo += inv.assemblyFee || 0;
  }
  return { from, to, period, invoices, groups, total: invoices.reduce((s,i) => s+i.totalAmount,0),
    timeline: [...timeline].sort(([a],[b]) => a.localeCompare(b)).map(([label,value]) => ({label,value})) };
}
export function revenueRows(report: ReturnType<typeof revenueReport>): (string | number)[][] {
  return [['Báo cáo doanh thu Élan', report.from, report.to], ['Cơ sở', 'Ngày tạo hóa đơn (giờ Việt Nam); chỉ đơn đã thanh toán'],
    ['Tổng thu', report.total], [], ['Kỳ','Doanh thu'], ...report.timeline.map(r => [r.label,r.value]), [],
    ['Nhóm sản phẩm','Doanh thu sau phân bổ giảm giá'], ...Object.entries(report.groups), [],
    ['Hóa đơn','Ngày tạo (VN)','Thành tiền'], ...report.invoices.map((i: Invoice) => [i.invoiceCode,vnDay(i.createdAt),i.totalAmount])];
}
