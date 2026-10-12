import baseData from '../../seed/base-data.json';
import type { Day, Pricing, SessionUser } from '@minda/common';
import type { AppContext } from '../lib/context';
import { newId, type Db } from '../sheets/repo';
import { createUser } from '../services/auth';
import * as billing from '../services/billing';
import * as students from '../services/students';
import { snap } from '../services/snapshot';

/** Fills EMPTY tabs with starting content. Never overwrites rows that exist. */
export async function seedBase(db: Db): Promise<string[]> {
  const done: string[] = [];
  if ((await db.levels.all()).length === 0) {
    await db.levels.insertMany(baseData.levels.map((name, i) => ({ id: newId(), name, order: i + 1 })));
    done.push('levels');
  }
  if ((await db.subjects.all()).length === 0) {
    await db.subjects.insertMany(baseData.subjects.map((name) => ({ id: newId(), name })));
    done.push('subjects');
  }
  if ((await db.sessions.all()).length === 0) {
    await db.sessions.insertMany(baseData.sessions.map((s) => ({ id: newId(), ...s })));
    done.push('sessions');
  }
  if ((await db.pricing.all()).length === 0) {
    const levels = await db.levels.all();
    const rows: Pricing[] = Object.entries(baseData.tuition).flatMap(([levelName, amounts]) => {
      const level = levels.find((l) => l.name === levelName);
      return level ? amounts.map((amount, i): Pricing => ({ id: newId(), kind: 'tuition', levelId: level.id, qty: i + 1, area: '', amount })) : [];
    });
    rows.push(
      { id: newId(), kind: 'transport', levelId: '', qty: 0, area: 'inside', amount: baseData.transport.inside },
      { id: newId(), kind: 'transport', levelId: '', qty: 0, area: 'outside', amount: baseData.transport.outside },
    );
    await db.pricing.insertMany(rows);
    done.push('pricing');
  }
  if ((await db.settings.all()).length === 0) {
    await db.settings.insertMany(Object.entries(baseData.settings).map(([key, value]) => ({ key, value })));
    done.push('settings');
  }
  if ((await db.waTemplates.all()).length === 0) {
    await db.waTemplates.insertMany(baseData.waTemplates.map((t) => ({ id: newId(), ...t })));
    done.push('waTemplates');
  }
  return done;
}

export async function seedAdmin(ctx: AppContext, email: string, password: string): Promise<boolean> {
  if ((await ctx.db.users.all()).length > 0) return false;
  await createUser(ctx, { email, name: 'Administrator', role: 'admin', password, vehicleId: '' });
  return true;
}

const DEMO_USER: SessionUser = { id: 'demo-seed', email: 'demo@local', name: 'Demo seed', role: 'admin', vehicleId: '' };

