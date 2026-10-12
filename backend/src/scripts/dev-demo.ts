import { loadConfig } from '../config';
import { createApp } from '../app';
import { buildContext } from '../lib/build-context';
import { ensureTabs } from '../sheets/repo';
import { seedAdmin, seedBase, seedDemo } from './seed';

/** Local only: runs the API on an in-memory spreadsheet with demo data. Nothing is saved. */
async function main() {
  const config = loadConfig({ ...process.env, SHEETS_DRIVER: 'memory' });
  const ctx = buildContext(config);
  await ensureTabs(ctx.db, config.SHEET_TAB_PREFIX);
  await seedBase(ctx.db);
  await seedAdmin(ctx, config.ADMIN_EMAIL.toLowerCase() || 'admin@demo.local', config.ADMIN_PASSWORD || 'demo-admin-password');
  await seedDemo(ctx);
  createApp(ctx).listen(config.PORT, () => console.log(`Demo API on :${config.PORT} (in-memory sheet)`));
}
main().catch((e) => { console.error(e); process.exit(1); });
