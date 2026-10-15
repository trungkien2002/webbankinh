import { db } from './database';

const identities = [
  { fullName: 'Nguyễn Minh Anh', phone: '0384756291', email: 'minhanh@example.com', address: 'Đường Hoa Ban, Phường Bình An, TP. Hồ Chí Minh' },
  { fullName: 'Trần Bảo Ngọc', phone: '0796328145', email: 'baongoc@example.com', address: 'Đường Ngọc Lan, Phường Tân An, Đà Nẵng' },
  { fullName: 'Lê Minh Khang', phone: '0862941573', email: 'minhkhang@example.com', address: 'Đường Thanh Trúc, Phường An Phú, TP. Hồ Chí Minh' },
  { fullName: 'Phạm Hà Linh', phone: '0327486195', email: 'halinh@example.com', address: 'Đường Mộc Lan, Phường Bình Minh, Hà Nội' },
];
// Đổi nhãn dữ liệu dựng thử sang thông tin hư cấu, giữ ID và quan hệ hóa đơn.
export function preparePresentationData() {
  if (typeof localStorage === 'undefined' || localStorage.getItem('elan_presentation_v5')) return;
  db.transaction(data => {
    let index = 2;
    for (const customer of data.customers) {
      const identity = customer.id === 'CUS001' ? identities[0] : customer.id === 'CUS002' ? identities[1] : /kiểm|test|0530|05:30|demo/i.test(customer.fullName + ' ' + customer.email) ? identities[index++ % identities.length] : null;
      if (!identity) continue;
      Object.assign(customer, identity);
      for (const invoice of data.invoices.filter(v => v.customerId === customer.id)) Object.assign(invoice, { customerName: identity.fullName, customerPhone: identity.phone });
    }
    let nextSku = 51;
    for (const product of data.products.filter(v => /kiểm thử|kiểm tra|test|demo/i.test(v.name))) {
      while (data.products.some(v => v.id !== product.id && v.sku === `EL${String(nextSku).padStart(4, '0')}`)) nextSku++;
      product.name = 'Gọng kính Aurora'; product.sku = `EL${String(nextSku++).padStart(4, '0')}`; product.brand = 'Élan';
      for (const invoice of data.invoices) for (const item of invoice.items.filter(v => v.productId === product.id)) { item.productName = product.name; item.sku = product.sku; }
    }
    for (const voucher of data.vouchers.filter(v => /kiểm|test|demo|merge/i.test(v.name))) voucher.name = 'Ưu đãi thành viên mùa thu';
    for (const invoice of data.invoices) if (invoice.notes && /kiểm thử|test|demo/i.test(invoice.notes)) invoice.notes = 'Giao hàng trong giờ hành chính.';
  });
  localStorage.setItem('elan_presentation_v5', '1');
}
