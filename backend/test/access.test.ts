import { describe, expect, it } from 'vitest';
import { createUser } from '../src/services/auth';
import { makeApp, signIn } from './helpers';

describe('role based access', () => {
  it('teachers cannot read billing or guardians', async () => {
    const { app } = await makeApp({ demo: true });
    const t = await signIn(app, 'teacher@test.local');
    expect((await t.get('/billing')).status).toBe(403);
    expect((await t.get('/guardians')).status).toBe(403);
    expect((await t.get('/classes')).status).toBe(200);
  });

  it('staff cannot manage users or read the audit log', async () => {
    const { app } = await makeApp();
    const s = await signIn(app, 'staff@test.local');
    expect((await s.get('/users')).status).toBe(403);
    expect((await s.get('/audit')).status).toBe(403);
    expect((await s.post('/users', { email: 'x@y.com', name: 'X', role: 'admin', password: 'long enough password' })).status).toBe(403);
  });

  it('admin can create users and passwords are never returned', async () => {
    const { app } = await makeApp();
    const a = await signIn(app, 'admin@test.local');
    expect((await a.post('/users', { email: 'new@test.local', name: 'New', role: 'staff', password: 'long enough password' })).status).toBe(201);
    const list = await a.get('/users');
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect((await a.post('/users', { email: 'weak@test.local', name: 'Weak', role: 'staff', password: 'short' })).status).toBe(400);
  });

  it('a driver only sees and updates their own vehicle (no IDOR)', async () => {
    const { app, ctx } = await makeApp({ demo: true });
    const vehicles = await ctx.db.vehicles.all();
    await createUser(ctx, { email: 'd1@test.local', name: 'D1', role: 'driver', password: 'long enough password', vehicleId: vehicles[0]!.id });
    const d = await signIn(app, 'd1@test.local', 'long enough password');
    expect((await d.get('/students')).status).toBe(403);
    expect((await d.get('/billing')).status).toBe(403);
    const mine = await d.get('/transport/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.vehicle.id).toBe(vehicles[0]!.id);
    expect((await d.get(`/transport/vehicles/${vehicles[0]!.id}/board`)).status).toBe(403);

    // an entry on another vehicle
    const a = await signIn(app, 'admin@test.local');
    const other = await a.get(`/transport/vehicles/${vehicles[1]!.id}/board?date=${mine.body.date}`);
    const entry = other.body.riders.find((r: { entryId: string }) => r.entryId);
    if (entry) expect((await d.patch(`/transport/entries/${entry.entryId}`, { status: 'Picked' })).status).toBe(403);
    const own = mine.body.riders.find((r: { entryId: string }) => r.entryId);
    if (own) expect((await d.patch(`/transport/entries/${own.entryId}`, { status: 'Picked' })).status).toBe(204);
  });
});
