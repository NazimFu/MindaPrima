import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ORIGIN, PASSWORD, makeApp, signIn } from './helpers';

describe('authentication', () => {
  it('signs in and returns the user without secrets', async () => {
    const { app } = await makeApp();
    const s = await signIn(app, 'admin@test.local');
    expect(s.res.status).toBe(200);
    expect(s.res.body.role).toBe('admin');
    expect(JSON.stringify(s.res.body)).not.toMatch(/passwordHash|password/i);
    const cookies = (s.res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookies).toMatch(/mp_session=.*HttpOnly/i);
    expect(cookies).toMatch(/SameSite=Strict/i);
  });

  it('rejects a wrong password with a generic message', async () => {
    const { app } = await makeApp();
    const a = await signIn(app, 'admin@test.local', 'nope-nope-nope');
    const b = await signIn(app, 'ghost@test.local', 'nope-nope-nope');
    expect(a.res.status).toBe(401);
    expect(b.res.status).toBe(401);
    expect(a.res.body.error).toBe(b.res.body.error);
  });

  it('locks the account after repeated failures', async () => {
    const { app } = await makeApp();
    for (let i = 0; i < 3; i++) await signIn(app, 'staff@test.local', 'wrong-password-x');
    const locked = await signIn(app, 'staff@test.local');
    expect(locked.res.status).toBe(429);
  });

  it('requires a session for the API', async () => {
    const { app } = await makeApp();
    expect((await request(app).get('/api/v1/students')).status).toBe(401);
  });

  it('blocks state changes without a CSRF token or from another origin', async () => {
    const { app } = await makeApp();
    const s = await signIn(app, 'admin@test.local');
    const noToken = await s.agent.post('/api/v1/subjects').set('Origin', ORIGIN).send({ name: 'Art' });
    expect(noToken.status).toBe(403);
    const badOrigin = await s.agent.post('/api/v1/subjects').set('Origin', 'https://evil.example').set('x-csrf-token', s.csrf).send({ name: 'Art' });
    expect(badOrigin.status).toBe(403);
    expect((await s.post('/subjects', { name: 'Art' })).status).toBe(201);
  });

  it('rotates refresh tokens and logout invalidates the session', async () => {
    const { app } = await makeApp();
    const s = await signIn(app, 'admin@test.local');
    const refresh = await s.agent.post('/api/v1/auth/refresh').set('Origin', ORIGIN);
    expect(refresh.status).toBe(200);
    expect((await s.get('/auth/me')).status).toBe(200);
    // the refresh issues a new CSRF token, the browser sends the new one
    const fresh = String((refresh.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mp_csrf='))?.split(';')[0]?.split('=')[1]);
    expect((await s.agent.post('/api/v1/auth/logout').set('Origin', ORIGIN).set('x-csrf-token', fresh)).status).toBe(204);
    expect((await s.get('/auth/me')).status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const { app } = await makeApp();
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', ['mp_session=eyJhbGciOiJub25lIn0.e30.']);
    expect(res.status).toBe(401);
  });

  it('sends security headers and no CORS for unknown origins', async () => {
    const { app } = await makeApp();
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(PASSWORD.length).toBeGreaterThan(10);
  });
});
