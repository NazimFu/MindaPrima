import type { Area, ClassGroup, Guardian, Level, Pricing, Student, StudentTransport, Subject, Teacher } from '@minda/common';
import { newId } from '../sheets/repo';

/** Legacy tabs as read from the old spreadsheet (header row included). */
export interface LegacyTabs { students: string[][]; teachers: string[][]; prices: string[][] }

export interface MigrationPlan {
  levels: Level[]; subjects: Subject[]; teachers: Teacher[]; guardians: Guardian[]; classes: ClassGroup[];
  students: Student[]; studentTransport: StudentTransport[]; pricing: Pricing[];
  notes: string[];
}

const SUBJECT_ALIASES: Record<string, string> = { math: 'Mathematics', maths: 'Mathematics', mathematics: 'Mathematics' };
const canonicalSubject = (s: string) => SUBJECT_ALIASES[s.trim().toLowerCase()] ?? s.trim();
const digits = (s: string) => s.replace(/\D/g, '');

/** Malaysian numbers: keep a leading 0 or 60, add 0 when it was lost (spreadsheets drop it). */
function phone(raw: string, notes: string[], who: string): string {
  const d = digits(raw);
  if (!d) return '';
  if (d.startsWith('0') || d.startsWith('60')) return d;
  notes.push(`${who}: contact ${raw} had no leading 0, stored as 0${d}`);
  return `0${d}`;
}

function table(rows: string[][]): Record<string, string>[] {
  const [head = [], ...body] = rows;
  return body.filter((r) => r.some((c) => c.trim() !== '')).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** Pure function: turns the old tabs into rows for the new tabs. Nothing is written here. */
export function planMigration(legacy: LegacyTabs): MigrationPlan {
  const notes: string[] = [];

  // Levels and tuition from the Prices matrix (P1..P6 = Primary 1..6, S1..S6 = Secondary 1..6).
  const codes = [...Array(6)].map((_, i) => `P${i + 1}`).concat([...Array(6)].map((_, i) => `S${i + 1}`));
  const levelOf = (code: string) => `${code[0] === 'P' ? 'Primary' : 'Secondary'} ${code[1]}`;
  const levels: Level[] = codes.map((c, i) => ({ id: newId(), name: levelOf(c), order: i + 1 }));
  const levelId = (name: string) => levels.find((l) => l.name.toLowerCase() === name.trim().toLowerCase())?.id;

  const pricing: Pricing[] = [];
  const priceRows = table(legacy.prices);
  for (const r of priceRows) {
    const qty = Number(r.qtySubjects);
    if (!Number.isInteger(qty) || qty < 1) continue;
    codes.forEach((c, i) => {
      const v = r[c];
      if (v === undefined || v === '') return;
      const amount = Number(v);
      if (!Number.isFinite(amount)) { notes.push(`Prices: ignored "${v}" for ${c} with ${qty} subjects`); return; }
      pricing.push({ id: newId(), kind: 'tuition', levelId: levels[i]!.id, qty, area: '', amount });
    });
  }
  const t = priceRows.find((r) => r.TI || r.TO);
  const transport: Record<Area, number | undefined> = { inside: t?.TI ? Number(t.TI) : undefined, outside: t?.TO ? Number(t.TO) : undefined };
  (['inside', 'outside'] as const).forEach((area) => {
    const amount = transport[area];
    if (amount !== undefined && Number.isFinite(amount)) pricing.push({ id: newId(), kind: 'transport', levelId: '', qty: 0, area, amount });
    else notes.push(`Prices: no transport fee found for ${area} limit, set it in the app`);
  });

  // Teachers
  const teachers: Teacher[] = table(legacy.teachers).map((r) => ({
    id: r.id || newId(), name: r.name ?? '', subject: canonicalSubject(r.subject ?? ''), contact: phone(r.contact ?? '', notes, `Teacher ${r.name}`), levelIds: '',
  }));

  // Subjects: everything taught or studied
  const studentRows = table(legacy.students);
  const subjectNames = new Set<string>();
  teachers.forEach((x) => x.subject && subjectNames.add(x.subject));
  studentRows.forEach((r) => (r.subjects ?? '').split(/[,;]/).map(canonicalSubject).filter(Boolean).forEach((s) => subjectNames.add(s)));
  const subjects: Subject[] = [...subjectNames].sort().map((name) => ({ id: newId(), name }));
  const subjectId = (name: string) => subjects.find((s) => s.name === name)!.id;

  // Guardians, deduplicated by name and contact
  const guardians: Guardian[] = [];
  const guardianFor = (name: string, contactRaw: string, address: string): Guardian => {
    const contact = phone(contactRaw, notes, `Guardian ${name}`);
    let g = guardians.find((x) => x.name.toLowerCase() === name.toLowerCase() && x.contact === contact);
    if (!g) { g = { id: newId(), name, contact, address }; guardians.push(g); }
    return g;
  };

  // Classes: one per level and subject in use. Teacher is set only when exactly one teacher teaches that subject.
  const classes: ClassGroup[] = [];
  const classFor = (lid: string, sid: string, subject: string): ClassGroup => {
    let c = classes.find((x) => x.levelId === lid && x.subjectId === sid);
    if (!c) {
      const candidates = teachers.filter((x) => x.subject === subject);
      c = { id: newId(), levelId: lid, subjectId: sid, teacherId: candidates.length === 1 ? candidates[0]!.id : '' };
      classes.push(c);
    }
    return c;
  };

  const students: Student[] = [];
  const studentTransport: StudentTransport[] = [];
  const perGuardian = new Map<string, number>();
  for (const r of studentRows) {
    const lid = levelId(r.level ?? '');
    if (!lid) { notes.push(`Student ${r.name}: level "${r.level}" is not a known level, skipped`); continue; }
    const g = guardianFor(r.guardian ?? '', r.guardianContact ?? '', r.address ?? '');
    perGuardian.set(g.id, (perGuardian.get(g.id) ?? 0) + 1);
    const classIds = (r.subjects ?? '').split(/[,;]/).map(canonicalSubject).filter(Boolean).map((s) => classFor(lid, subjectId(s), s).id);
    const ms = Number((r.id ?? '').replace(/\D/g, ''));
    const registeredAt = Number.isFinite(ms) && ms > 1e12 ? new Date(ms).toISOString().slice(0, 10) : '';
    const id = r.id || newId();
    students.push({
      id, firstName: r.name ?? '', connector: 'none', fatherName: '', levelId: lid, registeredAt, address: r.address ?? '',
      guardianId: g.id, classIds: classIds.join(','), firstTime: /^y/i.test(r.firstTime ?? ''), hasSibling: false, active: true,
    });
    const needed = /^y/i.test(r.transport ?? '');
    studentTransport.push({
      studentId: id, needed, area: /^out/i.test(r.transportArea ?? '') ? 'outside' : 'inside', vehicleId: '', plan: 'Both ways', pickupFrom: 'School', dropoffAddress: '',
    });
    if (needed) notes.push(`Student ${r.name}: rides transport but has no vehicle or days yet, set them in the app`);
  }
  students.forEach((s) => { s.hasSibling = (perGuardian.get(s.guardianId) ?? 0) > 1; });
  if (students.length) notes.push('Student names were copied into First name with Connector "none". Add Connector and Father\'s name in the app.');
  notes.push('Payment status and MonthlySnapshots were not migrated. Status now comes from invoices, so generate invoices in Billing.');
  notes.push('Classes were created per level and subject with no days or times. Add them under Settings, Classes.');

  return { levels, subjects, teachers, guardians, classes, students, studentTransport, pricing, notes };
}
