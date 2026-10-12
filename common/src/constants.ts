/**
 * Fixed vocabulary of the app (structure, not business data).
 * Business data such as fees, sessions, levels and subjects lives in the spreadsheet.
 */

export const ROLES = ['admin', 'staff', 'teacher', 'driver'] as const;
export type Role = (typeof ROLES)[number];

export const CONNECTORS = ['bin', 'binti', 'A/L', 'A/P', 'none'] as const;
export type Connector = (typeof CONNECTORS)[number];

export const CONNECTOR_LABEL: Record<Connector, string> = {
  bin: 'Bin',
  binti: 'Binti',
  'A/L': 'A/L',
  'A/P': 'A/P',
  none: 'None',
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];
/** Days shown in transport schedules. */
export const SCHOOL_DAYS: readonly Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const TRANSPORT_PLANS = ['Both ways', 'Pick-up only', 'Drop-off only'] as const;
export type TransportPlan = (typeof TRANSPORT_PLANS)[number];

export const PICKUP_FROM = ['School', 'Home'] as const;
export type PickupFrom = (typeof PICKUP_FROM)[number];

export const AREAS = ['inside', 'outside'] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABEL: Record<Area, string> = { inside: 'Inside limit', outside: 'Outside limit' };

export const RUN_STATUSES = ['Waiting', 'Picked', 'Absent'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
/** "Not riding" is derived from a skip, it is never stored as a run entry. */
export type RiderStatus = RunStatus | 'Not riding';

export const PAYMENT_STATUSES = ['Paid', 'Partial', 'Pending', 'Overdue'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['Cash', 'Bank transfer', 'DuitNow', 'Cheque', 'Other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRICING_KINDS = ['tuition', 'transport'] as const;
export type PricingKind = (typeof PRICING_KINDS)[number];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const API_PREFIX = '/api/v1';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_COOKIE = 'mp_csrf';
export const SESSION_COOKIE = 'mp_session';
