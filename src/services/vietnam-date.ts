export function isCalendarDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function vietnamDay(value: string | Date = new Date()): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isCalendarDay(value)) throw new Error('Ngày không hợp lệ.');
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Ngày không hợp lệ.');
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function vietnamDayStart(value: string): number {
  if (!isCalendarDay(value)) throw new Error('Ngày không hợp lệ.');
  return Date.parse(`${value}T00:00:00+07:00`);
}
