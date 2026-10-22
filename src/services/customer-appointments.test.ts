import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { appointmentIso, appointmentLabel, appointmentReminders, appointmentTiming, customerAppointments, nextCustomerAppointment, saveAppointment, setAppointmentStatus, vietnamAppointmentInput } from './customer-appointments';
import { createDraft, saveDraftItems, saveMeasurement } from './bao-service';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) });
  db.reset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const form = { day: '2026-10-23', time: '09:30', notes: 'Hẹn khách demo theo yêu cầu' };
const now = Date.parse('2026-10-22T02:00:00Z'); // 09:00 Vietnam.

describe('KH003 local appointment contract', () => {
  it('creates/edits one record with actor metadata and persists a single shared collection', () => {
    const appointment = saveAppointment('USR002', 'CUS001', form);
    expect(appointment).toMatchObject({ scheduledAt: '2026-10-23T02:30:00.000Z', createdBy: 'USR002', updatedBy: 'USR002', status: 'scheduled' });
    const edited = saveAppointment('USR001', 'CUS001', { ...form, time: '10:00', notes: 'Đổi giờ' }, appointment.id);
    expect(edited).toMatchObject({ id: appointment.id, createdBy: 'USR002', updatedBy: 'USR001', notes: 'Đổi giờ' });
    expect(db.appointments).toHaveLength(1);
    expect(JSON.parse(store.get('webbankinh_db')!).appointments[0]).toEqual(edited);
  });
  it('rejects duplicate active times; allows another customer and a replacement after cancellation', () => {
    const first = saveAppointment('USR001', 'CUS001', form);
    expect(() => saveAppointment('USR001', 'CUS001', form)).toThrow(/đã có/);
    expect(() => saveAppointment('USR001', 'CUS002', form)).not.toThrow();
    expect(() => saveAppointment('USR001', 'CUS001', form, first.id)).not.toThrow();
    setAppointmentStatus('USR001', first.id, 'cancelled');
    expect(() => saveAppointment('USR001', 'CUS001', form)).not.toThrow();
  });
  it.each([
    ['2026-02-30', '09:00'], ['2026-02-29', '09:00'], ['2026-13-01', '09:00'],
    ['', '09:00'], ['2026-10-23', '24:00'], ['2026-10-23', '12:60'], ['2026-10-23', '9:00'],
  ])('rejects impossible/invalid date-time %s %s without mutating data', (day, time) => {
    expect(() => saveAppointment('USR001', 'CUS001', { day, time, notes: '' })).toThrow();
    expect(db.appointments).toEqual([]);
  });
  it('round-trips VN date across UTC midnight and leap day independent of system timezone', () => {
    expect(appointmentIso('2028-02-29', '00:15')).toBe('2028-02-28T17:15:00.000Z');
    expect(vietnamAppointmentInput('2026-10-21T18:30:00Z')).toEqual({ day: '2026-10-22', time: '01:30' });
  });
  it('classifies overdue/today/upcoming using current time and excludes closed appointments from reminders', () => {
    const overdue = saveAppointment('USR001', 'CUS001', { ...form, day: '2026-10-22', time: '08:59' });
    const due = saveAppointment('USR001', 'CUS001', { ...form, day: '2026-10-22', time: '09:00' });
    const later = saveAppointment('USR001', 'CUS001', form);
    expect(appointmentTiming(overdue, now)).toBe('overdue');
    expect(appointmentLabel(due, now)).toBe('Đến hạn hôm nay');
    expect(appointmentTiming(later, now)).toBe('upcoming');
    expect(appointmentReminders('USR001', now).map(a => a.id)).toEqual([overdue.id, due.id]);
    expect(nextCustomerAppointment('USR001', 'CUS001', now)).toMatchObject({ next: { id: due.id }, overdueCount: 1 });
    setAppointmentStatus('USR001', overdue.id, 'cancelled');
    setAppointmentStatus('USR001', due.id, 'completed');
    expect(appointmentReminders('USR002', now)).toEqual([]);
    expect(customerAppointments('USR001', 'CUS001')).toHaveLength(3);
    expect(nextCustomerAppointment('USR001', 'CUS001', now).next?.id).toBe(later.id);
  });
  it('does not change customers, measurement history, purchase history or invoice snapshots', () => {
    const invoice = createDraft('USR001'); saveDraftItems('USR001', invoice.id, { PRD001: 1 });
    saveMeasurement('USR001', invoice.id, 'CUS001', { sphereRight: -1, cylinderRight: 0, axisRight: 0, sphereLeft: -1, cylinderLeft: 0, axisLeft: 0, pupillaryDistance: 62, measuredAt: '2026-10-22' });
    db.transaction(data => { data.invoices[0].paymentStatus = 'paid'; });
    const original = structuredClone({ customers: db.customers, invoices: db.invoices, products: db.products });
    const appointment = saveAppointment('USR002', 'CUS001', form);
    saveAppointment('USR001', 'CUS001', { ...form, time: '11:30' }, appointment.id);
    setAppointmentStatus('USR002', appointment.id, 'cancelled');
    expect({ customers: db.customers, invoices: db.invoices, products: db.products }).toEqual(original);
  });
  it('guards active staff, missing/cross-customer IDs, statuses and closed records', () => {
    expect(() => saveAppointment('missing', 'CUS001', form)).toThrow();
    db.transaction(data => { data.users[1].isActive = false; });
    expect(() => saveAppointment('USR002', 'CUS001', form)).toThrow();
    expect(() => saveAppointment('USR001', 'missing', form)).toThrow();
    const appointment = saveAppointment('USR001', 'CUS001', form);
    expect(() => saveAppointment('USR001', 'CUS002', form, appointment.id)).toThrow();
    expect(() => setAppointmentStatus('USR001', 'missing', 'cancelled')).toThrow();
    expect(() => setAppointmentStatus('USR001', appointment.id, 'wrong' as 'completed')).toThrow();
    setAppointmentStatus('USR001', appointment.id, 'completed');
    expect(() => saveAppointment('USR001', 'CUS001', form, appointment.id)).toThrow();
    expect(() => setAppointmentStatus('USR001', appointment.id, 'cancelled')).toThrow();
    expect(() => setAppointmentStatus('USR001', appointment.id, 'completed')).not.toThrow();
  });
  it('rolls back create/edit/cancel if local persistence fails and retains all collections', () => {
    const appointment = saveAppointment('USR001', 'CUS001', form);
    const before = store.get('webbankinh_db');
    const state = structuredClone(db.appointments);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => saveAppointment('USR001', 'CUS002', form)).toThrow('Storage full');
    expect(() => saveAppointment('USR001', 'CUS001', { ...form, notes: 'Edit' }, appointment.id)).toThrow('Storage full');
    expect(() => setAppointmentStatus('USR001', appointment.id, 'cancelled')).toThrow('Storage full');
    expect(db.appointments).toEqual(state); expect(store.get('webbankinh_db')).toBe(before);
  });
  it('loads old local data without synthesizing appointments or resetting business data; reload keeps new appointments', async () => {
    const old = JSON.parse(store.get('webbankinh_db')!);
    delete old.appointments;
    store.set('webbankinh_db', JSON.stringify(old));
    vi.resetModules();
    const { db: migrated } = await import('./database');
    expect(migrated.appointments).toEqual([]);
    expect(migrated.customers).toEqual(old.customers); expect(migrated.invoices).toEqual(old.invoices);
    const service = await import('./customer-appointments');
    const appointment = service.saveAppointment('USR001', 'CUS001', form);
    vi.resetModules();
    const { db: reloaded } = await import('./database');
    expect(reloaded.appointments[0].id).toBe(appointment.id);
    expect(reloaded.customers).toEqual(old.customers);
  });
});
