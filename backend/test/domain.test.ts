import { describe, expect, it } from 'vitest';
import { makeApp, signIn } from './helpers';

async function setup() {
  const { app, ctx } = await makeApp({ demo: true });
  const a = await signIn(app, 'admin@test.local');
  return { app, ctx, a };
}

describe('students', () => {
  it('lists first names only and the profile carries the combined name', async () => {
    const { a } = await setup();
    const list = await a.get('/students');
    expect(list.status).toBe(200);
    const adam = list.body.find((s: { firstName: string }) => s.firstName === 'Adam');
    expect(adam).toBeTruthy();
    expect(JSON.stringify(list.body)).not.toMatch(/Bin Rahman|bin Rahman/);
    const profile = await a.get(`/students/${adam.id}`);
    expect(profile.body.fullName).toBe('Adam Bin Rahman');
    expect(profile.body.fee).toEqual({ tuition: 140, transport: 40, total: 180 });
    expect(profile.body.guardian.name).toBe('Aisyah Rahman');
    expect(profile.body.siblings.map((x: { name: string }) => x.name).sort()).toEqual(['Dania', 'Haikal']);
  });

  it('rejects unknown fields and bad input', async () => {
    const { a } = await setup();
    const levels = (await a.get('/levels')).body;
    const base = {
      firstName: 'Test', connector: 'none', fatherName: 'X', levelId: levels[0].id, address: '', classIds: [],
      guardian: { name: 'G', contact: '012-000 0000' },
      transport: { needed: false, area: 'inside', vehicleId: '', plan: 'Both ways', pickupFrom: 'School', dropoffAddress: '', schedule: [] },
    };
    expect((await a.post('/students', { ...base, role: 'admin' })).status).toBe(400);
    expect((await a.post('/students', { ...base, connector: 'son of' })).status).toBe(400);
    expect((await a.post('/students', { ...base, guardian: { name: 'G', contact: '<script>' } })).status).toBe(400);
    expect((await a.post('/students', base)).status).toBe(201);
  });

  it('stores formula-like text safely and returns it unchanged', async () => {
    const { a, ctx } = await setup();
    const res = await a.post('/subjects', { name: '=HYPERLINK("http://evil")' });
    expect(res.status).toBe(201);
    const raw = await ctx.db.client.read('Subjects');
    expect(raw.at(-1)![1]).toBe(`'=HYPERLINK("http://evil")`);
    const list = await a.get('/subjects');
    expect(list.body.at(-1).name).toBe('=HYPERLINK("http://evil")');
  });

  it('refuses a vehicle that is full', async () => {
    const { a, ctx } = await setup();
    const v = (await a.post('/vehicles', { plate: 'TINY 1', model: 'Mini', driverName: 'D', driverPhone: '012-111 1111', seats: 1 })).body;
    const level = (await ctx.db.levels.all())[0]!;
    const sessions = await ctx.db.sessions.all();
    const mk = (n: string) => ({
      firstName: n, connector: 'none', fatherName: 'X', levelId: level.id, address: 'Here', classIds: [], guardian: { name: 'G', contact: '012-000 0001' },
      transport: { needed: true, area: 'inside', vehicleId: v.id, plan: 'Both ways', pickupFrom: 'School', dropoffAddress: '', schedule: [{ day: 'Mon', sessionId: sessions[0]!.id }] },
    });
    expect((await a.post('/students', mk('One'))).status).toBe(201);
    expect((await a.post('/students', mk('Two'))).status).toBe(409);
  });
});

describe('transport', () => {
  it('builds the daily list, hides skipped students as Not riding and restores them', async () => {
    const { a, ctx } = await setup();
    const vehicles = await ctx.db.vehicles.all();
    const students = await ctx.db.students.all();
    const slots = await ctx.db.transportSlots.all();
    // find a date (next 7 days) where vehicle 0 has riders
    const today = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board`)).body.date as string;
    let date = today;
    let board;
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); date = d.toISOString().slice(0, 10);
      board = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board?date=${date}`)).body;
      if (board.riders.length) break;
    }
    expect(board.riders.length).toBeGreaterThan(0);
    expect(board.stats.onList).toBe(board.riders.filter((r: { status: string }) => r.status !== 'Not riding').length);

    const target = board.riders[0];
    const skip = await a.post('/transport/skips', { studentId: target.studentId, dateFrom: date });
    expect(skip.status).toBe(201);
    const after = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board?date=${date}`)).body;
    expect(after.riders.filter((r: { studentId: string; status: string }) => r.studentId === target.studentId).every((r: { status: string }) => r.status === 'Not riding')).toBe(true);
    expect(after.stats.notRiding).toBeGreaterThan(0);

    expect((await a.del(`/transport/skips?studentId=${target.studentId}&date=${date}`)).status).toBe(204);
    const restored = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board?date=${date}`)).body;
    expect(restored.stats.onList).toBe(board.stats.onList);
    expect(students.length + slots.length).toBeGreaterThan(0);
  });

  it('keeps Picked and Absent marks when the list is rebuilt', async () => {
    const { a, ctx } = await setup();
    const vehicles = await ctx.db.vehicles.all();
    const today = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board`)).body.date as string;
    let found: { date: string; entryId: string } | null = null;
    for (let i = 0; i < 7 && !found; i++) {
      const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); const date = d.toISOString().slice(0, 10);
      const b = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board?date=${date}`)).body;
      const r = b.riders.find((x: { entryId: string }) => x.entryId);
      if (r) found = { date, entryId: r.entryId };
    }
    expect(found).not.toBeNull();
    expect((await a.patch(`/transport/entries/${found!.entryId}`, { status: 'Absent' })).status).toBe(204);
    expect((await a.post('/transport/refresh', { date: found!.date })).status).toBe(200);
    const b = (await a.get(`/transport/vehicles/${vehicles[0]!.id}/board?date=${found!.date}`)).body;
    expect(b.stats.absent).toBe(1);
  });
});

