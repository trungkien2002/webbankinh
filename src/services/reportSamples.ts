import { db } from './database';
import catalog from '../../data/local-database.json';
import { Customer, Invoice, InvoiceItem, InvoicePaymentMethod, Product, SaleActorSnapshot } from '../contracts/domain';
import { invoiceTotals } from './invoice-totals';

const marker = 'elan_report_samples_v1';
const names = ['Nguyễn Minh Anh', 'Trần Bảo Ngọc', 'Lê Minh Khang', 'Phạm Hà Linh', 'Đỗ Gia Huy', 'Vũ Ngọc Mai', 'Bùi Tuấn Anh', 'Hoàng Thu Trang', 'Đặng Hải Nam', 'Ngô Phương Thảo', 'Đinh Quang Minh', 'Dương Khánh Linh'];
const emails = ['minhanh', 'baongoc', 'minhkhang', 'halinh', 'giahuy', 'ngocmai', 'tuananh', 'thutrang', 'hainam', 'phuongthao', 'quangminh', 'khanhlinh'];
const stamp = '2026-10-01T02:00:00.000Z';
export const reportSampleCustomers: Customer[] = names.map((fullName, i) => ({
  id: i < 2 ? `CUS00${i + 1}` : `SAMPLE_CUS_${i + 1}`,
  customerCode: i < 2 ? `KH000${i + 1}` : `KHM${String(i + 1).padStart(3, '0')}`,
  fullName, email: `${emails[i]}@example.com`, phone: i === 0 ? '0384756291' : i === 1 ? '0796328145' : `09900000${String(i + 1).padStart(2, '0')}`,
  address: `Đường Hoa Ban, khu dân cư minh họa ${i + 1}`,
  prescriptions: [], createdAt: stamp, updatedAt: stamp,
}));

// Dữ liệu lịch sử hư cấu để trình bày; tồn kho hiện có không bị trừ lần nữa.
export function prepareReportSamples() {
  if (typeof localStorage === 'undefined' || localStorage.getItem(marker)) return;
  db.transaction(data => {
    const customers = reportSampleCustomers.map(sample => {
      const existing = data.customers.find(c => c.id === sample.id || c.email?.toLowerCase() === sample.email || c.phone === sample.phone);
      if (existing) return existing;
      const copy = JSON.parse(JSON.stringify(sample)) as Customer;
      data.customers.push(copy);
      return copy;
    });
    const types = ['Gọng kính', 'Tròng kính', 'Kính râm', 'Phụ kiện'];
    const products = catalog.products as Product[];
    const methods: InvoicePaymentMethod[] = ['cash', 'transfer', 'qr', 'card'];
    for (let i = 0; i < 48; i++) {
      const id = `SAMPLE_INV_${String(i + 1).padStart(3, '0')}`;
      if (data.invoices.some(invoice => invoice.id === id)) continue;
      const customer = customers[i % customers.length];
      const online = i % 3 === 2;
      const employee = data.employees[i % Math.max(data.employees.length, 1)];
      const user = data.users.find(u => u.id === employee?.userId);
      const actor: SaleActorSnapshot | undefined = !online && user && employee ? { userId: user.id, account: user.username, employeeName: employee.fullName } : undefined;
      const items: InvoiceItem[] = Array.from({ length: i % 3 === 0 ? 2 : 1 }, (_, j) => {
        const candidates = products.filter(p => p.productType === types[(i + j) % types.length]);
        const product = candidates[Math.floor(i / 4) % candidates.length];
        const quantity = j === 0 && i % 7 === 0 ? 2 : 1;
        return { id: `${id}_LINE_${j}`, productId: product.id, productName: product.name, sku: product.sku, productTypeSnapshot: product.productType, quantity, unitPrice: product.price, lineTotal: product.price * quantity };
      });
      // 36 đơn paid phân bố suốt 07–27/10, 8 đơn pending, 4 đơn cancelled.
      const paymentStatus = i % 12 === 11 ? 'cancelled' : i % 6 === 4 ? 'pending' : 'paid';
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const discountAmount = i % 5 === 0 ? Math.min(50000, subtotal) : 0;
      const joined = new Date(customer.createdAt);
      const joinedDay = joined.getUTCFullYear() === 2026 && joined.getUTCMonth() === 9 ? joined.getUTCDate() : 1;
      const day = Math.max(joinedDay, 7 + Math.floor(i * 21 / 48));
      const createdAt = new Date(Date.UTC(2026, 9, day, 2 + i % 10, i * 7 % 60)).toISOString();
      const paidAt = paymentStatus === 'paid' ? new Date(Date.parse(createdAt) + (5 + i % 20) * 60000).toISOString() : undefined;
      let invoiceCode = `HDM${String(i + 1).padStart(4, '0')}`;
      while (data.invoices.some(invoice => invoice.invoiceCode === invoiceCode)) invoiceCode += 'M';
      const invoice: Invoice = {
        id, invoiceCode, customerId: customer.id, customerName: customer.fullName, customerPhone: customer.phone,
        employeeId: online ? 'ONLINE' : employee?.id || 'ONLINE', employeeName: online ? 'Cửa hàng trực tuyến' : employee?.fullName || 'Cửa hàng trực tuyến',
        createdBy: actor, paidBy: paymentStatus === 'paid' ? actor : undefined,
        items, subtotal, discountAmount, assemblyFee: 0, ...invoiceTotals(subtotal, discountAmount, 0, 10),
        paymentMethod: methods[(Math.floor(i / 3) + i) % methods.length], paymentStatus,
        productionStatus: paymentStatus === 'paid' ? i % 2 === 0 ? 'delivered' : 'completed' : 'none',
        createdAt, paidAt, updatedAt: paidAt || createdAt,
        notes: `Dữ liệu minh họa báo cáo.${online ? ` Giao đến: ${customer.address || 'Địa chỉ minh họa'}` : ''}`,
      };
      data.invoices.push(invoice);
      if (paidAt) data.payments.push({ id: `${id}_PAY`, invoiceId: id, idempotencyKey: `${id}_PAY`, method: invoice.paymentMethod, amount: invoice.totalAmount, createdAt: paidAt });
    }
  });
  localStorage.setItem(marker, '1');
}
