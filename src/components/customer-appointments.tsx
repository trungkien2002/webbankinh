import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CustomerAppointment } from '../contracts/domain';
import { appointmentLabel, appointmentReminders, customerAppointments, formatAppointment, nextCustomerAppointment, saveAppointment, setAppointmentStatus, vietnamAppointmentInput } from '../services/customer-appointments';
import { Button, Field, ui } from './ui';
import { IconButton } from './icons';

function useAppointmentClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  return now;
}

export function CustomerAppointmentSummary({ actorId, customerId }: { actorId: string; customerId: string }) {
  const now = useAppointmentClock();
  let summary;
  try { summary = nextCustomerAppointment(actorId, customerId, now); }
  catch (e) { return <Text accessibilityRole="alert" style={ui.error}>{(e as Error).message}</Text>; }
  const { next, overdueCount } = summary;
  return <View style={{ gap: 4 }}>
    <Text selectable style={ui.text}>{next ? formatAppointment(next.scheduledAt) : 'Chưa có lịch sắp tới'}</Text>
    {next && <Text style={ui.muted}>{appointmentLabel(next, now)}</Text>}
    {overdueCount > 0 && <Text style={ui.error}>{overdueCount} hẹn quá hạn</Text>}
  </View>;
}

export function AppointmentReminders({ actorId, onOpen }: { actorId: string; onOpen: (customerId: string) => void }) {
  const now = useAppointmentClock();
  const [expanded, setExpanded] = useState(false);
  let reminders;
  try { reminders = appointmentReminders(actorId, now); }
  catch { return null; }
  if (!reminders.length) return null;
  return <View style={[ui.card, { gap: 10, marginBottom: 16 }]}>
    <Text selectable style={ui.h2}>Nhắc tái khám: {reminders.length} lịch cần xem</Text>
    <Text style={ui.muted}>Lịch do nhân viên nhập · giờ Việt Nam · chỉ nhắc trong ứng dụng.</Text>
    {(expanded ? reminders : reminders.slice(0, 3)).map(appointment => <View key={appointment.id} style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
      <View style={{ flex: 1, minWidth: 150 }}>
        <Text selectable style={ui.label}>{appointment.customerName}</Text>
        <Text style={ui.text}>{formatAppointment(appointment.scheduledAt)} · {appointmentLabel(appointment, now)}</Text>
      </View>
      <IconButton name="eye" label={`Mở hẹn ${appointment.customerName}`} onPress={() => onOpen(appointment.customerId)} />
    </View>)}
    {reminders.length > 3 && <Button onPress={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn lịch nhắc' : 'Xem tất cả lịch nhắc'}</Button>}
  </View>;
}

export function CustomerAppointments({ actorId, customerId, onChanged }: {
  actorId: string; customerId: string; onChanged: (message: string) => void;
}) {
  const now = useAppointmentClock();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ day: '', time: '', notes: '' });
  const [confirmId, setConfirmId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  let appointments: CustomerAppointment[];
  try { appointments = customerAppointments(actorId, customerId); }
  catch (e) { return <Text accessibilityRole="alert" style={ui.error}>{(e as Error).message}</Text>; }
  const begin = (appointment?: CustomerAppointment) => {
    setEditing(appointment?.id || '');
    setForm(appointment ? { ...vietnamAppointmentInput(appointment.scheduledAt), notes: appointment.notes } : { day: '', time: '', notes: '' });
    setConfirmId(''); setError('');
  };
  const mutate = (operation: () => void, message: string) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { operation(); setEditing(null); setConfirmId(''); onChanged(message); }
    catch (e) { setError((e as Error).message); }
    finally { locked.current = false; setBusy(false); }
  };
  return <View style={[ui.card, { gap: 14, minWidth: 0 }]}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}>
      <Text style={ui.h2}>Lịch hẹn tái khám</Text>
      <IconButton name="plus" label="Tạo lịch hẹn" onPress={() => begin()} />
    </View>
    <Text style={ui.muted}>Nhập lịch đã thống nhất với khách, theo giờ Việt Nam. Không tự đưa chỉ định y khoa, không gửi email/SMS.</Text>
    {!appointments.length && <Text style={ui.muted}>Khách chưa có lịch hẹn.</Text>}
    {appointments.map(appointment => <View key={appointment.id} style={{ borderTopWidth: 1, borderColor: '#e2e7df', paddingTop: 12, gap: 8 }}>
      <Text selectable style={ui.label}>{formatAppointment(appointment.scheduledAt)}</Text>
      <Text selectable style={appointmentLabel(appointment, now) === 'Quá hạn' ? ui.error : ui.muted}>{appointmentLabel(appointment, now)}</Text>
      {!!appointment.notes && <Text selectable style={ui.text}>{appointment.notes}</Text>}
      {appointment.status === 'scheduled' && <View style={ui.row}>
        <IconButton name="edit" label="Sửa lịch hẹn" onPress={() => begin(appointment)} />
        <IconButton name="close" label="Hủy lịch hẹn" onPress={() => { setConfirmId(appointment.id); setError(''); }} />
        <IconButton name="check" label="Hoàn tất lịch hẹn" onPress={() => mutate(() => setAppointmentStatus(actorId, appointment.id, 'completed'), 'Đã hoàn tất lịch hẹn.')} />
      </View>}
    </View>)}
    {!!confirmId && <View style={{ gap: 10 }}>
      <Text style={ui.label}>Hủy lịch hẹn này? Hồ sơ đo mắt và mua hàng vẫn được giữ nguyên.</Text>
      <View style={ui.row}><Button primary disabled={busy} onPress={() => mutate(() => setAppointmentStatus(actorId, confirmId, 'cancelled'), 'Đã hủy lịch hẹn.')}>Xác nhận hủy hẹn</Button>
        <Button disabled={busy} onPress={() => setConfirmId('')}>Giữ lịch hẹn</Button></View>
    </View>}
    {editing !== null && <View style={{ gap: 8, borderTopWidth: 1, borderColor: '#e2e7df', paddingTop: 16 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.h2}>{editing ? 'Sửa lịch hẹn' : 'Lịch hẹn mới'}</Text><IconButton name="close" label="Đóng form lịch hẹn" onPress={() => { if (!busy) { setEditing(null); setError(''); } }} /></View>
      <Field label="Ngày hẹn (YYYY-MM-DD)" value={form.day} onChange={day => setForm(old => ({ ...old, day }))} />
      <Field label="Giờ hẹn (HH:mm, giờ Việt Nam)" value={form.time} onChange={time => setForm(old => ({ ...old, time }))} />
      <Field label="Ghi chú lịch hẹn" value={form.notes} onChange={notes => setForm(old => ({ ...old, notes }))} />
      <Button primary disabled={busy} onPress={() => mutate(() => { saveAppointment(actorId, customerId, form, editing || undefined); }, editing ? 'Đã cập nhật lịch hẹn.' : 'Đã tạo lịch hẹn.')}>{busy ? 'Đang lưu…' : 'Lưu lịch hẹn'}</Button>
    </View>}
    {!!error && <Text selectable accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </View>;
}