/** Sample people, classes, vehicles and invoices for local development. Placeholder names only. */
export async function seedDemo(ctx: AppContext): Promise<void> {
  const { db } = ctx;
  if ((await db.students.all()).length > 0) return;
  let s = await snap(ctx);
  const session = (code: string) => s.sessions.find((x) => x.code === code)!.id;
  const level = (name: string) => s.levels.find((x) => x.name === name)!.id;
  const subject = (name: string) => s.subjects.find((x) => x.name === name)!.id;

  const teachers = [
    { name: 'Cikgu Farah', subject: 'Mathematics', contact: '012-345 6789' },
    { name: 'Mr Daniel Wong', subject: 'Science', contact: '013-456 7890' },
    { name: 'Puan Salmah', subject: 'Bahasa Melayu', contact: '014-567 8901' },
    { name: 'Ms Priya', subject: 'English', contact: '015-678 9012' },
  ].map((t) => ({ id: newId(), ...t, levelIds: s.levels.map((l) => l.id).join(',') }));
  await db.teachers.insertMany(teachers);

  const slot = (day: Day, code: string, start: string, end: string) => ({ id: newId(), day, start, end, sessionId: session(code) });
  const pattern: Record<string, ReturnType<typeof slot>[]> = {
    Mathematics: [slot('Mon', 'A', '14:00', '15:30'), slot('Wed', 'A', '14:00', '15:30')],
    Science: [slot('Tue', 'A', '14:00', '15:30'), slot('Thu', 'N', '19:30', '21:00')],
    'Bahasa Melayu': [slot('Mon', 'A', '15:30', '17:00'), slot('Wed', 'A', '15:30', '17:00')],
    English: [slot('Mon', 'N', '19:30', '21:00'), slot('Fri', 'M', '09:00', '10:30')],
  };
  for (const l of s.levels) {
    for (const subj of s.subjects) {
      const id = newId();
      await db.classes.insert({ id, levelId: l.id, subjectId: subj.id, teacherId: teachers.find((t) => t.subject === subj.name)!.id });
      await db.classSlots.insertMany((pattern[subj.name] ?? []).map((p) => ({ ...p, id: newId(), classId: id })));
    }
  }

  const vehicles = [
    { id: newId(), plate: 'JQK 4521', model: 'Toyota Hiace', driverName: 'Pak Ramli', driverPhone: '012-611 0042', seats: 14 },
    { id: newId(), plate: 'WCD 8830', model: 'Nissan Urvan', driverName: 'Encik Azman', driverPhone: '013-702 8830', seats: 14 },
    { id: newId(), plate: 'JNB 1192', model: 'Perodua Alza', driverName: 'Encik Hafiz', driverPhone: '016-340 1192', seats: 7 },
  ];
  await db.vehicles.insertMany(vehicles);
  await createUser(ctx, { email: 'driver@demo.local', name: 'Pak Ramli', role: 'driver', password: 'demo-driver-password', vehicleId: vehicles[0]!.id });

  s = await snap(ctx);
  const cls = (lvl: string, ...subs: string[]) => subs.map((n) => s.classes.find((c) => c.levelId === level(lvl) && c.subjectId === subject(n))!.id);
  const guardians = [
    { name: 'Aisyah Rahman', contact: '010-230 4501' }, { name: 'Tan Mei Ling', contact: '011-231 4512' },
    { name: 'Kumar Raj', contact: '012-232 4523' }, { name: 'Lim Wei Jian', contact: '013-233 4534' }, { name: 'Nurul Huda', contact: '014-234 4545' },
  ];
  const sched = (...x: [Day, string][]) => x.map(([day, code]) => ({ day, sessionId: session(code) }));
  const tr = (vehicle: number, area: 'inside' | 'outside', schedule: ReturnType<typeof sched>) => ({
    needed: true, area, vehicleId: vehicles[vehicle]!.id, plan: 'Both ways' as const, pickupFrom: 'School' as const, dropoffAddress: '', schedule,
  });
  const noTr = { needed: false, area: 'inside' as const, vehicleId: '', plan: 'Both ways' as const, pickupFrom: 'School' as const, dropoffAddress: '', schedule: [] };

  const people: [string, string, 'bin' | 'binti' | 'A/L' | 'A/P' | 'none', string, string, string[], ReturnType<typeof tr> | typeof noTr, string][] = [
    ['Adam', 'Aisyah Rahman', 'bin', 'Rahman', 'Primary 1', cls('Primary 1', 'Mathematics', 'Science'), tr(0, 'inside', sched(['Mon', 'A'], ['Mon', 'N'], ['Tue', 'A'], ['Wed', 'A'], ['Thu', 'N'])), '12 Jalan Merpati 3, Taman Kulai Utama, Kulai'],
    ['Dania', 'Aisyah Rahman', 'binti', 'Rahman', 'Secondary 4', cls('Secondary 4', 'Mathematics'), tr(0, 'inside', sched(['Mon', 'A'], ['Wed', 'A'])), '12 Jalan Merpati 3, Taman Kulai Utama, Kulai'],
    ['Haikal', 'Aisyah Rahman', 'bin', 'Rahman', 'Secondary 1', cls('Secondary 1', 'Bahasa Melayu', 'English', 'Mathematics'), noTr, '12 Jalan Merpati 3, Taman Kulai Utama, Kulai'],
    ['Xin Yi', 'Tan Mei Ling', 'none', 'Tan', 'Primary 3', cls('Primary 3', 'Mathematics'), tr(0, 'inside', sched(['Mon', 'A'], ['Wed', 'A'])), '8 Jalan Kenari 2, Taman Kenari, Kulai'],
    ['Zhi Xuan', 'Tan Mei Ling', 'none', 'Tan', 'Secondary 5', cls('Secondary 5', 'Bahasa Melayu', 'English', 'Mathematics'), noTr, '8 Jalan Kenari 2, Taman Kenari, Kulai'],
    ['Kishan', 'Kumar Raj', 'A/L', 'Kumar', 'Primary 6', cls('Primary 6', 'Bahasa Melayu', 'English', 'Mathematics'), tr(0, 'inside', sched(['Mon', 'A'], ['Wed', 'A'])), '31 Jalan Melati 5, Taman Indah, Kulai'],
    ['Rohan', 'Kumar Raj', 'A/L', 'Kumar', 'Primary 1', cls('Primary 1', 'Science', 'English'), tr(1, 'inside', sched(['Tue', 'A'], ['Thu', 'N'])), '31 Jalan Melati 5, Taman Indah, Kulai'],
    ['Jia Hui', 'Lim Wei Jian', 'none', 'Lim', 'Secondary 1', cls('Secondary 1', 'Science', 'English'), tr(1, 'inside', sched(['Mon', 'N'], ['Thu', 'N'])), '5 Jalan Bunga 1, Bandar Putra, Kulai'],
    ['Jun Hao', 'Lim Wei Jian', 'none', 'Lim', 'Primary 3', cls('Primary 3', 'Mathematics', 'Science'), noTr, '5 Jalan Bunga 1, Bandar Putra, Kulai'],
    ['Arif', 'Nurul Huda', 'bin', 'Yusof', 'Secondary 2', cls('Secondary 2', 'Mathematics', 'Science'), tr(2, 'outside', sched(['Mon', 'N'], ['Tue', 'A'], ['Wed', 'N'], ['Thu', 'N'], ['Fri', 'N'])), '22 Jalan Bunga Raya, Senai'],
  ];
  for (const [firstName, gname, connector, fatherName, lvl, classIds, transport, address] of people) {
    await students.createStudent(ctx, DEMO_USER, {
      firstName, connector, fatherName, levelId: level(lvl), address, classIds, firstTime: true, hasSibling: false,
      guardian: { name: gname, contact: guardians.find((g) => g.name === gname)!.contact }, transport,
    });
  }

  s = await snap(ctx);
  const [py, pm] = s.currentMonth.split('-').map(Number) as [number, number];
  const prev = pm === 1 ? `${py - 1}-12` : `${py}-${String(pm - 1).padStart(2, '0')}`;
  await billing.generateInvoices(ctx, DEMO_USER, { month: prev, extraLabel: '', extraAmount: 0 });
  await billing.generateInvoices(ctx, DEMO_USER, { month: s.currentMonth, extraLabel: '', extraAmount: 0 });
  s = await snap(ctx);
  const aisyah = s.guardians.find((g) => g.name === 'Aisyah Rahman')!;
  await billing.generateInvoices(ctx, DEMO_USER, { month: s.currentMonth, guardianId: aisyah.id, extraLabel: '', extraAmount: 0 }).catch(() => undefined);
  s = await snap(ctx);
  for (const inv of s.invoices) {
    const g = s.guardians.find((x) => x.id === inv.guardianId)!;
    const total = s.invoiceLines.filter((l) => l.invoiceId === inv.id).reduce((a, l) => a + l.amount, 0) + inv.extraAmount;
    if (inv.month === prev && g.name !== 'Lim Wei Jian') await billing.recordPayment(ctx, DEMO_USER, { invoiceId: inv.id, amount: total, method: 'DuitNow', date: `${prev}-05` });
    if (inv.month === s.currentMonth && g.name === 'Aisyah Rahman') await billing.recordPayment(ctx, DEMO_USER, { invoiceId: inv.id, amount: 300, method: 'Cash', date: s.today });
    if (inv.month === s.currentMonth && g.name === 'Tan Mei Ling') await billing.recordPayment(ctx, DEMO_USER, { invoiceId: inv.id, amount: total, method: 'Bank transfer', date: s.today });
  }
}

