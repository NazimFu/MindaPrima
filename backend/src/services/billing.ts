import {
  AREA_LABEL, fullName, monthCode, round2,
  type BillingDto, type BillingRow, type GuardianListItem, type GuardianProfileDto, type InvoiceDto, type InvoiceLine, type OverviewDto,
  type PaymentDto, type PaymentStatus, type ReceiptDto, type SessionUser,
} from '@minda/common';
import type { AppContext } from '../lib/context';
import { badRequest, conflict, notFound } from '../lib/errors';
import { newId } from '../sheets/repo';
import { audit } from './audit';
import {
  activeStudents, feeOf, invoiceFor, invoicePaid, invoiceSummary, invoiceTotal, levelName, snap, studentStatus, subjectsOf, transportOf, type Snap,
} from './snapshot';

const paymentDto = (p: { id: string; receiptNumber: string; amount: number; method: PaymentDto['method']; date: string }): PaymentDto =>
  ({ id: p.id, receiptNumber: p.receiptNumber, amount: p.amount, method: p.method, date: p.date });

export async function generateInvoices(
  ctx: AppContext, user: SessionUser, input: { month: string; guardianId?: string; extraLabel: string; extraAmount: number },
): Promise<{ created: number; skipped: number }> {
  const s = await snap(ctx);
  if (input.extraAmount > 0 && !input.guardianId) throw badRequest('An extra charge needs a guardian');
  const guardians = input.guardianId ? s.guardians.filter((g) => g.id === input.guardianId) : s.guardians;
  if (input.guardianId && guardians.length === 0) throw notFound('Guardian');

  const prefix = monthCode(input.month);
  const used = s.invoices.filter((i) => i.month === input.month).map((i) => Number(i.number.slice(prefix.length)) || 0);
  let seq = Math.max(0, ...used);
  let created = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const g of guardians) {
    const kids = activeStudents(s).filter((x) => x.guardianId === g.id);
    if (kids.length === 0) continue;
    if (invoiceFor(s, g.id, input.month)) { skipped++; continue; }
    seq += 1;
    const id = newId();
    const lines: InvoiceLine[] = kids.map((k) => {
      const fee = feeOf(s, k);
      const t = transportOf(s, k.id);
      const parts = [...subjectsOf(s, k)];
      if (t?.needed) parts.push(`transport (${AREA_LABEL[t.area].toLowerCase()})`);
      return {
        id: newId(), invoiceId: id, studentId: k.id, studentName: fullName(k), levelName: levelName(s, k.levelId),
        description: parts.join(', '), amount: fee.total,
      };
    });
    await ctx.db.invoices.insert({
      id, number: `${prefix}${String(seq).padStart(4, '0')}`, guardianId: g.id, month: input.month,
      extraLabel: input.extraLabel, extraAmount: input.extraAmount, createdAt: now,
    });
    await ctx.db.invoiceLines.insertMany(lines);
    created++;
  }
  await audit(ctx, user, 'invoice.generate', 'invoice', input.guardianId ?? 'all', `${input.month} created ${created}`);
  return { created, skipped };
}

function dto(s: Snap, invId: string): InvoiceDto {
  const inv = s.invoices.find((i) => i.id === invId);
  if (!inv) throw notFound('Invoice');
  const g = s.guardians.find((x) => x.id === inv.guardianId);
  const sum = invoiceSummary(s, inv);
  return {
    id: inv.id, number: inv.number, month: inv.month, createdAt: inv.createdAt,
    guardian: { id: inv.guardianId, name: g?.name ?? '', contact: g?.contact ?? '', address: g?.address ?? '' },
    lines: s.invoiceLines.filter((l) => l.invoiceId === inv.id).map((l) => ({
      studentId: l.studentId, studentName: l.studentName, levelName: l.levelName, description: l.description, amount: l.amount,
    })),
    extras: [
      ...(inv.extraAmount !== 0 ? [{ label: inv.extraLabel || 'Extra', detail: '', kind: (inv.extraAmount < 0 ? 'Discount' : 'Addition') as 'Addition' | 'Discount', amount: Math.abs(inv.extraAmount) }] : []),
      ...s.invoiceExtras.filter((e) => e.invoiceId === inv.id).map((e) => ({ label: e.label, detail: e.detail, kind: e.kind, amount: e.amount })),
    ],
    total: sum.total, paid: sum.paid, balance: round2(sum.total - sum.paid),
    status: sum.status, payments: s.payments.filter((p) => p.invoiceId === inv.id).map(paymentDto),
  };
}

