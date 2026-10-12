import type { AppContext } from './lib/context';
import { loadConfig } from './config';
import { createApp } from './app';
import { startJobs } from './jobs/scheduler';
import { buildContext } from './lib/build-context';

async function main() {
  const config = loadConfig();
  const ctx: AppContext = buildContext(config);
  const app = createApp(ctx);
  startJobs(ctx);
  app.listen(config.PORT, () => console.log(`Backend listening on :${config.PORT} (${config.NODE_ENV})`));
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
