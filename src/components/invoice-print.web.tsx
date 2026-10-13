import { Invoice } from '../contracts/domain';
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;
export async function printInvoice(invoice: Invoice): Promise<void> {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Trình duyệt chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
  const p = invoice.prescription;
  const measured = p ? `<h2>Thông số đo mắt</h2><table><tr><th>Mắt</th><th>SPH</th><th>CYL</th><th>AXIS</th></tr><tr><td>Phải</td><td>${p.sphereRight}</td><td>${p.cylinderRight}</td><td>${p.axisRight}</td></tr><tr><td>Trái</td><td>${p.sphereLeft}</td><td>${p.cylinderLeft}</td><td>${p.axisLeft}</td></tr></table><p>PD: ${p.pupillaryDistance} mm · Ngày đo: ${escape(p.measuredAt)}</p>` : '<p>Không có thông số đo mắt.</p>';
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escape(invoice.invoiceCode)}</title><style>body{font:16px Arial;color:#202922;max-width:800px;margin:32px auto}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:12px;text-align:left}h1{color:#284e43}@media print{body{margin:0}}</style></head><body><h1>ÉLAN / STUDIO</h1><h2>Hóa đơn ${escape(invoice.invoiceCode)}</h2><p>Ngày: ${escape(invoice.createdAt)} · Trạng thái: ${escape(invoice.paymentStatus)}</p><p>Khách: ${escape(invoice.customerName || 'Khách vãng lai')} · ${escape(invoice.customerPhone)}</p><p>Nhân viên: ${escape(invoice.employeeName)}</p><table><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>${invoice.items.map(i => `<tr><td>${escape(i.productName)} (${escape(i.sku)})</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(i.lineTotal)}</td></tr>`).join('')}</table><p>Tạm tính: ${money(invoice.subtotal)}</p><p>Giảm giá: ${money(invoice.discountAmount)} · ${escape(invoice.voucherCode)}</p><h2>Tổng: ${money(invoice.totalAmount)}</h2><p>Phương thức: ${invoice.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} · Ngày thanh toán: ${escape(invoice.paidAt || 'Chưa thanh toán')}</p><p>Trạng thái gia công: ${escape(invoice.productionStatus)}</p>${measured}<p>${escape(p?.notes || invoice.notes)}</p><p>Bản demo cục bộ.</p></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}
