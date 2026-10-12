import { Router, json, type CookieOptions, type Response } from 'express';
import {
  CSRF_COOKIE, SESSION_COOKIE, classInputSchema, dateQuerySchema, guardianInputSchema, invoiceGenerateSchema, levelInputSchema,
  loginSchema, monthQuerySchema, paymentInputSchema, pricingInputSchema, runStatusInputSchema, sessionInputSchema, skipInputSchema,
  studentInputSchema, subjectInputSchema, teacherInputSchema, userInputSchema, vehicleInputSchema, waTemplateInputSchema,
  idSchema, isIsoDate, type SessionUserDto,
} from '@minda/common';
import { z } from 'zod';
import type { AppContext } from '../lib/context';
import { AppError, conflict, notFound, unauthorized } from '../lib/errors';
import { param, parse, wrap } from '../lib/http';
import { loginLimiter, requireAuth, requireRole, sendLimiter } from '../middleware/security';
import { newId } from '../sheets/repo';
import { audit } from '../services/audit';
import * as auth from '../services/auth';
import * as billing from '../services/billing';
import { classDtos, snap, split } from '../services/snapshot';
import * as students from '../services/students';
import { teacherProfile } from '../services/teachers';
import * as transport from '../services/transport';
import * as wa from '../services/whatsapp';
import { crud } from './crud';

const REFRESH_COOKIE = 'mp_refresh';
const OFFICE = ['admin', 'staff'] as const;
const OFFICE_TEACHER = ['admin', 'staff', 'teacher'] as const;

