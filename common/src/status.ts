import type { PaymentStatus } from './constants';
import { round2 } from './fees';

/**
 * Payment status belongs to one monthly invoice.
 * Paid: fully paid. Partial: some paid. Overdue: nothing or not enough paid and the month is over. Pending: current month, unpaid.
 */
export function invoiceStatus(input: { total: number; paid: number; month: string; currentMonth: string }): PaymentStatus {
  const total = round2(input.total);
  const paid = round2(input.paid);
  if (total > 0 && paid >= total) return 'Paid';
  if (total === 0) return 'Paid';
  if (input.month < input.currentMonth) return 'Overdue';
  return paid > 0 ? 'Partial' : 'Pending';
}

/** Worst status first, used to summarise a guardian with several invoices or children. */
const ORDER: PaymentStatus[] = ['Overdue', 'Pending', 'Partial', 'Paid'];
export const worstStatus = (list: PaymentStatus[]): PaymentStatus => ORDER.find((s) => list.includes(s)) ?? 'Paid';
