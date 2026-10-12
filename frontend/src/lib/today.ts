import { todayIso } from '@minda/common';

/** Today in the browser's time zone (YYYY-MM-DD). */
export const clientToday = () => todayIso(Intl.DateTimeFormat().resolvedOptions().timeZone);
export const clientMonth = () => clientToday().slice(0, 7);
