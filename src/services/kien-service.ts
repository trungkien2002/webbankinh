import {saleTrace,saleTime,paymentNames} from './sale-trace';
import {validateBarcode} from './barcode-validation';
export {validateBarcode} from './barcode-validation';
import { Invoice, ProductType } from '../contracts/domain';
import { db } from './database';
import { foldText } from './hoan-service';

export function staff(actorId: string, admin = false) {
  const user = db.users.find(u => u.id === actorId && u.isActive);
  if (!user || (admin && user.role !== 'admin')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
  return user;
}
export type CategorySort = 'name-asc' | 'name-desc' | 'newest';
export async function listCategories(actorId: string, query: string, sort: CategorySort, material = '') {
  staff(actorId);
  const q = foldText(query);
  return db.categories.filter(c => !c.isDeleted && foldText(`${c.name} ${c.description} ${c.material||''}`).includes(q) && (!material||foldText(c.material||'').includes(foldText(material))))
    .sort((a, b) => sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
      : (sort === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id));
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
export type RevenueGroup = ProductType | 'Combo' | 'Khác' | 'Thuế';
export function revenueReport(actorId: string, from: string, to: string, period: 'day' | 'month' | 'year' = 'day', query = '') {
  staff(actorId, true);
  if (validDay(from) > validDay(to)) throw new Error('Từ ngày phải trước hoặc bằng đến ngày.');
  if (!['day','month','year'].includes(period)) throw new Error('Kỳ báo cáo không hợp lệ.');
  const q=foldText(query);
  const invoices = db.invoices.filter(i => {const t=saleTrace(i);return i.paymentStatus==='paid'&&vnDay(i.createdAt)>=from&&vnDay(i.createdAt)<=to&&(!q||foldText([i.invoiceCode,t.customer,t.phone,t.seller,t.account,t.collector,t.collectorAccount].join(' ')).includes(q));}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
  const groups: Record<RevenueGroup, number> = { 'Gọng kính':0, 'Tròng kính':0, 'Kính râm':0, 'Phụ kiện':0, Combo:0, 'Khác':0, 'Thuế':0 };
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
      const net = index === entries.length - 1 ? inv.totalAmount - (inv.assemblyFee || 0) - (inv.taxAmount || 0) - allocated : base ? Math.round((inv.totalAmount - (inv.assemblyFee || 0) - (inv.taxAmount || 0)) * amount / base) : 0;
      groups[type] += net; allocated += net;
    });
    if (!entries.length) groups['Khác'] += inv.totalAmount;
    else {groups.Combo += inv.assemblyFee || 0;groups['Thuế'] += inv.taxAmount || 0;}
  }
  return { from, to, period, query, invoices, groups, total: invoices.reduce((s,i) => s+i.totalAmount,0),
    timeline: [...timeline].sort(([a],[b]) => a.localeCompare(b)).map(([label,value]) => ({label,value})) };
}
export function revenueRows(report: ReturnType<typeof revenueReport>): (string | number)[][] {
  return [['Báo cáo doanh thu Élan', report.from, report.to], ['Cơ sở', 'Ngày tạo hóa đơn (giờ Việt Nam); chỉ đơn đã thanh toán'],
    ['Từ khóa',report.query], ['Tổng thu', report.total], [], ['Kỳ','Doanh thu'], ...report.timeline.map(r => [r.label,r.value]), [],
    ['Nhóm sản phẩm','Doanh thu sau phân bổ giảm giá'], ...Object.entries(report.groups), [],
    ['Hóa đơn','Tạo lúc (VN)','Thanh toán lúc (VN)','Kênh bán','Nhân viên lập','Tài khoản lập','Nhân viên thu','Tài khoản thu','Khách hàng','Điện thoại','Phương thức','Tiền hàng','Giảm giá','Công mài','Thuế','Tổng thu'],
    ...report.invoices.map((i:Invoice)=>{const t=saleTrace(i);return [i.invoiceCode,saleTime(i.createdAt),saleTime(i.paidAt),t.channel,t.seller,t.account,t.collector,t.collectorAccount,t.customer,t.phone,paymentNames[i.paymentMethod],i.subtotal,i.discountAmount,i.assemblyFee||0,i.taxAmount||0,i.totalAmount];})];
}
