import {
  fullName, invoiceStatus, monthlyFee, round2, todayIso, monthOf,
  type ClassDto, type ClassGroup, type ClassSlot, type Guardian, type Invoice, type InvoiceExtra, type InvoiceLine, type InvoiceSummary,
  type Level, type Payment, type PaymentStatus, type Pricing, type Session, type Skip, type Student, type StudentTransport,
  type Subject, type Teacher, type TransportSlot, type Vehicle, type SlotDto, type FeeBreakdown,
} from '@minda/common';
import type { AppContext } from '../lib/context';

/** Everything the services need, read once per request (rows come from the cached repositories). */
export interface Snap {
  levels: Level[]; subjects: Subject[]; sessions: Session[]; teachers: Teacher[]; guardians: Guardian[];
  classes: ClassGroup[]; classSlots: ClassSlot[]; vehicles: Vehicle[]; students: Student[];
  transport: StudentTransport[]; transportSlots: TransportSlot[]; skips: Skip[]; pricing: Pricing[];
  invoices: Invoice[]; invoiceLines: InvoiceLine[]; invoiceExtras: InvoiceExtra[]; payments: Payment[];
  today: string; currentMonth: string;
}

export async function snap(ctx: AppContext): Promise<Snap> {
  const d = ctx.db;
  const [levels, subjects, sessions, teachers, guardians, classes, classSlots, vehicles, students, transport, transportSlots, skips, pricing, invoices, invoiceLines, invoiceExtras, payments] =
    await Promise.all([
      d.levels.all(), d.subjects.all(), d.sessions.all(), d.teachers.all(), d.guardians.all(), d.classes.all(), d.classSlots.all(),
      d.vehicles.all(), d.students.all(), d.studentTransport.all(), d.transportSlots.all(), d.skips.all(), d.pricing.all(),
      d.invoices.all(), d.invoiceLines.all(), d.invoiceExtras.all(), d.payments.all(),
    ]);
  const today = todayIso(ctx.config.TZ_NAME);
  return {
    levels: [...levels].sort((a, b) => a.order - b.order), subjects, sessions, teachers, guardians, classes, classSlots, vehicles,
    students, transport, transportSlots, skips, pricing, invoices, invoiceLines, invoiceExtras, payments, today, currentMonth: monthOf(today),
  };
}

export const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export const activeStudents = (s: Snap) => s.students.filter((x) => x.active);
export const levelName = (s: Snap, id: string) => s.levels.find((l) => l.id === id)?.name ?? '';
export const subjectName = (s: Snap, id: string) => s.subjects.find((x) => x.id === id)?.name ?? '';
export const transportOf = (s: Snap, studentId: string) => s.transport.find((t) => t.studentId === studentId);
export const vehicleLink = (s: Snap, id: string) => {
  const v = s.vehicles.find((x) => x.id === id);
  return v ? { id: v.id, plate: v.plate } : null;
};
export const teacherLink = (s: Snap, id: string) => {
  const t = s.teachers.find((x) => x.id === id);
  return t ? { id: t.id, name: t.name } : null;
};

export const slotsOfClass = (s: Snap, classId: string): SlotDto[] =>
  s.classSlots.filter((x) => x.classId === classId).map(({ day, start, end, sessionId }) => ({ day, start, end, sessionId }));

export function classDtos(s: Snap): ClassDto[] {
  return s.classes.map((c) => ({
    id: c.id, levelId: c.levelId, levelName: levelName(s, c.levelId), subjectId: c.subjectId, subject: subjectName(s, c.subjectId),
    teacher: teacherLink(s, c.teacherId), slots: slotsOfClass(s, c.id),
    studentCount: activeStudents(s).filter((st) => split(st.classIds).includes(c.id)).length,
  }));
}

export function subjectsOf(s: Snap, student: Student): string[] {
  return split(student.classIds).map((id) => s.classes.find((c) => c.id === id)).filter((c): c is ClassGroup => !!c).map((c) => subjectName(s, c.subjectId));
}

export function feeOf(s: Snap, student: Student): FeeBreakdown {
  const t = transportOf(s, student.id);
  return monthlyFee(s.pricing, {
    levelId: student.levelId, subjectCount: split(student.classIds).length,
    transportNeeded: !!t?.needed, area: t?.area ?? 'inside',
  });
}

export function invoiceTotal(s: Snap, inv: Invoice): number {
  const lines = s.invoiceLines.filter((l) => l.invoiceId === inv.id).reduce((a, l) => a + l.amount, 0);
  const extras = s.invoiceExtras.filter((e) => e.invoiceId === inv.id).reduce((a, e) => a + (e.kind === 'Discount' ? -e.amount : e.amount), 0);
  return round2(lines + extras + inv.extraAmount);
}
export const invoicePaid = (s: Snap, inv: Invoice): number =>
  round2(s.payments.filter((p) => p.invoiceId === inv.id).reduce((a, p) => a + p.amount, 0));

export function invoiceSummary(s: Snap, inv: Invoice): InvoiceSummary {
  const total = invoiceTotal(s, inv);
  const paid = invoicePaid(s, inv);
  return { id: inv.id, number: inv.number, month: inv.month, total, paid, status: invoiceStatus({ total, paid, month: inv.month, currentMonth: s.currentMonth }) };
}

export const invoiceFor = (s: Snap, guardianId: string, month: string) =>
  s.invoices.find((i) => i.guardianId === guardianId && i.month === month);

/** Status of a student for a month = status of the family invoice for that month. No invoice yet means Pending. */
export function studentStatus(s: Snap, student: Student, month: string): PaymentStatus {
  const inv = invoiceFor(s, student.guardianId, month);
  if (!inv) return 'Pending';
  return invoiceSummary(s, inv).status;
}

export const studentFullName = (st: Student) => fullName(st);
