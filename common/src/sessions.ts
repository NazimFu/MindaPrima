import type { Session } from './types';

export const sessionById = (sessions: Session[], id: string) => sessions.find((s) => s.id === id);
export const sessionCode = (sessions: Session[], id: string) => sessionById(sessions, id)?.code ?? '?';

/** "7:30 pm" from "19:30". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2:00 to 3:30 pm" or "11:00 am to 12:30 pm". */
export function formatRange(start: string, end: string): string {
  const a = formatClock(start);
  const b = formatClock(end);
  return a.endsWith(b.slice(-2)) ? `${a.slice(0, -3)} to ${b}` : `${a} to ${b}`;
}
