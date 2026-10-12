import { loadConfig } from '../config';
import { buildContext } from '../lib/build-context';
import { ensureTabs } from '../sheets/repo';
import { seedAdmin, seedBase, seedDemo } from './seed';

/**
 * npm run setup:sheets            creates missing tabs, fills empty master data, creates the first admin
 * npm run setup:sheets -- --demo  also loads placeholder people for local testing (never use on real data)
 */
async function main() {
  const config = loadConfig();
  const ctx = buildContext(config);
  const { created, ok } = await ensureTabs(ctx.db, config.SHEET_TAB_PREFIX);
  console.log(`Tabs created: ${created.length ? created.join(', ') : 'none'}. Already fine: ${ok.length}.`);
  const seeded = await seedBase(ctx.db);
  console.log(`Starting content added to: ${seeded.length ? seeded.join(', ') : 'nothing (tabs already have data)'}.`);
  if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD) {
    console.log((await seedAdmin(ctx, config.ADMIN_EMAIL.toLowerCase(), config.ADMIN_PASSWORD)) ? `Admin created: ${config.ADMIN_EMAIL}` : 'Users already exist, admin not created.');
  } else console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set, skipped admin creation.');
  if (process.argv.includes('--demo')) {
    if (config.NODE_ENV === 'production') throw new Error('Refusing to load demo data in production');
    await seedDemo(ctx);
    console.log('Demo data loaded.');
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
