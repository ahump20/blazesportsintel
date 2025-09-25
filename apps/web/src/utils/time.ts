const defaultTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const defaultDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

function parseDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatLocalTime(iso: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(iso);
  if (!date) {
    return '—';
  }
  if (options) {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
  return defaultTimeFormatter.format(date);
}

export function formatEventDate(iso: string): string {
  const date = parseDate(iso);
  if (!date) {
    return 'TBD';
  }
  return defaultDateTimeFormatter.format(date);
}

export function timeAgo(iso: string): string {
  const date = parseDate(iso);
  if (!date) {
    return 'n/a';
  }

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) {
    return diffMs >= 0 ? 'just now' : 'in <1m';
  }

  if (absMs < hour) {
    const minutes = Math.round(absMs / minute);
    return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }

  if (absMs < day) {
    const hours = Math.round(absMs / hour);
    return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  }

  const days = Math.round(absMs / day);
  return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
}
