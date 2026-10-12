import { randomBytes } from 'node:crypto';
import { fromSheet, toSheet, type RowMap, type TableDef, type TableKey, TABLES, KEY_COLUMN } from '@minda/common';
import type { SheetsClient } from './client';

export const newId = () => randomBytes(8).toString('hex');

type AnyRow = Record<string, string | number | boolean>;

function decode(def: TableDef, cells: string[]): AnyRow {
  const out: AnyRow = {};
  def.columns.forEach((col, i) => {
    const raw = cells[i] ?? '';
    if (def.numbers?.includes(col)) out[col] = raw === '' ? 0 : Number(raw);
    else if (def.booleans?.includes(col)) out[col] = raw.toUpperCase() === 'TRUE';
    else out[col] = fromSheet(raw);
  });
  return out;
}

function encode(def: TableDef, row: AnyRow): string[] {
  return def.columns.map((col) => {
    const v = row[col];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    return toSheet(String(v));
  });
}

/** Serialises writes so row numbers stay valid on a single instance. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export class Repo<K extends TableKey> {
  private cache: { at: number; rows: RowMap[K][] } | null = null;
  private readonly def: TableDef;
  private readonly keyCol: string;

  constructor(
    private client: SheetsClient,
    readonly key: K,
    readonly tab: string,
    private ttlMs: number,
    private mutex: Mutex,
  ) {
    this.def = TABLES[key] as unknown as TableDef;
    this.keyCol = KEY_COLUMN[key];
  }

  private async load(fresh = false): Promise<RowMap[K][]> {
    if (!fresh && this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.rows;
    const values = await this.client.read(this.tab);
    const rows = values.slice(1).filter((r) => r.some((c) => c !== '')).map((r) => decode(this.def, r) as unknown as RowMap[K]);
    this.cache = { at: Date.now(), rows };
    return rows;
  }

  private invalidate() { this.cache = null; }

  /** All rows. Callers must not mutate the result. */
  async all(): Promise<RowMap[K][]> { return this.load(); }

  async find(id: string): Promise<RowMap[K] | undefined> {
    return (await this.load()).find((r) => String((r as unknown as AnyRow)[this.keyCol]) === id);
  }

  async where(pred: (r: RowMap[K]) => boolean): Promise<RowMap[K][]> { return (await this.load()).filter(pred); }

  async insert(row: RowMap[K]): Promise<RowMap[K]> {
    return this.mutex.run(async () => {
      await this.client.append(this.tab, [encode(this.def, row as unknown as AnyRow)]);
      this.invalidate();
      return row;
    });
  }

  async insertMany(rows: RowMap[K][]): Promise<void> {
    if (rows.length === 0) return;
    await this.mutex.run(async () => {
      await this.client.append(this.tab, rows.map((r) => encode(this.def, r as unknown as AnyRow)));
      this.invalidate();
    });
  }

  private async rowNumberOf(id: string): Promise<number> {
    const values = await this.client.read(this.tab);
    const idx = this.def.columns.indexOf(this.keyCol as never);
    const at = values.findIndex((r, i) => i > 0 && fromSheet(r[idx] ?? '') === id);
    return at === -1 ? -1 : at + 1;
  }

  async update(id: string, patch: Partial<RowMap[K]>): Promise<RowMap[K] | undefined> {
    return this.mutex.run(async () => {
      const values = await this.client.read(this.tab);
      const idx = this.def.columns.indexOf(this.keyCol as never);
      const at = values.findIndex((r, i) => i > 0 && fromSheet(r[idx] ?? '') === id);
      if (at === -1) return undefined;
      const merged = { ...decode(this.def, values[at]!), ...(patch as AnyRow), [this.keyCol]: id };
      await this.client.update(this.tab, at + 1, encode(this.def, merged));
      this.invalidate();
      return merged as unknown as RowMap[K];
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.mutex.run(async () => {
      const n = await this.rowNumberOf(id);
      if (n === -1) return false;
      await this.client.remove(this.tab, n);
      this.invalidate();
      return true;
    });
  }

  /** Removes every row matching the predicate. Deletes from the bottom so row numbers stay valid. */
  async removeWhere(pred: (r: RowMap[K]) => boolean): Promise<number> {
    return this.mutex.run(async () => {
      const values = await this.client.read(this.tab);
      const doomed: number[] = [];
      values.forEach((cells, i) => {
        if (i > 0 && cells.some((c) => c !== '') && pred(decode(this.def, cells) as unknown as RowMap[K])) doomed.push(i + 1);
      });
      for (const n of doomed.reverse()) await this.client.remove(this.tab, n);
      this.invalidate();
      return doomed.length;
    });
  }
}

export type Db = { [K in TableKey]: Repo<K> } & { client: SheetsClient };

export interface DbOptions { client: SheetsClient; tabPrefix: string; cacheTtlMs: number }

export function createDb({ client, tabPrefix, cacheTtlMs }: DbOptions): Db {
  const mutex = new Mutex();
  const db = { client } as Record<string, unknown>;
  for (const key of Object.keys(TABLES) as TableKey[]) {
    db[key] = new Repo(client, key, `${tabPrefix}${TABLES[key].tab}`, cacheTtlMs, mutex);
  }
  return db as Db;
}

/** Creates missing tabs with headers. Refuses to touch a tab whose header does not match. */
export async function ensureTabs(db: Db, tabPrefix: string): Promise<{ created: string[]; ok: string[] }> {
  const existing = new Set(await db.client.listTabs());
  const created: string[] = [];
  const ok: string[] = [];
  for (const key of Object.keys(TABLES) as TableKey[]) {
    const tab = `${tabPrefix}${TABLES[key].tab}`;
    const header = [...TABLES[key].columns] as string[];
    if (!existing.has(tab)) {
      await db.client.createTab(tab, header);
      created.push(tab);
      continue;
    }
    const current = (await db.client.read(tab))[0] ?? [];
    if (header.some((h, i) => current[i] !== h)) {
      throw new Error(
        `Tab "${tab}" already exists with a different header. Use a fresh spreadsheet or set SHEET_TAB_PREFIX (for example MP_).`,
      );
    }
    ok.push(tab);
  }
  return { created, ok };
}