function setSessionCookies(ctx: AppContext, res: Response, s: auth.IssuedSession) {
  const base: CookieOptions = { httpOnly: true, secure: ctx.config.COOKIE_SECURE, sameSite: 'strict' };
  res.cookie(SESSION_COOKIE, s.accessToken, { ...base, path: '/', maxAge: ctx.config.ACCESS_TTL_MINUTES * 60_000 });
  res.cookie(REFRESH_COOKIE, s.refreshToken, { ...base, path: '/api/v1/auth', maxAge: ctx.config.REFRESH_TTL_DAYS * 86400_000 });
  res.cookie(CSRF_COOKIE, s.csrfToken, { httpOnly: false, secure: ctx.config.COOKIE_SECURE, sameSite: 'strict', path: '/', maxAge: ctx.config.REFRESH_TTL_DAYS * 86400_000 });
}
function clearCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export function apiRouter(ctx: AppContext): Router {
  const api = Router();
  const guard = requireAuth(ctx);

  api.get('/health', (_req, res) => { res.json({ ok: true }); });

  // ── Auth ──────────────────────────────────────────────────────────────
  const a = Router();
  a.post('/login', loginLimiter, wrap(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const s = await auth.login(ctx, email, password);
    setSessionCookies(ctx, res, s);
    res.json(s.user satisfies SessionUserDto);
  }));
  a.post('/refresh', wrap(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string') throw unauthorized();
    try {
      const s = await auth.refresh(ctx, token);
      setSessionCookies(ctx, res, s);
      res.json(s.user);
    } catch (e) { clearCookies(res); throw e; }
  }));
  a.post('/logout', guard, wrap(async (req, res) => {
    await auth.logout(ctx, req.sid, req.user);
    clearCookies(res);
    res.status(204).end();
  }));
  a.get('/me', guard, (req, res) => { res.json(req.user); });
  api.use('/auth', a);

  // Everything below needs a signed-in user.
  api.use(guard);

  api.get('/overview', requireRole(...OFFICE), wrap(async (req, res) => {
    res.json(await billing.overview(ctx, parse(monthQuerySchema, req.query).month));
  }));

  // ── Students ─────────────────────────────────────────────────────────
  const st = Router();
  st.get('/', requireRole(...OFFICE_TEACHER), wrap(async (req, res) => {
    res.json(await students.listStudents(ctx, parse(monthQuerySchema, req.query).month));
  }));
  st.get('/transport', requireRole(...OFFICE), wrap(async (_req, res) => { res.json(await students.transportRows(ctx)); }));
  st.get('/:id', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await students.studentProfile(ctx, param(req, 'id'))); }));
  st.post('/', requireRole(...OFFICE), wrap(async (req, res) => {
    res.status(201).json(await students.createStudent(ctx, req.user!, parse(studentInputSchema, req.body)));
  }));
  st.put('/:id', requireRole(...OFFICE), wrap(async (req, res) => {
    await students.updateStudent(ctx, req.user!, param(req, 'id'), parse(studentInputSchema, req.body));
    res.status(204).end();
  }));
  st.delete('/:id', requireRole(...OFFICE), wrap(async (req, res) => {
    const purge = req.query.purge === 'true';
    if (purge && req.user!.role !== 'admin') throw new AppError(403, 'Only an admin can remove a record permanently', 'forbidden');
    await students.deleteStudent(ctx, req.user!, param(req, 'id'), purge);
    res.status(204).end();
  }));
  api.use('/students', st);

  // ── Guardians ────────────────────────────────────────────────────────
  const g = Router();
  g.get('/', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await billing.guardians(ctx, parse(monthQuerySchema, req.query).month)); }));
  g.get('/:id', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await billing.guardianProfile(ctx, param(req, 'id'))); }));
  g.use(crud(ctx, {
    key: 'guardians', schema: guardianInputSchema, read: [...OFFICE], write: [...OFFICE], label: 'Guardian',
    make: (i, id) => ({ id, ...i }),
    guardDelete: async (row) => {
      if ((await ctx.db.students.where((x) => x.active && x.guardianId === row.id)).length) throw conflict('This guardian still has students');
    },
  }));
  api.use('/guardians', g);

  // ── Teachers ─────────────────────────────────────────────────────────
  api.get('/teachers/:id/profile', requireRole(...OFFICE_TEACHER), wrap(async (req, res) => { res.json(await teacherProfile(ctx, param(req, 'id'))); }));
  api.use('/teachers', crud(ctx, {
    key: 'teachers', schema: teacherInputSchema, read: [...OFFICE_TEACHER], write: [...OFFICE], label: 'Teacher',
    make: (i, id) => ({ id, name: i.name, subject: i.subject, contact: i.contact, levelIds: i.levelIds.join(',') }),
    guardDelete: async (row) => { if ((await ctx.db.classes.where((c) => c.teacherId === row.id)).length) throw conflict('This teacher still has classes'); },
  }));

  // ── Master data ──────────────────────────────────────────────────────
  api.use('/sessions', crud(ctx, {
    key: 'sessions', schema: sessionInputSchema, read: [...OFFICE_TEACHER, 'driver'], write: [...OFFICE], label: 'Session',
    make: (i, id) => ({ id, ...i }),
    guardWrite: async (i, self) => { if ((await ctx.db.sessions.where((x) => x.code === i.code && x.id !== self)).length) throw conflict(`Code ${i.code} is already used`); },
    guardDelete: async (row) => {
      const s = await snap(ctx);
      if (s.classSlots.some((x) => x.sessionId === row.id) || s.transportSlots.some((x) => x.sessionId === row.id)) throw conflict('This session is still used by classes or transport');
    },
  }));
  api.use('/levels', crud(ctx, {
    key: 'levels', schema: levelInputSchema, read: [...OFFICE_TEACHER], write: [...OFFICE], label: 'Level',
    make: (i, id) => ({ id, ...i }),
    guardDelete: async (row) => {
      const s = await snap(ctx);
      if (s.students.some((x) => x.levelId === row.id) || s.classes.some((x) => x.levelId === row.id) || s.pricing.some((x) => x.levelId === row.id)) throw conflict('This level is still in use');
    },
  }));
  api.use('/subjects', crud(ctx, {
    key: 'subjects', schema: subjectInputSchema, read: [...OFFICE_TEACHER], write: [...OFFICE], label: 'Subject',
    make: (i, id) => ({ id, ...i }),
    guardDelete: async (row) => { if ((await ctx.db.classes.where((c) => c.subjectId === row.id)).length) throw conflict('This subject still has classes'); },
  }));
  api.use('/vehicles', crud(ctx, {
    key: 'vehicles', schema: vehicleInputSchema, read: [...OFFICE_TEACHER], write: [...OFFICE], label: 'Vehicle',
    make: (i, id) => ({ id, ...i }),
    guardDelete: async (row) => {
      const s = await snap(ctx);
      if (s.transport.some((t) => t.needed && t.vehicleId === row.id)) throw conflict('Students still ride this vehicle');
    },
  }));
  api.use('/pricing', crud(ctx, {
    key: 'pricing', schema: pricingInputSchema, read: [...OFFICE], write: [...OFFICE], label: 'Price',
    make: (i, id) => ({ id, kind: i.kind, levelId: i.kind === 'tuition' ? i.levelId : '', qty: i.kind === 'tuition' ? i.qty : 0, area: i.kind === 'transport' ? i.area : '', amount: i.amount }),
  }));
  api.use('/whatsapp/templates', crud(ctx, {
    key: 'waTemplates', schema: waTemplateInputSchema, read: [...OFFICE], write: [...OFFICE], label: 'Template',
    make: (i, id) => ({ id, ...i }),
  }));

  // ── Classes (a class has weekly slots) ───────────────────────────────
  const cl = Router();
  const writeClass = async (id: string, input: z.infer<typeof classInputSchema>) => {
    const s = await snap(ctx);
    if (!s.levels.some((l) => l.id === input.levelId)) throw conflict('Unknown level');
    if (!s.subjects.some((x) => x.id === input.subjectId)) throw conflict('Unknown subject');
    if (input.teacherId && !s.teachers.some((t) => t.id === input.teacherId)) throw conflict('Unknown teacher');
    if (s.classes.some((c) => c.levelId === input.levelId && c.subjectId === input.subjectId && c.id !== id)) throw conflict('This level already has that subject');
    for (const slot of input.slots) if (!s.sessions.some((x) => x.id === slot.sessionId)) throw conflict('Unknown session');
    return s;
  };
  cl.get('/', requireRole(...OFFICE_TEACHER), wrap(async (_req, res) => { res.json(classDtos(await snap(ctx))); }));
  cl.post('/', requireRole(...OFFICE), wrap(async (req, res) => {
    const input = parse(classInputSchema, req.body);
    const id = newId();
    await writeClass(id, input);
    await ctx.db.classes.insert({ id, levelId: input.levelId, subjectId: input.subjectId, teacherId: input.teacherId });
    await ctx.db.classSlots.insertMany(input.slots.map((s) => ({ id: newId(), classId: id, ...s })));
    await audit(ctx, req.user!, 'classes.create', 'classes', id);
    res.status(201).json({ id });
  }));
  cl.put('/:id', requireRole(...OFFICE), wrap(async (req, res) => {
    const id = param(req, 'id');
    if (!(await ctx.db.classes.find(id))) throw notFound('Class');
    const input = parse(classInputSchema, req.body);
    await writeClass(id, input);
    await ctx.db.classes.update(id, { levelId: input.levelId, subjectId: input.subjectId, teacherId: input.teacherId });
    await ctx.db.classSlots.removeWhere((x) => x.classId === id);
    await ctx.db.classSlots.insertMany(input.slots.map((s) => ({ id: newId(), classId: id, ...s })));
    await audit(ctx, req.user!, 'classes.update', 'classes', id);
    res.status(204).end();
  }));
  cl.delete('/:id', requireRole(...OFFICE), wrap(async (req, res) => {
    const id = param(req, 'id');
    if (!(await ctx.db.classes.find(id))) throw notFound('Class');
    if ((await ctx.db.students.where((x) => x.active && split(x.classIds).includes(id))).length) throw conflict('Students are still enrolled in this class');
    await ctx.db.classSlots.removeWhere((x) => x.classId === id);
    await ctx.db.classes.remove(id);
    await audit(ctx, req.user!, 'classes.delete', 'classes', id);
    res.status(204).end();
  }));
  api.use('/classes', cl);

  // ── Transport ────────────────────────────────────────────────────────
  const tr = Router();
  tr.get('/vehicles/:id/board', requireRole(...OFFICE), wrap(async (req, res) => {
    res.json(await transport.vehicleBoard(ctx, param(req, 'id'), parse(dateQuerySchema, req.query).date));
  }));
  tr.get('/mine', requireRole('driver'), wrap(async (req, res) => {
    if (!req.user!.vehicleId) throw notFound('Vehicle');
    res.json(await transport.vehicleBoard(ctx, req.user!.vehicleId));
  }));
  tr.post('/refresh', requireRole(...OFFICE), wrap(async (req, res) => {
    const { date } = parse(dateQuerySchema, req.body ?? {});
    res.json(await transport.syncRun(ctx, date ?? (await snap(ctx)).today));
  }));
  tr.patch('/entries/:id', requireRole(...OFFICE, 'driver'), wrap(async (req, res) => {
    await transport.setRunStatus(ctx, req.user!, param(req, 'id'), parse(runStatusInputSchema, req.body).status);
    res.status(204).end();
  }));
  tr.post('/skips', requireRole(...OFFICE), wrap(async (req, res) => {
    const i = parse(skipInputSchema, req.body);
    res.status(201).json(await transport.addSkip(ctx, req.user!, i.studentId, i.dateFrom, i.dateTo));
  }));
  tr.delete('/skips', requireRole(...OFFICE), wrap(async (req, res) => {
    const studentId = parse(idSchema, String(req.query.studentId ?? ''));
    const date = String(req.query.date ?? '');
    if (!isIsoDate(date)) throw new AppError(400, 'Use YYYY-MM-DD');
    await transport.undoSkip(ctx, req.user!, studentId, date);
    res.status(204).end();
  }));
  api.use('/transport', tr);

  // ── Billing ──────────────────────────────────────────────────────────
  const b = Router();
  b.get('/', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await billing.billingRows(ctx, req.user!, parse(monthQuerySchema, req.query).month)); }));
  b.post('/generate', requireRole(...OFFICE), wrap(async (req, res) => {
    res.status(201).json(await billing.generateInvoices(ctx, req.user!, parse(invoiceGenerateSchema, req.body)));
  }));
  b.get('/invoices/:id', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await billing.getInvoice(ctx, param(req, 'id'))); }));
  b.post('/payments', requireRole(...OFFICE), wrap(async (req, res) => {
    res.status(201).json(await billing.recordPayment(ctx, req.user!, parse(paymentInputSchema, req.body)));
  }));
  b.get('/receipts/:id', requireRole(...OFFICE), wrap(async (req, res) => { res.json(await billing.getReceipt(ctx, param(req, 'id'))); }));
  api.use('/billing', b);

  // ── WhatsApp ─────────────────────────────────────────────────────────
  api.get('/whatsapp/status', requireRole('admin'), wrap(async (_req, res) => {
    await wa.initWhatsApp(ctx).catch((e) => console.error('whatsapp init failed:', (e as Error).message));
    res.json(wa.waState(ctx));
  }));
  api.get('/whatsapp/stream', requireRole('admin'), (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const send = (s: unknown) => res.write(`data: ${JSON.stringify(s)}\n\n`);
    send(wa.waState(ctx));
    const off = wa.onWaState(send);
    wa.initWhatsApp(ctx).catch((e) => console.error('whatsapp init failed:', (e as Error).message));
    req.on('close', off);
  });
  api.post('/whatsapp/send-invoice', sendLimiter, requireRole(...OFFICE), json({ limit: '8mb' }), wrap(async (req, res) => {
    const body = parse(z.object({ invoiceId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), pdfBase64: z.string().min(10).max(8_000_000) }).strict(), req.body);
    await wa.sendInvoice(ctx, req.user!, body.invoiceId, body.pdfBase64);
    res.json({ success: true });
  }));

  // ── Admin ────────────────────────────────────────────────────────────
  api.get('/users', requireRole('admin'), wrap(async (_req, res) => {
    res.json((await ctx.db.users.all()).map(({ passwordHash: _p, failedLogins: _f, lockedUntil: _l, ...u }) => u));
  }));
  api.post('/users', requireRole('admin'), wrap(async (req, res) => {
    const u = await auth.createUser(ctx, parse(userInputSchema, req.body));
    await audit(ctx, req.user!, 'users.create', 'users', u.id, u.role);
    res.status(201).json(u);
  }));
  api.patch('/users/:id/active', requireRole('admin'), wrap(async (req, res) => {
    const id = param(req, 'id');
    if (id === req.user!.id) throw conflict('You cannot disable your own account');
    const { active } = parse(z.object({ active: z.boolean() }).strict(), req.body);
    if (!(await ctx.db.users.update(id, { active }))) throw notFound('User');
    await audit(ctx, req.user!, 'users.active', 'users', id, String(active));
    res.status(204).end();
  }));
  api.get('/audit', requireRole('admin'), wrap(async (_req, res) => {
    res.json((await ctx.db.auditLog.all()).slice(-200).reverse());
  }));
  api.get('/settings', requireRole(...OFFICE), wrap(async (_req, res) => { res.json(await ctx.db.settings.all()); }));
  api.put('/settings/:key', requireRole('admin'), wrap(async (req, res) => {
    const key = z.string().regex(/^[a-z]+(\.[a-zA-Z]+)*$/).max(60).parse(req.params.key);
    const { value } = parse(z.object({ value: z.string().trim().max(200) }).strict(), req.body);
    if (await ctx.db.settings.find(key)) await ctx.db.settings.update(key, { value });
    else await ctx.db.settings.insert({ key, value });
    await audit(ctx, req.user!, 'settings.update', 'settings', key);
    res.status(204).end();
  }));

  return api;
}