export async function getInvoice(ctx: AppContext, id: string): Promise<InvoiceDto> {
  return dto(await snap(ctx), id);
}

/** Invoices for the current month are created when Billing is opened. Existing ones are kept; past months are never filled in. */
/** Replace the extra fees and discounts on an invoice. */
export async function setInvoiceExtras(
  ctx: AppContext, user: SessionUser, invoiceId: string, extras: { label: string; detail: string; kind: 'Addition' | 'Discount'; amount: number }[],
): Promise<InvoiceDto> {
  const s = await snap(ctx);
  const inv = s.invoices.find((i) => i.id === invoiceId);
  if (!inv) throw notFound('Invoice');
  const lines = s.invoiceLines.filter((l) => l.invoiceId === inv.id).reduce((a, l) => a + l.amount, 0);
  const total = round2(lines + extras.reduce((a, e) => a + (e.kind === 'Discount' ? -e.amount : e.amount), 0));
  if (total < invoicePaid(s, inv)) throw conflict('The total cannot be less than what is already paid');
  await ctx.db.invoiceExtras.removeWhere((e) => e.invoiceId === inv.id);
  await ctx.db.invoiceExtras.insertMany(extras.map((e) => ({ id: newId(), invoiceId: inv.id, ...e })));
  if (inv.extraAmount !== 0 || inv.extraLabel) await ctx.db.invoices.update(inv.id, { extraAmount: 0, extraLabel: '' });
  await audit(ctx, user, 'invoice.extras', 'invoice', inv.id, `${extras.length} rows`);
  return dto(await snap(ctx), inv.id);
}

export async function billingRows(ctx: AppContext, user: SessionUser, month?: string): Promise<BillingDto> {
  let s = await snap(ctx);
  const m = month ?? s.currentMonth;
  if (m === s.currentMonth) {
    const missing = s.guardians.some((g) => activeStudents(s).some((k) => k.guardianId === g.id) && !invoiceFor(s, g.id, m));
    if (missing) { await generateInvoices(ctx, user, { month: m, extraLabel: '', extraAmount: 0 }); s = await snap(ctx); }
  }
  const rows = s.guardians.flatMap((g): BillingRow[] => {
    const kids = activeStudents(s).filter((x) => x.guardianId === g.id);
    if (kids.length === 0) return [];
    const inv = invoiceFor(s, g.id, m);
    return [{
      guardian: { id: g.id, name: g.name, contact: g.contact }, children: kids.map((k) => ({ id: k.id, name: k.firstName, levelName: levelName(s, k.levelId), subjects: subjectsOf(s, k), fee: feeOf(s, k).total, status: studentStatus(s, k, m) })),
      invoice: inv ? invoiceSummary(s, inv) : null, expected: round2(kids.reduce((a, k) => a + feeOf(s, k).total, 0)),
    }];
  });
  return { month: m, rows };
}

export async function recordPayment(
  ctx: AppContext, user: SessionUser, input: { invoiceId: string; amount: number; method: PaymentDto['method']; date: string },
): Promise<PaymentDto> {
  const s = await snap(ctx);
  const inv = s.invoices.find((i) => i.id === input.invoiceId);
  if (!inv) throw notFound('Invoice');
  const balance = round2(invoiceTotal(s, inv) - invoicePaid(s, inv));
  if (input.amount > balance) throw conflict('Payment is more than the balance');

  const prefix = (await ctx.db.settings.find('receipt.prefix'))?.value || 'RCP';
  const seq = Math.max(0, ...s.payments.map((p) => Number(p.receiptNumber.slice(prefix.length)) || 0)) + 1;
  const row = {
    id: newId(), invoiceId: inv.id, receiptNumber: `${prefix}${String(seq).padStart(4, '0')}`, amount: round2(input.amount),
    method: input.method, date: input.date, createdBy: user.id,
  };
  await ctx.db.payments.insert(row);
  await audit(ctx, user, 'payment.record', 'invoice', inv.id, row.receiptNumber);
  return paymentDto(row);
}

export async function getReceipt(ctx: AppContext, paymentId: string): Promise<ReceiptDto> {
  const s = await snap(ctx);
  const p = s.payments.find((x) => x.id === paymentId);
  if (!p) throw notFound('Receipt');
  const invoice = dto(s, p.invoiceId);
  const upTo = s.payments.filter((x) => x.invoiceId === p.invoiceId && (x.date < p.date || (x.date === p.date && x.receiptNumber <= p.receiptNumber)));
  const received = round2(upTo.reduce((a, x) => a + x.amount, 0));
  return { payment: paymentDto(p), invoice, received, balance: round2(invoice.total - received) };
}

