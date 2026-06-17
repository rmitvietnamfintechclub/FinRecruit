const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FULL_DATETIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const JUST_NOW_THRESHOLD_SEC = 45;
const RELATIVE_MAX_DAYS = 7;

function parseDate(value: Date | string): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatFullDateTime(value: Date | string | null | undefined): string {
  const date = value == null ? null : parseDate(value);
  if (!date) return '—';
  return FULL_DATETIME_FORMAT.format(date);
}

export function formatRelativeTime(
  value: Date | string | null | undefined,
  nowMs: number = Date.now()
): string {
  const date = value == null ? null : parseDate(value);
  if (!date) return '—';

  const diffSec = Math.round((date.getTime() - nowMs) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < JUST_NOW_THRESHOLD_SEC) {
    return 'Just now';
  }

  const absMin = Math.floor(absSec / 60);
  if (absMin < 60) {
    return RELATIVE_TIME_FORMAT.format(Math.round(diffSec / 60), 'minute');
  }

  const absHour = Math.floor(absMin / 60);
  if (absHour < 24) {
    return RELATIVE_TIME_FORMAT.format(Math.round(diffSec / 3600), 'hour');
  }

  const absDay = Math.floor(absHour / 24);
  if (absDay <= RELATIVE_MAX_DAYS) {
    return RELATIVE_TIME_FORMAT.format(Math.round(diffSec / 86400), 'day');
  }

  return FULL_DATE_FORMAT.format(date);
}
