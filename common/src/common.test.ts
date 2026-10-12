import { describe, expect, it } from 'vitest';
import {
  fullName, fromSheet, toSheet, invoiceStatus, tuitionFee, transportFee, monthlyFee, formatRange, formatClock, monthCode, weekdayOf,
  studentInputSchema, sessionInputSchema, type Pricing,
} from './index';

const pricing: Pricing[] = [
  { id: '1', kind: 'tuition', levelId: 'p1', qty: 1, area: '', amount: 80 },
  { id: '2', kind: 'tuition', levelId: 'p1', qty: 2, area: '', amount: 140 },
  { id: '3', kind: 'transport', levelId: '', qty: 0, area: 'inside', amount: 40 },
  { id: '4', kind: 'transport', levelId: '', qty: 0, area: 'outside', amount: 60 },
];

describe('names', () => {
  it('builds the combined name', () => {
    expect(fullName({ firstName: 'Adam', connector: 'bin', fatherName: 'Rahman' })).toBe('Adam Bin Rahman');
    expect(fullName({ firstName: 'Dania', connector: 'binti', fatherName: 'Rahman' })).toBe('Dania Binti Rahman');
    expect(fullName({ firstName: 'Kishan', connector: 'A/L', fatherName: 'Kumar' })).toBe('Kishan A/L Kumar');
    expect(fullName({ firstName: 'Mei', connector: 'A/P', fatherName: 'Tan' })).toBe('Mei A/P Tan');
    expect(fullName({ firstName: 'Xin Yi', connector: 'none', fatherName: 'Tan' })).toBe('Xin Yi Tan');
  });
});

describe('fees', () => {
  it('uses the tier, falls back to the highest lower tier, adds transport by student area', () => {
    expect(tuitionFee(pricing, 'p1', 2)).toBe(140);
    expect(tuitionFee(pricing, 'p1', 5)).toBe(140);
    expect(tuitionFee(pricing, 'p1', 0)).toBe(0);
    expect(tuitionFee(pricing, 'other', 2)).toBe(0);
    expect(transportFee(pricing, 'outside')).toBe(60);
    expect(monthlyFee(pricing, { levelId: 'p1', subjectCount: 2, transportNeeded: true, area: 'inside' })).toEqual({ tuition: 140, transport: 40, total: 180 });
    expect(monthlyFee(pricing, { levelId: 'p1', subjectCount: 2, transportNeeded: false, area: 'outside' }).total).toBe(140);
  });
});

describe('payment status', () => {
  const base = { month: '2026-10', currentMonth: '2026-10' };
  it('derives Paid, Partial, Pending and Overdue', () => {
    expect(invoiceStatus({ ...base, total: 100, paid: 100 })).toBe('Paid');
    expect(invoiceStatus({ ...base, total: 100, paid: 40 })).toBe('Partial');
    expect(invoiceStatus({ ...base, total: 100, paid: 0 })).toBe('Pending');
    expect(invoiceStatus({ month: '2026-09', currentMonth: '2026-10', total: 100, paid: 40 })).toBe('Overdue');
    expect(invoiceStatus({ month: '2026-09', currentMonth: '2026-10', total: 100, paid: 100 })).toBe('Paid');
  });
});

describe('spreadsheet safety', () => {
  it('escapes formula starters and restores them', () => {
    for (const v of ['=1+1', '+60123456789', '-5', '@SUM(A1)']) {
      expect(toSheet(v).startsWith("'")).toBe(true);
      expect(fromSheet(toSheet(v))).toBe(v);
    }
    expect(toSheet('Adam')).toBe('Adam');
    expect(fromSheet("'quoted")).toBe("'quoted");
  });
});

describe('formatting and dates', () => {
  it('formats times and ranges', () => {
    expect(formatClock('19:30')).toBe('7:30 pm');
    expect(formatClock('00:15')).toBe('12:15 am');
    expect(formatRange('14:00', '15:30')).toBe('2:00 to 3:30 pm');
    expect(formatRange('11:00', '12:30')).toBe('11:00 am to 12:30 pm');
    expect(monthCode('2026-10')).toBe('OCT');
    expect(weekdayOf('2026-10-12')).toBe('Mon');
  });
});

describe('schemas', () => {
  it('rejects unknown fields and bad values', () => {
    expect(sessionInputSchema.safeParse({ name: 'Morning', code: 'm', color: '#112233', start: '07:00', end: '12:00' }).success).toBe(true);
    expect(sessionInputSchema.safeParse({ name: 'Bad', code: 'MM', color: '#112233', start: '07:00', end: '12:00' }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ name: 'Bad', code: 'B', color: 'red', start: '07:00', end: '12:00' }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ name: 'Bad', code: 'B', color: '#112233', start: '12:00', end: '07:00' }).success).toBe(false);
    expect(studentInputSchema.safeParse({}).success).toBe(false);
  });
});
