import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Customer, EyePrescription, Invoice, InvoicePaymentMethod, Product, User } from '../contracts/domain';
import { db } from '../services/database';
import {
  commitCategoryImport,
  commitProductImport,
  importKeyFor,
  payInvoice,
  previewCategoryImport,
  previewProductImport,
  setUserLocked,
  softDeleteProduct,
  updateCustomer,
  vietQrPayload,
} from '../services/hoan-service';
import { sheetFromBuffer } from '../services/excel-workbook';
import { downloadExcelTemplate, pickExcelFile } from './excel-file';
import { printInvoice } from './invoice-print';
import { Button, Choice, Field, Sheet, Table, money, ui } from './ui';

export type HoanAction = 'category-import' | 'product-import' | 'product-delete' | 'pay' | 'customer-edit' | 'user-lock';

export function HoanDialog({
  action,
  targetId = '',
  userId,
  onClose,
  onSaved,
}: {
  action: HoanAction;
  targetId?: string;
  userId: string;
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const product = db.products.find(p => p.id === targetId);
  const invoice = db.invoices.find(i => i.id === targetId);
  const customer = db.customers.find(c => c.id === targetId);
  const employee = db.employees.find(e => e.id === targetId);
  const linked = db.users.find(u => u.id === employee?.userId);
  const initialForm = (): Record<string, string> => {
    if (action === 'customer-edit' && customer) {
      return {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        addRx: 'no',
        measuredAt: new Date().toISOString().slice(0, 10),
      };
    }
    if (action === 'pay') return { method: 'cash', cashReceived: String(invoice?.totalAmount || 0) };
    return {};
  };
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ valid: unknown[]; errors: { line: number; message: string }[] } | null>(null);
  const locked = useRef(false);
  const paymentKey = useRef(crypto.randomUUID());
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const run = async (operation: () => void | Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu dữ liệu.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const titles: Record<HoanAction, string> = {
    'category-import': 'Nhập phân loại từ Excel',
    'product-import': 'Nhập mã vạch / lô từ Excel',
    'product-delete': 'Xóa sản phẩm kính',
    pay: 'Thanh toán hóa đơn',
    'customer-edit': 'Sửa thông tin khách hàng',
    'user-lock': 'Khóa / mở tài khoản nhân viên',
  };
  const pick = () => run(async () => {
    const buffer = await pickExcelFile();
    const sheet = sheetFromBuffer(buffer);
    setPreview(action === 'category-import' ? previewCategoryImport(userId, sheet) : previewProductImport(userId, sheet));
  });
  const commitImport = () => run(async () => {
    if (!preview) throw new Error('Hãy chọn file Excel trước.');
    if (!preview.valid.length) throw new Error('Không có dòng hợp lệ để nhập.');
    const key = importKeyFor(action, preview.valid);
    const result = action === 'category-import'
      ? commitCategoryImport(userId, preview.valid as { name: string; description: string; material?: string }[], key)
      : commitProductImport(userId, preview.valid as { sku: string; barcode?: string; quantity: number; lot?: string }[], key);
    onSaved(result.duplicate ? 'File này đã được nhập trước đó, tồn kho không tăng lần hai.' : `Đã nhập ${result.imported} dòng.`);
  });
  const content = () => {
    if (action === 'category-import' || action === 'product-import') {
      return <>
        <Text style={ui.muted}>Chọn file Excel, xem trước rồi ghi. Dòng lỗi báo số dòng; dòng hợp lệ mới được nhập. Gửi lại cùng nội dung không tăng tồn hai lần.</Text>
        <Button onPress={() => downloadExcelTemplate(action === 'category-import' ? 'category' : 'product')}>Tải file mẫu</Button>
        <Button onPress={pick}>Chọn file Excel</Button>
        {preview && <>
          <Text style={ui.text}>{preview.valid.length} dòng hợp lệ · {preview.errors.length} dòng lỗi</Text>
          {!!preview.errors.length && <Table headings={['Dòng', 'Lỗi']} rows={preview.errors.map(e => [String(e.line), e.message])} />}
          <Button primary disabled={busy || !preview.valid.length} onPress={commitImport}>{busy ? 'Đang nhập…' : 'Nhập các dòng hợp lệ'}</Button>
        </>}
      </>;
    }
    if (action === 'product-delete') {
      const billed = db.invoices.some(i => i.items.some(line => line.productId === product?.id));
      return <>
        <Text style={ui.text}>Ẩn sản phẩm “{product?.name}” khỏi danh mục bán mới? {billed ? 'Sản phẩm đã có hóa đơn: lịch sử và giá trên đơn cũ được giữ.' : 'Chưa có hóa đơn liên quan.'}</Text>
        <Button primary disabled={busy} onPress={() => run(() => {
          softDeleteProduct(userId, targetId);
          onSaved('Đã ngừng bán sản phẩm.');
        })}>Xác nhận xóa mềm</Button>
      </>;
    }
    if (action === 'pay' && invoice) {
      const method = (form.method || 'cash') as InvoicePaymentMethod;
      const payload = vietQrPayload(invoice);
      return <>
        <Text style={ui.h2}>{invoice.invoiceCode} · {money(invoice.totalAmount)}</Text>
        <Choice label="Hình thức" value={method} onChange={value => set('method', value)} options={[
          { label: 'Tiền mặt', value: 'cash' },
          { label: 'QR VietQR', value: 'qr' },
          { label: 'Thẻ', value: 'card' },
          { label: 'Chuyển khoản', value: 'transfer' },
        ]} />
        {method === 'cash' && <>
          <Field label="Tiền khách đưa" value={form.cashReceived || ''} onChange={value => set('cashReceived', value)} numeric />
          {Number(form.cashReceived) >= invoice.totalAmount && (
            <Text style={ui.muted}>Tiền thừa: {money(Number(form.cashReceived) - invoice.totalAmount)}</Text>
          )}
        </>}
        {method === 'qr' && <Text selectable style={ui.muted}>VietQR theo số tiền đơn (demo, ngân hàng không xác nhận):{'\n'}{payload}</Text>}
        {method === 'card' && <Text style={ui.muted}>Xác nhận thẻ trên máy demo. Không gọi cổng thanh toán thật.</Text>}
        <Button primary disabled={busy} onPress={() => run(async () => {
          const paid = payInvoice(userId, invoice.id, {
            method,
            cashReceived: method === 'cash' ? Number(form.cashReceived) : undefined,
            idempotencyKey: paymentKey.current,
          });
          try { await printInvoice(paid); } catch { /* In có thể bị chặn popup; đơn vẫn đã thanh toán. */ }
          onSaved(`Đã thanh toán ${paid.invoiceCode}.`);
        })}>{busy ? 'Đang thanh toán…' : 'Xác nhận thanh toán & in'}</Button>
      </>;
    }
    if (action === 'customer-edit' && customer) {
      return <>
        <Field label="Họ tên" value={form.fullName || ''} onChange={value => set('fullName', value)} />
        <Field label="Số điện thoại" value={form.phone || ''} onChange={value => set('phone', value)} />
        <Field label="Email" value={form.email || ''} onChange={value => set('email', value)} />
        <Field label="Địa chỉ" value={form.address || ''} onChange={value => set('address', value)} />
        <Choice label="Thêm phiếu đo mới?" value={form.addRx || 'no'} onChange={value => set('addRx', value)} options={[{ label: 'Không', value: 'no' }, { label: 'Có', value: 'yes' }]} />
        {form.addRx === 'yes' && <>
          <Text style={ui.muted}>Phiếu mới được thêm vào lịch sử, không ghi đè lần đo đã gắn hóa đơn cũ.</Text>
          <Field label="SPH phải" value={form.sphereRight || ''} onChange={value => set('sphereRight', value)} />
          <Field label="CYL phải" value={form.cylinderRight || ''} onChange={value => set('cylinderRight', value)} />
          <Field label="AXIS phải" value={form.axisRight || ''} onChange={value => set('axisRight', value)} />
          <Field label="SPH trái" value={form.sphereLeft || ''} onChange={value => set('sphereLeft', value)} />
          <Field label="CYL trái" value={form.cylinderLeft || ''} onChange={value => set('cylinderLeft', value)} />
          <Field label="AXIS trái" value={form.axisLeft || ''} onChange={value => set('axisLeft', value)} />
          <Field label="PD (mm)" value={form.pupillaryDistance || ''} onChange={value => set('pupillaryDistance', value)} />
          <Field label="Ngày đo" value={form.measuredAt || ''} onChange={value => set('measuredAt', value)} />
          <Field label="Ghi chú" value={form.notes || ''} onChange={value => set('notes', value)} />
        </>}
        <Button primary disabled={busy} onPress={() => run(() => {
          let prescription: EyePrescription | undefined;
          if (form.addRx === 'yes') {
            const keys = ['sphereRight', 'sphereLeft', 'cylinderRight', 'cylinderLeft', 'axisRight', 'axisLeft', 'pupillaryDistance'];
            if (keys.some(key => !form[key]?.trim())) throw new Error('Nhập đủ thông số hai mắt và PD.');
            prescription = {
              sphereRight: Number(form.sphereRight), sphereLeft: Number(form.sphereLeft),
              cylinderRight: Number(form.cylinderRight), cylinderLeft: Number(form.cylinderLeft),
              axisRight: Number(form.axisRight), axisLeft: Number(form.axisLeft),
              pupillaryDistance: Number(form.pupillaryDistance), measuredAt: form.measuredAt, notes: form.notes,
            };
          }
          updateCustomer(userId, customer.id, { fullName: form.fullName || '', phone: form.phone || '', email: form.email, address: form.address }, prescription);
          onSaved('Đã cập nhật khách hàng.');
        })}>Lưu</Button>
      </>;
    }
    if (action === 'user-lock' && linked) {
      return <>
        <Text style={ui.text}>{employee?.fullName} · {linked.email}{'\n'}Trạng thái: {linked.isActive ? 'Đang hoạt động' : 'Đã khóa'}</Text>
        <Text style={ui.muted}>Khóa sẽ thu hồi phiên đăng nhập ngay. Hóa đơn cũ vẫn giữ tên người lập.</Text>
        <Button primary disabled={busy} onPress={() => run(() => {
          setUserLocked(userId, linked.id, linked.isActive);
          onSaved(linked.isActive ? 'Đã khóa tài khoản và thu hồi phiên.' : 'Đã mở khóa tài khoản.');
        })}>{linked.isActive ? 'Khóa tài khoản' : 'Mở khóa'}</Button>
      </>;
    }
    return <Text style={ui.error}>Không tìm thấy đối tượng.</Text>;
  };
  return <Sheet title={titles[action]} onClose={() => { if (!busy) onClose(); }}>
    {content()}
    <Text selectable style={ui.error}>{error}</Text>
  </Sheet>;
}

export function PaymentHint({ product }: { product?: Product }) {
  return product ? <Text style={ui.muted}>{product.name}</Text> : null;
}

export function CustomerHint({ customer }: { customer?: Customer }) {
  return customer ? <Text style={ui.muted}>{customer.fullName}</Text> : null;
}

export function UserHint({ user }: { user?: User }) {
  return user ? <Text style={ui.muted}>{user.email}</Text> : null;
}

export function InvoiceHint({ invoice }: { invoice?: Invoice }) {
  return invoice ? <Text style={ui.muted}>{invoice.invoiceCode}</Text> : null;
}
