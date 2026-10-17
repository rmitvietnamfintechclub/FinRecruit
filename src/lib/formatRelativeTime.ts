const FULL_DATETIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Ho_Chi_Minh', 
});

function parseDate(value: Date | string): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatFullDateTime(value: Date | string | null | undefined): string {
  const date = value == null ? null : parseDate(value);
  if (!date) return '—';
  
  const formattedString = FULL_DATETIME_FORMAT.format(date);
  
  return formattedString;
}