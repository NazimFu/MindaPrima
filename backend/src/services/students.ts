import {
  AREA_LABEL, fullName, type SessionUser, type StudentInput, type StudentListItem, type StudentProfileDto,
  type StudentTransportRow, type Student,
} from '@minda/common';
import type { AppContext } from '../lib/context';
import { badRequest, conflict, notFound } from '../lib/errors';
import { newId } from '../sheets/repo';
import { audit } from './audit';
import {
  activeStudents, feeOf, invoiceSummary, levelName, slotsOfClass, snap, split, studentStatus, subjectName,
  subjectsOf, teacherLink, transportOf, vehicleLink, type Snap,
} from './snapshot';

const digits = (s: string) => s.replace(/\D/g, '');

export async function listStudents(ctx: AppContext, month?: string): Promise<StudentListItem[]> {
  const s = await snap(ctx);
  const m = month ?? s.currentMonth;
  return activeStudents(s).map((st) => {
    const g = s.guardians.find((x) => x.id === st.guardianId);
    return {
      id: st.id, firstName: st.firstName, levelId: st.levelId, levelName: levelName(s, st.levelId), subjects: subjectsOf(s, st),
      guardian: { id: st.guardianId, name: g?.name ?? '' }, status: studentStatus(s, st, m),
      transportNeeded: !!transportOf(s, st.id)?.needed,
    };
  });
}

export async function transportRows(ctx: AppContext): Promise<StudentTransportRow[]> {
  const s = await snap(ctx);
  return activeStudents(s).flatMap((st) => {
    const t = transportOf(s, st.id);
    if (!t?.needed) return [];
    return [{
      studentId: st.id, firstName: st.firstName, levelName: levelName(s, st.levelId), vehicle: vehicleLink(s, t.vehicleId),
      area: t.area, plan: t.plan,
      schedule: s.transportSlots.filter((x) => x.studentId === st.id).map(({ day, sessionId }) => ({ day, sessionId })),
    }];
  });
}

export async function studentProfile(ctx: AppContext, id: string): Promise<StudentProfileDto> {
  const s = await snap(ctx);
  const st = s.students.find((x) => x.id === id && x.active);
  if (!st) throw notFound('Student');
  const g = s.guardians.find((x) => x.id === st.guardianId);
  const t = transportOf(s, id);
  return {
    id: st.id, firstName: st.firstName, connector: st.connector, fatherName: st.fatherName, fullName: fullName(st),
    levelId: st.levelId, levelName: levelName(s, st.levelId), registeredAt: st.registeredAt, address: st.address,
    firstTime: st.firstTime, hasSibling: st.hasSibling,
    guardian: { id: st.guardianId, name: g?.name ?? '', contact: g?.contact ?? '' },
    siblings: activeStudents(s).filter((x) => x.guardianId === st.guardianId && x.id !== id).map((x) => ({ id: x.id, name: x.firstName })),
    subjects: split(st.classIds).flatMap((cid) => {
      const c = s.classes.find((x) => x.id === cid);
      return c ? [{ classId: c.id, subject: subjectName(s, c.subjectId), teacher: teacherLink(s, c.teacherId), slots: slotsOfClass(s, c.id) }] : [];
    }),
    transport: {
      needed: !!t?.needed, area: t?.area ?? 'inside', vehicle: vehicleLink(s, t?.vehicleId ?? ''), plan: t?.plan ?? 'Both ways',
      pickupFrom: t?.pickupFrom ?? 'School', dropoffAddress: t?.dropoffAddress ?? '',
      schedule: s.transportSlots.filter((x) => x.studentId === id).map(({ day, sessionId }) => ({ day, sessionId })),
    },
    fee: feeOf(s, st),
    invoices: s.invoices.filter((i) => i.guardianId === st.guardianId).sort((a, b) => b.month.localeCompare(a.month)).map((i) => invoiceSummary(s, i)),
  };
}

function validateInput(s: Snap, input: StudentInput, selfId?: string) {
  if (!s.levels.some((l) => l.id === input.levelId)) throw badRequest('Unknown level');
  for (const cid of input.classIds) {
    const c = s.classes.find((x) => x.id === cid);
    if (!c) throw badRequest('Unknown class');
    if (c.levelId !== input.levelId) throw badRequest('A class does not belong to the selected level');
  }
  const t = input.transport;
  if (t.needed) {
    const v = s.vehicles.find((x) => x.id === t.vehicleId);
    if (!v) throw badRequest('Choose a vehicle');
    const used = s.transport.filter((x) => x.needed && x.vehicleId === v.id && x.studentId !== selfId && s.students.find((st) => st.id === x.studentId)?.active).length;
    if (used >= v.seats) throw conflict(`${v.plate} is full`);
    if (t.schedule.length === 0) throw badRequest('Pick at least one day and session for transport');
    for (const slot of t.schedule) {
      if (!s.sessions.some((x) => x.id === slot.sessionId)) throw badRequest('Unknown session');
    }
  }
}