export function guardianList(s: Snap, month: string): GuardianListItem[] {
  return s.guardians.flatMap((g): GuardianListItem[] => {
    const kids = activeStudents(s).filter((x) => x.guardianId === g.id);
    if (kids.length === 0) return [];
    const inv = invoiceFor(s, g.id, month);
    const sum = inv ? invoiceSummary(s, inv) : null;
    return [{
      id: g.id, name: g.name, contact: g.contact, children: kids.map((k) => ({ id: k.id, name: k.firstName })),
      owed: sum ? round2(sum.total - sum.paid) : round2(kids.reduce((a, k) => a + feeOf(s, k).total, 0)),
      status: sum?.status ?? 'Pending',
    }];
  });
}

export async function guardians(ctx: AppContext, month?: string): Promise<GuardianListItem[]> {
  const s = await snap(ctx);
  return guardianList(s, month ?? s.currentMonth);
}

export async function guardianProfile(ctx: AppContext, id: string): Promise<GuardianProfileDto> {
  const s = await snap(ctx);
  const g = s.guardians.find((x) => x.id === id);
  if (!g) throw notFound('Guardian');
  const kids = activeStudents(s).filter((x) => x.guardianId === id);
  const invoices = s.invoices.filter((i) => i.guardianId === id).sort((a, b) => b.month.localeCompare(a.month));
  return {
    id: g.id, name: g.name, contact: g.contact, address: g.address,
    children: kids.map((k) => ({ id: k.id, firstName: k.firstName, levelName: levelName(s, k.levelId), fee: feeOf(s, k).total })),
    familyTotal: round2(kids.reduce((a, k) => a + feeOf(s, k).total, 0)),
    owed: round2(invoices.reduce((a, i) => a + invoiceTotal(s, i) - invoicePaid(s, i), 0)),
    invoices: invoices.map((i) => ({ ...invoiceSummary(s, i), receipts: s.payments.filter((p) => p.invoiceId === i.id).map((p) => ({ id: p.id, number: p.receiptNumber })) })),
  };
}

export async function overview(ctx: AppContext, month?: string): Promise<OverviewDto> {
  const s = await snap(ctx);
  const m = month ?? s.currentMonth;
  const list = guardianList(s, m);
  const monthInvoices = s.invoices.filter((i) => i.month === m);
  const expected = round2(monthInvoices.reduce((a, i) => a + invoiceTotal(s, i), 0));
  const collected = round2(monthInvoices.reduce((a, i) => a + invoicePaid(s, i), 0));
  const statusCounts: Record<PaymentStatus, number> = { Paid: 0, Partial: 0, Pending: 0, Overdue: 0 };
  for (const g of list) statusCounts[g.status]++;
  const byStatus: OverviewDto['byStatus'] = { Paid: { students: 0, amount: 0 }, Partial: { students: 0, amount: 0 }, Pending: { students: 0, amount: 0 }, Overdue: { students: 0, amount: 0 } };
  for (const st of activeStudents(s)) {
    const row = byStatus[studentStatus(s, st, m)];
    row.students++;
    row.amount = round2(row.amount + feeOf(s, st).total);
  }
  const levels = [...s.levels].sort((a, b) => a.order - b.order).map((l) => ({ name: l.name, count: activeStudents(s).filter((x) => x.levelId === l.id).length }));
  const [y, mo] = m.split('-').map(Number) as [number, number];
  const prevKey = `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, '0')}`;
  const prevInvoices = s.invoices.filter((i) => i.month === prevKey);
  const prevBilled = prevInvoices.reduce((a, i) => a + invoiceTotal(s, i), 0);
  const previous = prevBilled > 0 ? { month: prevKey, collectedPercent: Math.round((prevInvoices.reduce((a, i) => a + invoicePaid(s, i), 0) / prevBilled) * 100) } : null;
  return {
    month: m,
    counts: { students: activeStudents(s).length, guardians: list.length, teachers: s.teachers.length, vehicles: s.vehicles.length },
    money: { expected, collected, owed: round2(list.reduce((a, g) => a + g.owed, 0)) },
    statusCounts, byStatus, levels, previous,
    guardians: [...list].sort((a, b) => worstOrder(b.status) - worstOrder(a.status)),
  };
}
const worstOrder = (st: PaymentStatus) => ['Paid', 'Partial', 'Pending', 'Overdue'].indexOf(st);