describe('billing', () => {
  it('generates one invoice per guardian and month, only once', async () => {
    const { a, ctx } = await setup();
    const month = (await a.get('/billing')).body.month as string;
    const again = await a.post('/billing/generate', { month });
    expect(again.body.created).toBe(0);
    expect(again.body.skipped).toBeGreaterThan(0);
    const invoices = await ctx.db.invoices.all();
    const keys = invoices.map((i) => `${i.guardianId}|${i.month}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(invoices.every((i) => /^[A-Z]{3}\d{4}$/.test(i.number))).toBe(true);
  });

  it('uses combined names on invoice lines and computes status from payments', async () => {
    const { a } = await setup();
    const month = (await a.get('/billing')).body.month as string;
    const rows = (await a.get(`/billing?month=${month}`)).body.rows;
    const aisyah = rows.find((r: { guardian: { name: string } }) => r.guardian.name === 'Aisyah Rahman');
    const inv = (await a.get(`/billing/invoices/${aisyah.invoice.id}`)).body;
    expect(inv.lines.map((l: { studentName: string }) => l.studentName).sort()).toEqual(['Adam Bin Rahman', 'Dania Binti Rahman', 'Haikal Bin Rahman']);
    expect(inv.total).toBe(600);
    expect(inv.paid).toBe(300);
    expect(inv.balance).toBe(300);
    expect(inv.status).toBe('Partial');

    expect((await a.post('/billing/payments', { invoiceId: inv.id, amount: 300.01, method: 'Cash', date: month + '-20' })).status).toBe(409);
    const pay = await a.post('/billing/payments', { invoiceId: inv.id, amount: 300, method: 'Cash', date: month + '-20' });
    expect(pay.status).toBe(201);
    expect(pay.body.receiptNumber).toMatch(/^RCP\d{4}$/);
    const done = (await a.get(`/billing/invoices/${inv.id}`)).body;
    expect(done.status).toBe('Paid');
    const receipt = (await a.get(`/billing/receipts/${pay.body.id}`)).body;
    expect(receipt.balance).toBe(0);
  });

  it('rejects bad payments', async () => {
    const { a } = await setup();
    expect((await a.post('/billing/payments', { invoiceId: 'nope', amount: -5, method: 'Cash', date: '2026-01-01' })).status).toBe(400);
    expect((await a.post('/billing/payments', { invoiceId: 'nope', amount: 5, method: 'Bitcoin', date: '2026-01-01' })).status).toBe(400);
  });
});

describe('master data', () => {
  it('keeps session codes unique and protects data in use', async () => {
    const { a } = await setup();
    expect((await a.post('/sessions', { name: 'Dawn', code: 'M', color: '#112233', start: '05:00', end: '07:00' })).status).toBe(409);
    expect((await a.post('/sessions', { name: 'Dawn', code: 'D', color: '#112233', start: '05:00', end: '07:00' })).status).toBe(201);
    const sessions = (await a.get('/sessions')).body;
    const morning = sessions.find((s: { code: string }) => s.code === 'M');
    expect((await a.del(`/sessions/${morning.id}`)).status).toBe(409);
    const levels = (await a.get('/levels')).body;
    expect((await a.del(`/levels/${levels[0].id}`)).status).toBe(409);
  });

  it('shows class slots with sessions and student counts', async () => {
    const { a } = await setup();
    const classes = (await a.get('/classes')).body;
    const p1math = classes.find((c: { levelName: string; subject: string }) => c.levelName === 'Primary 1' && c.subject === 'Mathematics');
    expect(p1math.slots.length).toBe(2);
    expect(p1math.studentCount).toBe(1);
    expect(p1math.teacher.name).toBe('Cikgu Farah');
  });

  it('serves teacher and guardian profiles', async () => {
    const { a } = await setup();
    const teachers = (await a.get('/teachers')).body;
    const farah = teachers.find((t: { name: string }) => t.name === 'Cikgu Farah');
    const tp = await a.get(`/teachers/${farah.id}/profile`);
    expect(tp.status).toBe(200);
    expect(tp.body.classes.length).toBeGreaterThan(0);
    const guardians = (await a.get('/guardians')).body;
    const gp = await a.get(`/guardians/${guardians[0].id}`);
    expect(gp.status).toBe(200);
    expect(gp.body.children.length).toBeGreaterThan(0);
  });
});
