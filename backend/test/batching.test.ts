import { describe, expect, it } from 'vitest';
import { createDb, ensureTabs } from '../src/sheets/repo';
import { MemorySheets } from '../src/sheets/memory';
import { snap } from '../src/services/snapshot';
import type { AppContext } from '../src/lib/context';

class CountingSheets extends MemorySheets {
  reads = 0;
  batches = 0;
  private inBatch = false;
  async read(tab: string) { if (!this.inBatch) this.reads++; return super.read(tab); }
  async readMany(tabs: string[]) {
    this.batches++;
    this.inBatch = true;
    try { return await super.readMany(tabs); } finally { this.inBatch = false; }
  }
}

async function setup(ttl: number) {
  const client = new CountingSheets();
  const db = createDb({ client, tabPrefix: '', cacheTtlMs: ttl });
  await ensureTabs(db, '');
  const ctx = { db, config: { TZ_NAME: 'Asia/Kuala_Lumpur' } } as unknown as AppContext;
  return { client, db, ctx };
}

describe('batched sheet reads', () => {
  it('loads a whole snapshot with a single batch call', async () => {
    const { client, ctx } = await setup(60000);
    const base = client.reads;
    await snap(ctx);
    expect(client.batches).toBe(1);
    expect(client.reads).toBe(base);
  });

  it('serves repeat snapshots from cache and refreshes every warm table together once stale', async () => {
    const { client, ctx } = await setup(0);
    await snap(ctx);
    await snap(ctx);
    expect(client.batches).toBe(2);
  });

  it('shows a write immediately and does not cache a read that raced with it', async () => {
    const { client, db } = await setup(60000);
    await db.subjects.all();
    await db.subjects.insert({ id: 's1', name: 'Math' });
    const before = client.batches;
    const rows = await db.subjects.all();
    expect(rows.map((r) => r.name)).toEqual(['Math']);
    expect(client.batches).toBe(before + 1);
  });
});
