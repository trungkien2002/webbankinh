import React from 'react';
import { Text, View } from 'react-native';
import { Invoice } from '../contracts/domain';
import { InvoiceListFilter, invoiceList, vietnamInvoiceDate } from '../services/invoice-list';
import { Button, Table, money, ui } from './ui';

export function InvoiceList({ actorId, filter, onDetail, onOpen, onDelete, onPay }: {
  actorId: string; filter: InvoiceListFilter;
  onDetail: (id: string) => void; onOpen: (invoice: Invoice) => void;
  onDelete: (id: string) => void; onPay: (id: string) => void;
}) {
  let result;
  try { result = invoiceList(actorId, filter); }
  catch (e) { return <Text accessibilityRole="alert" style={ui.error}>{(e as Error).message}</Text>; }
  const labels = { draft: 'Đơn nháp', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', cancelled: 'Đã hủy' };
  return <View style={{ gap: 14 }}>
    <Text selectable style={ui.h2}>Đã thu: {money(result.paidRevenue)}</Text>
    <Text style={ui.muted}>{result.paidCount} đơn đã thanh toán / {result.invoices.length} đơn trong toàn bộ kết quả lọc (tất cả các trang). Lọc thời gian theo ngày tạo; chỉ đơn paid được cộng vào tổng thu.</Text>
    <Table key={JSON.stringify(filter)} headings={['Hóa đơn', 'Ngày tạo (giờ VN)', 'Khách hàng', 'Thành tiền', 'Trạng thái', 'Thao tác']}
      rows={result.invoices.map(invoice => [invoice.invoiceCode, vietnamInvoiceDate(invoice.createdAt),
        invoice.customerName || 'Khách vãng lai', money(invoice.totalAmount), labels[invoice.paymentStatus],
        <View style={ui.row}>
          <Button onPress={() => onDetail(invoice.id)}>Chi tiết</Button>
          {['draft', 'pending'].includes(invoice.paymentStatus) && <Button onPress={() => onOpen(invoice)}>Mở tại quầy</Button>}
          {invoice.paymentStatus !== 'paid' && <Button onPress={() => onDelete(invoice.id)}>Xóa</Button>}
          {invoice.paymentStatus === 'pending' && <Button onPress={() => onPay(invoice.id)}>Thanh toán</Button>}
        </View>,
      ])} />
  </View>;
}
