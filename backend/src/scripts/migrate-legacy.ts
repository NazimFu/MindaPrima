import { loadConfig } from '../config';
import { buildContext } from '../lib/build-context';
import { planMigration } from '../migrate/legacy';
import { ensureTabs } from '../sheets/repo';
import { seedAdmin, seedBase } from './seed';

/**
 * npm run migrate:legacy            shows what would be written (nothing is changed)
 * npm run migrate:legacy -- --apply writes the new tabs
 *
 * Reads the OLD tabs (Students, Teachers, Prices) and writes the NEW tabs, which must use SHEET_TAB_PREFIX.
 * The old tabs are never modified.
 */
async function main() {
  const config = loadConfig();
  if (!config.SHEET_TAB_PREFIX) throw new Error('Set SHEET_TAB_PREFIX (for example MP_) so the new tabs sit beside the old ones.');
  const ctx = buildContext(config);
  const { db } = ctx;
  const read = (tab: string) => db.client.read(tab);
  const plan = planMigration({ students: await read('Students'), teachers: await read('Teachers'), prices: await read('Prices') });

  const counts = { levels: plan.levels.length, subjects: plan.subjects.length, teachers: plan.teachers.length, guardians: plan.guardians.length, classes: plan.classes.length, students: plan.students.length, pricing: plan.pricing.length };
  console.log('Would write:', counts);
  plan.notes.forEach((n) => console.log(' -', n));
  if (!process.argv.includes('--apply')) { console.log('Dry run. Add --apply to write.'); return; }

  await ensureTabs(db, config.SHEET_TAB_PREFIX);
  if ((await db.students.all()).length > 0 || (await db.levels.all()).length > 0) throw new Error('New tabs already contain data. Migration only runs into empty tabs.');
  await db.levels.insertMany(plan.levels);
  await db.subjects.insertMany(plan.subjects);
  await db.pricing.insertMany(plan.pricing);
  await db.teachers.insertMany(plan.teachers);
  await db.guardians.insertMany(plan.guardians);
  await db.classes.insertMany(plan.classes);
  await db.students.insertMany(plan.students);
  await db.studentTransport.insertMany(plan.studentTransport);
  console.log('Migrated:', counts);
  console.log('Starting content added to:', (await seedBase(db)).join(', ') || 'nothing');
  if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD) console.log((await seedAdmin(ctx, config.ADMIN_EMAIL.toLowerCase(), config.ADMIN_PASSWORD)) ? 'Admin created.' : 'Users exist, admin not created.');
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
