import { CustomerAppointment } from '../contracts/domain';
import { db } from './database';

function staff(actorId: string) {
  if (!db.users.some(user => user.id === actorId && user.isActive)) throw new Error('Phiên nhân viên không hợp lệ.');
}
function customerExists(customerId: string) {
  if (!db.customers.some(customer => customer.id === customerId)) throw new Error('Khách hàng không tồn tại.');
}
export function vietnamAppointmentInput(iso: string) {
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value)) throw new Error('Thời gian hẹn không hợp lệ.');
  const local = new Date(value + 7 * 60 * 60_000).toISOString();
  return { day: local.slice(0, 10), time: local.slice(11, 16) };
}
export function appointmentIso(day: string, time: string) {
  day = day.trim(); time = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Nhập ngày YYYY-MM-DD và giờ HH:mm hợp lệ (giờ Việt Nam).');
  const value = new Date(`${day}T${time}:00+07:00`);
  if (!Number.isFinite(value.getTime())) throw new Error('Ngày hẹn không hợp lệ.');
  const iso = value.toISOString();
  const check = vietnamAppointmentInput(iso);
  if (check.day !== day || check.time !== time) throw new Error('Ngày hẹn không tồn tại.');
  return iso;
}
export function appointmentTiming(appointment: CustomerAppointment, now = Date.now()) {
  if (appointment.status === 'cancelled') return 'cancelled' as const;
  if (appointment.status === 'completed') return 'completed' as const;
  if (Date.parse(appointment.scheduledAt) < now) return 'overdue' as const;
  return vietnamAppointmentInput(appointment.scheduledAt).day === vietnamAppointmentInput(new Date(now).toISOString()).day
    ? 'today' as const : 'upcoming' as const;
}
export function appointmentLabel(appointment: CustomerAppointment, now = Date.now()) {
  return { cancelled: 'Đã hủy', completed: 'Đã hoàn tất', overdue: 'Quá hạn', today: 'Đến hạn hôm nay', upcoming: 'Sắp tới' }[appointmentTiming(appointment, now)];
}
export function formatAppointment(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}
export function customerAppointments(actorId: string, customerId: string) {
  staff(actorId); customerExists(customerId);
  return db.appointments.filter(a => a.customerId === customerId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id))
    .map(a => ({ ...a }));
}
export function nextCustomerAppointment(actorId: string, customerId: string, now = Date.now()) {
  const list = customerAppointments(actorId, customerId).filter(a => a.status === 'scheduled');
  return { next: list.find(a => Date.parse(a.scheduledAt) >= now), overdueCount: list.filter(a => Date.parse(a.scheduledAt) < now).length };
}
export function saveAppointment(actorId: string, customerId: string, input: { day: string; time: string; notes: string }, appointmentId?: string) {
  staff(actorId); customerExists(customerId);
  const scheduledAt = appointmentIso(input.day, input.time);
  const existing = appointmentId ? db.appointments.find(a => a.id === appointmentId && a.customerId === customerId) : undefined;
  if (appointmentId && !existing) throw new Error('Lịch hẹn không tồn tại.');
  if (existing && existing.status !== 'scheduled') throw new Error('Lịch hẹn đã hủy hoặc hoàn tất; hãy tạo lịch mới.');
  if (db.appointments.some(a => a.id !== appointmentId && a.customerId === customerId && a.status === 'scheduled' && a.scheduledAt === scheduledAt))
    throw new Error('Khách đã có lịch hẹn vào thời gian này.');
  const stamp = new Date().toISOString();
  const appointment: CustomerAppointment = existing
    ? { ...existing, scheduledAt, notes: input.notes.trim(), updatedAt: stamp, updatedBy: actorId }
    : { id: `APT-${crypto.randomUUID()}`, customerId, scheduledAt, notes: input.notes.trim(), status: 'scheduled', createdAt: stamp, updatedAt: stamp, createdBy: actorId, updatedBy: actorId };
  db.transaction(data => {
    if (existing) data.appointments[data.appointments.findIndex(a => a.id === existing.id)] = appointment;
    else data.appointments.push(appointment);
  });
  return { ...appointment };
}
export function setAppointmentStatus(actorId: string, appointmentId: string, status: 'completed' | 'cancelled') {
  staff(actorId);
  if (!['completed', 'cancelled'].includes(status)) throw new Error('Trạng thái lịch hẹn không hợp lệ.');
  const appointment = db.appointments.find(a => a.id === appointmentId);
  if (!appointment) throw new Error('Lịch hẹn không tồn tại.');
  if (appointment.status === status) return;
  if (appointment.status !== 'scheduled') throw new Error('Lịch hẹn đã đóng, không thể đổi trạng thái.');
  db.transaction(data => {
    Object.assign(data.appointments.find(a => a.id === appointmentId)!, { status, updatedAt: new Date().toISOString(), updatedBy: actorId });
  });
}
export function appointmentReminders(actorId: string, now = Date.now()) {
  staff(actorId);
  return db.appointments.filter(a => a.status === 'scheduled' && ['overdue', 'today'].includes(appointmentTiming(a, now)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id))
    .map(a => ({ ...a, customerName: db.customers.find(c => c.id === a.customerId)?.fullName || 'Khách hàng' }));
}
