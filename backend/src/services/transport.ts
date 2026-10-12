import {
  addDays, eachDate, weekdayOf,
  type RiderStatus, type RunEntry, type RunStatus, type SessionUser, type TransportRider, type VehicleBoardDto,
} from '@minda/common';
import type { AppContext } from '../lib/context';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { newId } from '../sheets/repo';
import { audit } from './audit';
import { activeStudents, levelName, snap, transportOf, type Snap } from './snapshot';

interface Planned { studentId: string; vehicleId: string; sessionId: string; skipped: boolean }

/** Who should ride on a date: weekly schedule on the Students > Transport tab. Skips are flagged, not dropped. */
function planFor(s: Snap, date: string): Planned[] {
  const day = weekdayOf(date);
  const out: Planned[] = [];
  for (const st of activeStudents(s)) {
    const t = transportOf(s, st.id);
    if (!t?.needed || !t.vehicleId) continue;
    const skipped = s.skips.some((k) => k.studentId === st.id && k.date === date);
    for (const slot of s.transportSlots.filter((x) => x.studentId === st.id && x.day === day)) {
      out.push({ studentId: st.id, vehicleId: t.vehicleId, sessionId: slot.sessionId, skipped });
    }
  }
  return out;
}

/** Rebuilds the list for a date. Idempotent. Keeps Picked and Absent marks, drops Waiting entries that no longer apply. */
export async function syncRun(ctx: AppContext, date: string): Promise<{ added: number; removed: number }> {
  const s = await snap(ctx);
  const plan = planFor(s, date).filter((p) => !p.skipped);
  const key = (studentId: string, sessionId: string) => `${studentId}|${sessionId}`;
  const wanted = new Map(plan.map((p) => [key(p.studentId, p.sessionId), p]));
  const existing = await ctx.db.runEntries.where((e) => e.date === date);
  const have = new Set(existing.map((e) => key(e.studentId, e.sessionId)));

  const fresh: RunEntry[] = plan.filter((p) => !have.has(key(p.studentId, p.sessionId)))
    .map((p) => ({ id: newId(), date, vehicleId: p.vehicleId, studentId: p.studentId, sessionId: p.sessionId, status: 'Waiting' as const }));
  await ctx.db.runEntries.insertMany(fresh);

  let removed = 0;
  for (const e of existing) {
    const w = wanted.get(key(e.studentId, e.sessionId));
    if (!w && e.status === 'Waiting') { await ctx.db.runEntries.remove(e.id); removed++; }
    else if (w && w.vehicleId !== e.vehicleId && e.status === 'Waiting') await ctx.db.runEntries.update(e.id, { vehicleId: w.vehicleId });
  }
  return { added: fresh.length, removed };
}

export async function vehicleBoard(ctx: AppContext, vehicleId: string, date?: string): Promise<VehicleBoardDto> {
  let s = await snap(ctx);
  const d = date ?? s.today;
  const v = s.vehicles.find((x) => x.id === vehicleId);
  if (!v) throw notFound('Vehicle');
  if (d >= s.today) await syncRun(ctx, d);
  const entries = (await ctx.db.runEntries.where((e) => e.date === d && e.vehicleId === vehicleId));
  s = await snap(ctx);

  const rider = (studentId: string, sessionId: string, status: RiderStatus, entryId: string): TransportRider | null => {
    const st = s.students.find((x) => x.id === studentId);
    if (!st) return null;
    const t = transportOf(s, studentId);
    const g = s.guardians.find((x) => x.id === st.guardianId);
    return {
      entryId, studentId, firstName: st.firstName, levelName: levelName(s, st.levelId), guardian: { id: st.guardianId, name: g?.name ?? '' },
      sessionId, pickup: t?.pickupFrom === 'Home' ? st.address : 'School', dropoff: t?.dropoffAddress || st.address,
      plan: t?.plan ?? 'Both ways', status,
    };
  };

  const onList = entries.map((e) => rider(e.studentId, e.sessionId, e.status, e.id)).filter((r): r is TransportRider => !!r);
  const skipped = planFor(s, d).filter((p) => p.skipped && p.vehicleId === vehicleId)
    .map((p) => rider(p.studentId, p.sessionId, 'Not riding', '')).filter((r): r is TransportRider => !!r);
  const riders = [...onList, ...skipped].sort((a, b) => a.firstName.localeCompare(b.firstName) || a.sessionId.localeCompare(b.sessionId));

  const count = (st: RiderStatus) => riders.filter((r) => r.status === st).length;
  const used = new Set(s.transport.filter((t) => t.needed && t.vehicleId === vehicleId && s.students.find((x) => x.id === t.studentId)?.active).map((t) => t.studentId)).size;
  return {
    date: d,
    vehicle: { id: v.id, plate: v.plate, model: v.model, driverName: v.driverName, driverPhone: v.driverPhone, seats: v.seats, used },
    sessions: s.sessions.map((x) => ({ sessionId: x.id, count: onList.filter((r) => r.sessionId === x.id).length })),
    stats: { onList: onList.length, picked: count('Picked'), waiting: count('Waiting'), absent: count('Absent'), notRiding: count('Not riding') },
    riders,
  };
}

/** Driver or office marks a rider. A driver can only touch riders of their own vehicle. */
export async function setRunStatus(ctx: AppContext, user: SessionUser, entryId: string, status: RunStatus): Promise<void> {
  const e = await ctx.db.runEntries.find(entryId);
  if (!e) throw notFound('Rider');
  if (user.role === 'driver' && user.vehicleId !== e.vehicleId) throw forbidden();
  await ctx.db.runEntries.update(entryId, { status });
  await audit(ctx, user, 'run.status', 'runEntry', entryId, status);
}

const MAX_SKIP_DAYS = 62;

/** "Skip a day": the student stays on their weekly schedule but is Not riding on these dates. */
export async function addSkip(ctx: AppContext, user: SessionUser, studentId: string, from: string, to?: string): Promise<{ days: number }> {
  const s = await snap(ctx);
  const st = s.students.find((x) => x.id === studentId && x.active);
  if (!st) throw notFound('Student');
  if (!transportOf(s, studentId)?.needed) throw badRequest('This student does not use transport');
  const end = to ?? from;
  if (end > addDays(from, MAX_SKIP_DAYS)) throw badRequest(`Skip at most ${MAX_SKIP_DAYS} days at a time`);
  const taken = new Set(s.skips.filter((k) => k.studentId === studentId).map((k) => k.date));
  const rows = [...eachDate(from, end)].filter((d) => !taken.has(d)).map((date) => ({ id: newId(), studentId, date, createdBy: user.id }));
  await ctx.db.skips.insertMany(rows);
  if (from <= s.today && end >= s.today) await syncRun(ctx, s.today);
  await audit(ctx, user, 'skip.add', 'student', studentId, `${from}..${end}`);
  return { days: rows.length };
}

export async function undoSkip(ctx: AppContext, user: SessionUser, studentId: string, date: string): Promise<void> {
  const n = await ctx.db.skips.removeWhere((k) => k.studentId === studentId && k.date === date);
  if (n === 0) throw notFound('Skip');
  const s = await snap(ctx);
  if (date >= s.today) await syncRun(ctx, date);
  await audit(ctx, user, 'skip.undo', 'student', studentId, date);
}
