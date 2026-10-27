import { Invoice } from '../contracts/domain';

export function nextInvoiceCode(invoices: Pick<Invoice, 'invoiceCode'>[]): string {
  const used = new Set(invoices.map(invoice => invoice.invoiceCode));
  let number = invoices.length + 1;
  while (used.has(`HD${String(number).padStart(4, '0')}`)) number++;
  return `HD${String(number).padStart(4, '0')}`;
}
