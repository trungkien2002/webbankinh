import { MeasurementForm } from './measurementForm';
import { Toast } from './toast';
import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { EyePrescription, Invoice } from '../contracts/domain';
import { db } from '../services/database';
import { categoryDetail, createVoucher, editCategory, editEmployee, invoiceDetail, saveMeasurement } from '../services/bao-service';
import { adminResetPassword, confirmPasswordReset, requestPasswordReset } from '../services/password-reset';
import { Button, Choice, Field, Sheet, Table, money, ui } from './ui';
import { printInvoice } from './invoice-print';

export type BaoAction = 'password-reset' | 'category-edit' | 'category-detail' | 'voucher-create' | 'measurement' | 'invoice-detail' | 'employee-edit';
const titles: Record<BaoAction, string> = {
  'password-reset': 'Quên mật khẩu — demo cục bộ', 'category-edit': 'Sửa phân loại kính',
  'category-detail': 'Chi tiết phân loại kính', 'voucher-create': 'Tạo voucher',
  measurement: 'Khách hàng và thông số đo mắt', 'invoice-detail': 'Chi tiết hóa đơn', 'employee-edit': 'Sửa nhân viên',
};
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; };
const displayDate = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa thanh toán';
const paymentLabels: Record<string,string> = { draft: 'Đơn nháp', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', cancelled: 'Đã hủy' };
const productionLabels: Record<string,string> = { none: 'Không gia công', cutting_lens: 'Đang cắt tròng', ready: 'Sẵn sàng', delivered: 'Đã giao' };
export function InvoiceContent({ invoice }: { invoice: Invoice }) {
  const [error, setError] = useState('');
  const prescription = invoice.prescription;
  return <View style={{ gap: 20 }}>
    <Text selectable style={ui.h2}>{invoice.invoiceCode}</Text>
    <Text selectable style={[ui.text, { lineHeight: 28, padding: 18, backgroundColor: "#f0f4ee", borderRadius: 10 }]}>Ngày tạo: {displayDate(invoice.createdAt)}{'\n'}Khách: {invoice.customerName || 'Khách vãng lai'} · {invoice.customerPhone || '—'}{'\n'}Nhân viên: {invoice.employeeName}{'\n'}Trạng thái: {paymentLabels[invoice.paymentStatus] || invoice.paymentStatus} · Gia công: {productionLabels[invoice.productionStatus] || invoice.productionStatus}</Text>
    <Table headings={['Sản phẩm', 'SL', 'Đơn giá', 'Thành tiền']} rows={invoice.items.map(item => [item.productName + ' / ' + item.sku + (item.comboId ? ' · Combo' : ''), String(item.quantity), money(item.unitPrice), money(item.lineTotal)])} />
    <Text selectable style={[ui.text, { lineHeight: 30, padding: 18, backgroundColor: "#f0f4ee", borderRadius: 10 }]}>Tiền hàng: {money(invoice.subtotal)}{'\n'}Công mài: {money(invoice.assemblyFee || 0)}{'\n'}Giảm giá: {money(invoice.discountAmount)} · {invoice.voucherCode || '—'}{'\n'}Tổng: {money(invoice.totalAmount)}{'\n'}Thanh toán: {invoice.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} · {displayDate(invoice.paidAt)}</Text>
    {prescription ? <><Text style={ui.h2}>Thông số đo mắt</Text><Table headings={['Mắt', 'SPH', 'CYL', 'AXIS']} rows={[
      ['Phải', String(prescription.sphereRight), String(prescription.cylinderRight), String(prescription.axisRight)],
      ['Trái', String(prescription.sphereLeft), String(prescription.cylinderLeft), String(prescription.axisLeft)],
    ]} /><Text selectable style={ui.text}>PD: {prescription.pupillaryDistance} mm · Ngày đo: {prescription.measuredAt}{'\n'}{prescription.notes}</Text></> : <Text style={ui.muted}>Không có thông số đo mắt.</Text>}
    <Toast message={error} onClose={()=>setError('')}/>
    <Button onPress={() => { setError(''); printInvoice(invoice).catch(e => setError((e as Error).message)); }}>In / Lưu PDF</Button>
    <Text style={ui.muted}>Chọn “Lưu dưới dạng PDF” trong hộp thoại in của trình duyệt. In lại không thay đổi thanh toán.</Text>
  </View>;
}

export function BaoDialog({ action, targetId = '', userId = '', onClose, onSaved }: {
  action: BaoAction; targetId?: string; userId?: string; onClose: () => void; onSaved: () => void;
}) {
  const category = db.categories.find(c => c.id === targetId);
  const employee = db.employees.find(e => e.id === targetId);
  const invoice = db.invoices.find(i => i.id === targetId);
  const p = invoice?.prescription;
  const [form, setForm] = useState<Record<string, string>>((): Record<string, string> => {
    if (action === 'category-edit') return { name: category?.name || '', description: category?.description || '', material: category?.material || '' };
    if (action === 'employee-edit') return { fullName: employee?.fullName || '', phone: employee?.phone || '', email: employee?.email || '', position: employee?.position || '', shift: employee?.shift || '', branch: employee?.branch || '', role: db.users.find(u => u.id === employee?.userId)?.role || '', password: '' };
    if (action === 'measurement') return { customerId: invoice?.customerId || '', measuredAt: p?.measuredAt || today(), notes: p?.notes || '', required: p ? 'yes' : 'no', ...Object.fromEntries(['sphereRight', 'sphereLeft', 'cylinderRight', 'cylinderLeft', 'axisRight', 'axisLeft', 'pupillaryDistance'].map(key => [key, p ? String(p[key as keyof EyePrescription]) : ''])) };
    return { discountType: 'percentage', minOrderValue: '0', startDate: today(), endDate: today() };
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [challenge, setChallenge] = useState<{ challengeId: string; demoCode: string; message: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const field = (key: string, label: string, secure = false) => <Field key={key} label={label} value={form[key] || ''} onChange={value => set(key, value)} secure={secure} />;
  const run = async (operation: () => void | Promise<void>, close = true) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await operation(); if (close) onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu dữ liệu.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const save = () => run(async () => {
    if (action === 'category-edit') editCategory(userId, targetId, { name: form.name || '', description: form.description || '', material: form.material });
    if (action === 'voucher-create') createVoucher(userId, { code: form.code || '', name: form.name || '', discountType: form.discountType as 'percentage' | 'fixed', discountValue: Number(form.discountValue), minOrderValue: Number(form.minOrderValue), maxDiscountAmount: form.maxDiscountAmount?.trim() ? Number(form.maxDiscountAmount) : undefined, startDate: form.startDate || '', endDate: form.endDate || '', isActive: true });
    if (action === 'employee-edit') editEmployee(userId, targetId, { fullName: form.fullName || '', email: form.email || '', phone: form.phone || '', position: form.position || '', shift: form.shift, branch: form.branch, role: form.role ? form.role as 'admin' | 'employee' : undefined });
    if (action === 'measurement') {
      let prescription: EyePrescription | undefined;
      if (form.required === 'yes') {
        const keys = ['sphereRight', 'sphereLeft', 'cylinderRight', 'cylinderLeft', 'axisRight', 'axisLeft', 'pupillaryDistance'];
        if (keys.some(key => !form[key]?.trim())) throw new Error('Nhập đủ thông số cho cả hai mắt và PD.');
        prescription = { sphereRight: Number(form.sphereRight), sphereLeft: Number(form.sphereLeft), cylinderRight: Number(form.cylinderRight), cylinderLeft: Number(form.cylinderLeft), axisRight: Number(form.axisRight), axisLeft: Number(form.axisLeft), pupillaryDistance: Number(form.pupillaryDistance), measuredAt: form.measuredAt, notes: form.notes };
      }
      saveMeasurement(userId, targetId, form.customerId || '', prescription);
    }
  });
  const content = () => {
    if (action === 'password-reset') return <>
      <Text style={ui.muted}>OTP mô phỏng được hiển thị tại đây, có hạn 5 phút và tối đa 5 lần thử. Không gửi email/SMS thật.</Text>
      {finished ? <Text selectable style={ui.h2}>Đã xử lý yêu cầu. Nếu email có tài khoản, bạn có thể đăng nhập bằng mật khẩu mới.</Text> : <>
        {!challenge ? <>{field('email', 'Email')}<Button disabled={busy} onPress={() => run(() => { setChallenge(requestPasswordReset(form.email || '')); }, false)}>Tạo mã OTP demo</Button></> : <>
          <Text selectable style={ui.text}>{challenge.message}{'\n'}Mã OTP demo: {challenge.demoCode}</Text>
          {field('otp', 'Mã OTP')}{field('password', 'Mật khẩu mới (ít nhất 8 ký tự)', true)}{field('confirm', 'Nhập lại mật khẩu mới', true)}
          <Button disabled={busy} primary onPress={() => run(async () => {
            if (form.password !== form.confirm) throw new Error('Mật khẩu nhập lại không khớp.');
            await confirmPasswordReset(challenge.challengeId, form.otp || '', form.password || ''); setFinished(true);
          }, false)}>Đổi mật khẩu</Button>
          <Button disabled={busy} onPress={() => { setChallenge(null); setForm(f => ({ email: f.email })); }}>Yêu cầu mã mới</Button>
        </>}
      </>}
    </>;
    if (action === 'category-detail') {
      try { const detail = categoryDetail(userId, targetId); return <><Text selectable style={ui.h2}>{detail.category.name}</Text><Text selectable style={ui.text}>{detail.category.description}{'\n'}Chất liệu/quy cách: {detail.category.material || 'Chưa khai báo'}</Text><Table headings={['Sản phẩm', 'SKU', 'Giá niêm yết', 'Tồn']} rows={detail.products.map(p => [p.name, p.sku, money(p.price), String(p.stock)])} /></>; }
      catch (e) { return <Text style={ui.error}>{(e as Error).message}</Text>; }
    }
    if (action === 'invoice-detail') {
      try { return <InvoiceContent invoice={invoiceDetail(userId, targetId)} />; }
      catch (e) { return <Text style={ui.error}>{(e as Error).message}</Text>; }
    }
    if (action === 'category-edit') return <>{field('name', 'Tên phân loại')}{field('description', 'Mô tả')}{field('material', 'Chất liệu / quy cách')}</>;
    if (action === 'voucher-create') return <>
      {field('code', 'Mã voucher')}{field('name', 'Tên chương trình')}
      <Choice label="Loại giảm" value={form.discountType} onChange={value => set('discountType', value)} options={[{ label: 'Phần trăm', value: 'percentage' }, { label: 'Số tiền VND', value: 'fixed' }]} />
      {field('discountValue', 'Mức giảm')}{field('minOrderValue', 'Đơn tối thiểu (VND)')}{field('maxDiscountAmount', 'Trần giảm (VND, tùy chọn)')}{field('startDate', 'Từ ngày (YYYY-MM-DD)')}{field('endDate', 'Đến ngày (YYYY-MM-DD)')}
    </>;
    if (action === 'measurement') return <MeasurementForm form={form} set={set} />;
    return <>
      {field('fullName', 'Họ tên')}{field('phone', 'Số điện thoại')}{field('email', 'Email')}{field('position', 'Vị trí')}{field('shift', 'Ca làm')}{field('branch', 'Chi nhánh')}
      {employee?.userId && <><Choice label="Vai trò tài khoản" value={form.role} onChange={value => set('role', value)} options={[{ label: 'Admin', value: 'admin' }, { label: 'Nhân viên', value: 'employee' }]} />
        {field('password', 'Mật khẩu mới (đặt lại riêng, ít nhất 8 ký tự)', true)}
        <Button disabled={busy} onPress={() => run(async () => { await adminResetPassword(userId, targetId, form.password || ''); set('password', ''); setError('Đã đặt lại mật khẩu demo; phiên cũ sẽ hết hiệu lực.'); }, false)}>Đặt lại mật khẩu demo</Button>
      </>}
      {!employee?.userId && <Text style={ui.muted}>Hồ sơ này chưa có tài khoản để đổi quyền hoặc mật khẩu.</Text>}
    </>;
  };
  return <Sheet title={titles[action]} onClose={() => { if (!busy) onClose(); }}>
    {content()}
    <Toast message={error} onClose={()=>setError('')}/>
    {!['password-reset', 'category-detail', 'invoice-detail'].includes(action) && <Button primary disabled={busy} onPress={save}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>}
  </Sheet>;
}
