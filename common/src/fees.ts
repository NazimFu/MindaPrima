import type { Area } from './constants';
import type { Pricing } from './types';

/**
 * Tuition for a level and number of subjects. Exact tier if it exists,
 * otherwise the highest tier below it (so 5 subjects use the 4 subject price if there is no 5).
 */
export function tuitionFee(pricing: Pricing[], levelId: string, subjectCount: number): number {
  if (subjectCount <= 0) return 0;
  const tiers = pricing.filter((p) => p.kind === 'tuition' && p.levelId === levelId).sort((a, b) => a.qty - b.qty);
  const exact = tiers.find((t) => t.qty === subjectCount);
  if (exact) return exact.amount;
  const lower = tiers.filter((t) => t.qty < subjectCount).pop();
  return lower ? lower.amount : 0;
}

/** Transport fee depends on the student's address (inside or outside limit), never on the vehicle. */
export function transportFee(pricing: Pricing[], area: Area): number {
  return pricing.find((p) => p.kind === 'transport' && p.area === area)?.amount ?? 0;
}

export interface FeeBreakdown { tuition: number; transport: number; total: number }

export function monthlyFee(
  pricing: Pricing[],
  input: { levelId: string; subjectCount: number; transportNeeded: boolean; area: Area },
): FeeBreakdown {
  const tuition = tuitionFee(pricing, input.levelId, input.subjectCount);
  const transport = input.transportNeeded ? transportFee(pricing, input.area) : 0;
  return { tuition, transport, total: tuition + transport };
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const formatRM = (n: number) =>
  `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
