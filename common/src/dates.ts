import { MONTH_NAMES, type Day } from './constants';

const DAY_BY_INDEX: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Today as YYYY-MM-DD in the given IANA time zone. */
export function todayIso(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isMonthKey = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function weekdayOf(isoDate: string): Day {
  return DAY_BY_INDEX[new Date(`${isoDate}T00:00:00Z`).getUTCDay()]!;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1] ?? ''} ${y}`;
}

/** OCT for 2026-10. First part of the invoice number. */
export function monthCode(key: string): string {
  return (MONTH_NAMES[Number(key.split('-')[1]) - 1] ?? 'UNK').slice(0, 3).toUpperCase();
}

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function* eachDate(from: string, to: string): Generator<string> {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}
