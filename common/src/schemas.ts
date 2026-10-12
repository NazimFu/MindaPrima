import { z } from 'zod';
import {
  AREAS, CONNECTORS, DAYS, PAYMENT_METHODS, PICKUP_FROM, PRICING_KINDS, ROLES, RUN_STATUSES, TRANSPORT_PLANS,
} from './constants';
import { isIsoDate, isMonthKey } from './dates';

/** All API input is validated with these schemas. Unknown fields are rejected. */

// eslint-disable-next-line no-control-regex
const NO_CONTROL = /^[^\u0000-\u001F\u007F]*$/;

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid id');
const text = (max = 120) => z.string().trim().min(1).max(max).regex(NO_CONTROL, 'Invalid characters');
const optionalText = (max = 300) => z.string().trim().max(max).regex(NO_CONTROL, 'Invalid characters').default('');
const phone = z.string().trim().regex(/^[0-9+\-\s()]{6,20}$/, 'Invalid phone number');
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
const isoDate = z.string().refine(isoDateOk, 'Use YYYY-MM-DD');
function isoDateOk(s: string) { return isIsoDate(s); }
const month = z.string().refine((s) => isMonthKey(s), 'Use YYYY-MM');
const money = z.number().finite().min(0).max(100000);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
}).strict();

export const passwordSchema = z.string().min(10).max(200);

export const userInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: text(100),
  role: z.enum(ROLES),
  password: passwordSchema,
  vehicleId: idSchema.or(z.literal('')).default(''),
}).strict();

export const sessionInputSchema = z.object({
  name: text(40),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]$/, 'One letter'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use #RRGGBB'),
  start: clock,
  end: clock,
}).strict().refine((s) => s.start < s.end, { message: 'Start must be before end', path: ['end'] });

export const levelInputSchema = z.object({ name: text(40), order: z.number().int().min(0).max(1000) }).strict();
export const subjectInputSchema = z.object({ name: text(60) }).strict();

export const teacherInputSchema = z.object({
  name: text(100), subject: text(60), contact: phone, levelIds: z.array(idSchema).max(30).default([]),
}).strict();

export const guardianInputSchema = z.object({ name: text(100), contact: phone, address: optionalText(300) }).strict();

export const vehicleInputSchema = z.object({
  plate: text(20), model: text(60), driverName: text(100), driverPhone: phone, seats: z.number().int().min(1).max(80),
}).strict();

export const slotInputSchema = z.object({
  day: z.enum(DAYS), start: clock, end: clock, sessionId: idSchema,
}).strict().refine((s) => s.start < s.end, { message: 'Start must be before end', path: ['end'] });

export const classInputSchema = z.object({
  levelId: idSchema, subjectId: idSchema, teacherId: idSchema.or(z.literal('')).default(''),
  slots: z.array(slotInputSchema).max(14),
}).strict();

export const pricingInputSchema = z.object({
  kind: z.enum(PRICING_KINDS),
  levelId: idSchema.or(z.literal('')).default(''),
  qty: z.number().int().min(0).max(20).default(0),
  area: z.enum(AREAS).or(z.literal('')).default(''),
  amount: money,
}).strict().refine(
  (p) => (p.kind === 'tuition' ? p.levelId !== '' && p.qty > 0 : p.area !== ''),
  { message: 'Tuition needs a level and subject count, transport needs an area' },
);

const scheduleItem = z.object({ day: z.enum(DAYS), sessionId: idSchema }).strict();

export const transportInputSchema = z.object({
  needed: z.boolean(),
  area: z.enum(AREAS),
  vehicleId: idSchema.or(z.literal('')).default(''),
  plan: z.enum(TRANSPORT_PLANS),
  pickupFrom: z.enum(PICKUP_FROM),
  dropoffAddress: optionalText(300),
  schedule: z.array(scheduleItem).max(35),
}).strict();

export const studentInputSchema = z.object({
  firstName: text(60),
  connector: z.enum(CONNECTORS),
  fatherName: text(80).or(z.literal('')).default(''),
  levelId: idSchema,
  address: optionalText(300),
  guardian: z.union([
    z.object({ id: idSchema }).strict(),
    z.object({ name: text(100), contact: phone }).strict(),
  ]),
  classIds: z.array(idSchema).max(30),
  firstTime: z.boolean().default(true),
  hasSibling: z.boolean().default(false),
  transport: transportInputSchema,
}).strict();

export const skipInputSchema = z.object({
  studentId: idSchema,
  dateFrom: isoDate,
  dateTo: isoDate.optional(),
}).strict().refine((s) => !s.dateTo || s.dateTo >= s.dateFrom, { message: 'End date is before start date', path: ['dateTo'] });

export const runStatusInputSchema = z.object({ status: z.enum(RUN_STATUSES) }).strict();

export const invoiceGenerateSchema = z.object({
  month,
  guardianId: idSchema.optional(),
  extraLabel: optionalText(80),
  extraAmount: money.default(0),
}).strict();

export const paymentInputSchema = z.object({
  invoiceId: idSchema,
  amount: money.refine((n) => n > 0, 'Amount must be above zero'),
  method: z.enum(PAYMENT_METHODS),
  date: isoDate,
}).strict();

export const waTemplateInputSchema = z.object({ name: text(60), body: text(1000) }).strict();

export const monthQuerySchema = z.object({ month: month.optional() });
export const dateQuerySchema = z.object({ date: isoDate.optional() });

export type StudentInput = z.infer<typeof studentInputSchema>;
export type TransportInput = z.infer<typeof transportInputSchema>;
export type ClassInput = z.infer<typeof classInputSchema>;
export type SessionInput = z.infer<typeof sessionInputSchema>;
export type PricingInput = z.infer<typeof pricingInputSchema>;
