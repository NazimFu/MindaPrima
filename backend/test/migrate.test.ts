import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { buildContext } from '../src/lib/build-context';
import { planMigration } from '../src/migrate/legacy';
import { ensureTabs } from '../src/sheets/repo';
import { testEnv } from './helpers';

const legacy = {
  students: [
    ['id', 'name', 'level', 'subjects', 'guardian', 'guardianContact', 'address', 'transport', 'transportArea', 'paymentStatus', 'firstTime'],
    ['STU-1773572279426', 'Atikah', 'Primary 5', 'Mathematics', 'Saiful', '60148886010', '74, Jalan Cheras, Selangor', 'Yes', 'Inside Limit', 'Paid', 'Yes'],
    ['STU-1773572338192', 'Nuqman', 'Primary 1', 'Science', 'Saiful', '60148886010', '74, Jalan Cheras, Selangor', 'Yes', 'Inside Limit', 'Paid', 'Yes'],
    ['STU-1773572374608', 'Musfirah', 'Secondary 4', 'Physics', 'Asmadi', '60137090363', '74, Jalan Mewah Utama 1/3', 'No', 'N/A', 'Pending', 'Yes'],
  ],
  teachers: [['id', 'name', 'subject', 'contact'], ['TEA-1', 'Khadijah', 'Math', '137479661'], ['TEA-2', 'Asmadi', 'Chemistry', '137090363']],
  prices: [
    ['qtySubjects', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'TI', 'TO'],
    ['1', '40', '40', '40', '45', '45', '45', '50', '50', '50', '55', '55', '55', '20', '60'],
    ['2', '70', '70', '70', '80', '80', '80', '90', '90', '90', '100', '100', '100'],
  ],
};

describe('legacy migration', () => {
  it('maps the old tabs to the new model', () => {
    const p = planMigration(legacy);
    expect(p.levels).toHaveLength(12);
    expect(p.students.map((s) => s.firstName)).toEqual(['Atikah', 'Nuqman', 'Musfirah']);
    expect(p.guardians).toHaveLength(2);
    expect(p.students[0]!.hasSibling).toBe(true);
    expect(p.students[2]!.hasSibling).toBe(false);
    expect(p.studentTransport.map((t) => t.needed)).toEqual([true, true, false]);
    expect(p.subjects.map((s) => s.name)).toEqual(['Chemistry', 'Mathematics', 'Physics', 'Science']);
    expect(p.teachers[0]).toMatchObject({ subject: 'Mathematics', contact: '0137479661' });
    // one teacher per subject, so the class gets a teacher
    const math = p.classes.find((c) => c.subjectId === p.subjects.find((s) => s.name === 'Mathematics')!.id)!;
    expect(math.teacherId).toBe('TEA-1');
    expect(p.pricing.filter((x) => x.kind === 'transport').map((x) => [x.area, x.amount])).toEqual([['inside', 20], ['outside', 60]]);
    expect(p.pricing.find((x) => x.kind === 'tuition' && x.qty === 2 && x.levelId === p.levels[6]!.id)!.amount).toBe(90);
  });

  it('writes into the new tabs and leaves the old ones alone', async () => {
    const ctx = buildContext(loadConfig({ ...testEnv, SHEET_TAB_PREFIX: 'MP_' }));
    await ctx.db.client.createTab('Students', legacy.students[0]!);
    await ctx.db.client.append('Students', legacy.students.slice(1));
    await ensureTabs(ctx.db, 'MP_');
    const p = planMigration(legacy);
    await ctx.db.levels.insertMany(p.levels);
    await ctx.db.guardians.insertMany(p.guardians);
    await ctx.db.students.insertMany(p.students);
    expect((await ctx.db.students.all()).map((s) => s.firstName)).toEqual(['Atikah', 'Nuqman', 'Musfirah']);
    expect(await ctx.db.client.read('Students')).toHaveLength(4);
  });
});