async function resolveGuardian(ctx: AppContext, s: Snap, input: StudentInput): Promise<string> {
  const g = input.guardian;
  if ('id' in g) {
    if (!s.guardians.some((x) => x.id === g.id)) throw badRequest('Unknown guardian');
    return g.id;
  }
  const match = s.guardians.find((x) => digits(x.contact) === digits(g.contact));
  if (match) return match.id;
  const id = newId();
  await ctx.db.guardians.insert({ id, name: g.name, contact: g.contact, address: input.address });
  return id;
}

async function writeTransport(ctx: AppContext, studentId: string, t: StudentInput['transport'], address: string) {
  await ctx.db.studentTransport.removeWhere((x) => x.studentId === studentId);
  await ctx.db.transportSlots.removeWhere((x) => x.studentId === studentId);
  await ctx.db.studentTransport.insert({
    studentId, needed: t.needed, area: t.area, vehicleId: t.needed ? t.vehicleId : '', plan: t.plan, pickupFrom: t.pickupFrom,
    dropoffAddress: t.dropoffAddress || address,
  });
  if (t.needed) {
    const seen = new Set<string>();
    const rows = t.schedule.filter((x) => !seen.has(`${x.day}|${x.sessionId}`) && seen.add(`${x.day}|${x.sessionId}`))
      .map((x) => ({ id: newId(), studentId, day: x.day, sessionId: x.sessionId }));
    await ctx.db.transportSlots.insertMany(rows);
  }
}

export async function createStudent(ctx: AppContext, user: SessionUser, input: StudentInput): Promise<{ id: string }> {
  const s = await snap(ctx);
  validateInput(s, input);
  const guardianId = await resolveGuardian(ctx, s, input);
  const id = newId();
  const row: Student = {
    id, firstName: input.firstName, connector: input.connector, fatherName: input.fatherName, levelId: input.levelId,
    registeredAt: s.today, address: input.address, guardianId, classIds: input.classIds.join(','),
    firstTime: input.firstTime, hasSibling: input.hasSibling || activeStudents(s).some((x) => x.guardianId === guardianId), active: true,
  };
  await ctx.db.students.insert(row);
  await writeTransport(ctx, id, input.transport, input.address);
  await audit(ctx, user, 'student.create', 'student', id);
  return { id };
}

export async function updateStudent(ctx: AppContext, user: SessionUser, id: string, input: StudentInput): Promise<void> {
  const s = await snap(ctx);
  const existing = s.students.find((x) => x.id === id && x.active);
  if (!existing) throw notFound('Student');
  validateInput(s, input, id);
  const guardianId = await resolveGuardian(ctx, s, input);
  await ctx.db.students.update(id, {
    firstName: input.firstName, connector: input.connector, fatherName: input.fatherName, levelId: input.levelId,
    address: input.address, guardianId, classIds: input.classIds.join(','), firstTime: input.firstTime, hasSibling: input.hasSibling,
  });
  await writeTransport(ctx, id, input.transport, input.address);
  await audit(ctx, user, 'student.update', 'student', id);
}

/** Soft delete keeps past invoices intact. `purge` (admin) removes the personal record for good. */
export async function deleteStudent(ctx: AppContext, user: SessionUser, id: string, purge: boolean): Promise<void> {
  const s = await snap(ctx);
  const st = s.students.find((x) => x.id === id);
  if (!st) throw notFound('Student');
  await ctx.db.students.update(id, { active: false });
  await ctx.db.studentTransport.update(id, { needed: false, vehicleId: '' });
  if (purge) {
    await ctx.db.transportSlots.removeWhere((x) => x.studentId === id);
    await ctx.db.skips.removeWhere((x) => x.studentId === id);
    await ctx.db.runEntries.removeWhere((x) => x.studentId === id);
    await ctx.db.studentTransport.remove(id);
    for (const l of s.invoiceLines.filter((x) => x.studentId === id)) {
      await ctx.db.invoiceLines.update(l.id, { studentName: 'Removed student', studentId: '' });
    }
    await ctx.db.students.remove(id);
  }
  await audit(ctx, user, purge ? 'student.purge' : 'student.delete', 'student', id);
}

export const areaText = (area: 'inside' | 'outside') => AREA_LABEL[area].toLowerCase();
