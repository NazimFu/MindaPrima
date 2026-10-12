import request from 'supertest';
import type { Express } from 'express';
import { loadConfig } from '../src/config';
import { createApp } from '../src/app';
import { buildContext } from '../src/lib/build-context';
import { ensureTabs } from '../src/sheets/repo';
import { seedAdmin, seedBase, seedDemo } from '../src/scripts/seed';
import { createUser } from '../src/services/auth';
import type { AppContext } from '../src/lib/context';

export const ORIGIN = 'http://localhost:9002';

export const testEnv = {
  NODE_ENV: 'test', CORS_ORIGINS: ORIGIN, TZ_NAME: 'Asia/Kuala_Lumpur', TRANSPORT_REFRESH_TIME: '05:00',
  JWT_SECRET: 'unit-test-secret-unit-test-secret-unit-test', ACCESS_TTL_MINUTES: '15', REFRESH_TTL_DAYS: '7', BCRYPT_COST: '10',
  LOGIN_MAX_FAILURES: '3', LOGIN_LOCK_MINUTES: '15', COOKIE_SECURE: 'false', SHEETS_DRIVER: 'memory', CACHE_TTL_MS: '0',
  RATE_LIMIT_WINDOW_SECONDS: '60', RATE_LIMIT_MAX: '100000', WHATSAPP_ENABLED: 'false', WHATSAPP_SESSION_DIR: '.wwebjs_auth',
} as NodeJS.ProcessEnv;

export const PASSWORD = 'correct horse battery';

export async function makeApp(opts: { demo?: boolean } = {}): Promise<{ app: Express; ctx: AppContext }> {
  const config = loadConfig(testEnv);
  const ctx = buildContext(config);
  await ensureTabs(ctx.db, '');
  await seedBase(ctx.db);
  await seedAdmin(ctx, 'admin@test.local', PASSWORD);
  await createUser(ctx, { email: 'staff@test.local', name: 'Staff', role: 'staff', password: PASSWORD, vehicleId: '' });
  await createUser(ctx, { email: 'teacher@test.local', name: 'Teacher', role: 'teacher', password: PASSWORD, vehicleId: '' });
  if (opts.demo) await seedDemo(ctx);
  return { app: createApp(ctx), ctx };
}

export async function signIn(app: Express, email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email, password });
  const csrf = String((res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mp_csrf='))?.split(';')[0]?.split('=')[1] ?? '');
  const h = (r: request.Test) => r.set('Origin', ORIGIN).set('x-csrf-token', csrf);
  return {
    res, agent, csrf,
    get: (url: string) => agent.get(`/api/v1${url}`),
    post: (url: string, body?: unknown) => h(agent.post(`/api/v1${url}`)).send(body as object),
    put: (url: string, body?: unknown) => h(agent.put(`/api/v1${url}`)).send(body as object),
    patch: (url: string, body?: unknown) => h(agent.patch(`/api/v1${url}`)).send(body as object),
    del: (url: string) => h(agent.delete(`/api/v1${url}`)),
  };
}
