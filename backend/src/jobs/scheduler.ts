import cron from 'node-cron';
import { todayIso } from '@minda/common';
import type { AppContext } from '../lib/context';
import { syncRun } from '../services/transport';

/** Rebuilds today's transport list every day at TRANSPORT_REFRESH_TIME (in TZ_NAME). */
export function startJobs(ctx: AppContext): () => void {
  const [hh, mm] = ctx.config.TRANSPORT_REFRESH_TIME.split(':');
  const task = cron.schedule(`${Number(mm)} ${Number(hh)} * * *`, () => {
    syncRun(ctx, todayIso(ctx.config.TZ_NAME))
      .then((r) => console.log(`Transport list rebuilt: +${r.added} -${r.removed}`))
      .catch((e) => console.error('Transport refresh failed:', (e as Error).message));
  }, { timezone: ctx.config.TZ_NAME });
  return () => { task.stop(); };
}
