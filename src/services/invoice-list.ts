import { Invoice } from '../contracts/domain';
import { invoiceService } from './invoiceService';
import { db } from './database';

export type InvoiceListFilter = Parameters<typeof invoiceService.filterInvoices>[0];

export function invoiceList(actorId: string, filter: InvoiceListFilter = {}) {
  if (!db.users.some(user => user.id === actorId && user.isActive)) throw new Error('Phiên nhân viên không hợp lệ.');
  // Reuse HD004's filter as the single source for both table and totals.
  const invoices = [...invoiceService.filterInvoices(filter)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const paid = invoices.filter(invoice => invoice.paymentStatus === 'paid');
  return { invoices, paidCount: paid.length, paidRevenue: paid.reduce((sum, invoice) => sum + invoice.totalAmount, 0) };
}

export function vietnamInvoiceDate(value: Invoice['createdAt']) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Ngày không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}
