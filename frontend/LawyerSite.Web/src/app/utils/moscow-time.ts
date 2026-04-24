const MOSCOW_TZ = 'Europe/Moscow';

const fmtHM = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const fmtDateRu = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const fmtDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: MOSCOW_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const fmtPartsHM = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function formatMoscowTimeHM(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return fmtHM.format(d);
}

export function formatMoscowDateRu(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return fmtDateRu.format(d);
}

export function getMoscowDateKey(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return fmtDateKey.format(d);
}

export function getMoscowHourMinute(value: Date | string): { hour: number; minute: number } {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return { hour: 0, minute: 0 };

  const parts = fmtPartsHM.formatToParts(d);
  const hh = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
  const mm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  return { hour: hh, minute: mm };
}

