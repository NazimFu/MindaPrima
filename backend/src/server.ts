import type { AppContext } from './lib/context';
import { loadConfig } from './config';
import { createApp } from './app';
import { startJobs } from './jobs/scheduler';
import { buildContext } from './lib/build-context';

/**
 * whatsapp-web.js deletes its session folder from an event handler nobody can catch. If Chrome still holds a file (EBUSY on
 * Windows) that rejection would crash the whole API, so log it instead. Every other unhandled rejection still crashes.
 */
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (/wwebjs_auth|whatsapp-web\.js/i.test(msg) || (reason instanceof Error && /whatsapp-web\.js/.test(reason.stack ?? ''))) {
    console.error('WhatsApp cleanup failed (ignored, API keeps running):', msg);
    return;
  }
  throw reason;
});

async function main() {
  const config = loadConfig();
  const ctx: AppContext = buildContext(config);
  const app = createApp(ctx);
  startJobs(ctx);
  app.listen(config.PORT, () => console.log(`Backend listening on :${config.PORT} (${config.NODE_ENV})`));
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
