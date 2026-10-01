const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

/** 'NOV 27, 2026 (FRI)' */
export function formatDateBand(iso: string, fullDay = false): string {
  const { y, m, d, dow } = parts(iso);
  return `${MONTHS[m - 1]} ${d}, ${y} (${fullDay ? DAYS_FULL[dow] : DAYS[dow]})`;
}

/** 'Nov 27, 2026' */
export function formatDateLong(iso: string): string {
  const { y, m, d } = parts(iso);
  const mon = MONTHS[m - 1];
  return `${mon[0]}${mon.slice(1).toLowerCase()} ${d}, ${y}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function slotRangeLabel(s: { startTime: string; endTime: string }): string {
  return `${s.startTime} - ${s.endTime}`;
}

export function slotDuration(s: { startTime: string; endTime: string }): string {
  return `${toMinutes(s.endTime) - toMinutes(s.startTime)} mins`;
}

/** Pure chunking: [start, end) into intervalMinutes-long chunks; a trailing partial chunk is dropped. */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): Array<{ startTime: string; endTime: string }> {
  const out: Array<{ startTime: string; endTime: string }> = [];
  if (!startTime || !endTime || !(intervalMinutes > 0)) return out;
  const end = toMinutes(endTime);
  for (let t = toMinutes(startTime); t + intervalMinutes <= end; t += intervalMinutes) {
    out.push({ startTime: fromMinutes(t), endTime: fromMinutes(t + intervalMinutes) });
  }
  return out;
}

export function sortSlots<T extends { date: string; startTime: string; room: string }>(slots: T[]): T[] {
  return [...slots].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.room.localeCompare(b.room)
  );
}
