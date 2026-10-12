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

/**
 * Refreshes stale repositories with a single batchGet instead of one read per tab. Repos that ask in the same tick share
 * one call, and every other repo that has been loaded before and is now stale rides along, so a whole snapshot costs one read.
 */
class BatchLoader {
  private readonly repos = new Set<Repo<TableKey>>();
  private batch: { repos: Set<Repo<TableKey>>; done: Promise<void> } | null = null;

  constructor(private client: SheetsClient) {}

  register(repo: Repo<TableKey>) { this.repos.add(repo); }

  refresh(repo: Repo<TableKey>): Promise<void> {
    if (!this.batch) {
      const batch = { repos: new Set<Repo<TableKey>>(), done: undefined as unknown as Promise<void> };
      batch.done = Promise.resolve().then(() => this.run(batch));
      this.batch = batch;
    }
    this.batch.repos.add(repo);
    return this.batch.done;
  }

  private async run(batch: { repos: Set<Repo<TableKey>> }): Promise<void> {
    this.batch = null;
    for (const r of this.repos) if (r.isWarmAndStale()) batch.repos.add(r);
    const targets = [...batch.repos];
    const marks = targets.map((r) => r.mark());
    const values = await this.client.readMany(targets.map((r) => r.tab));
    targets.forEach((r, i) => r.fill(values[i]!, marks[i]!));
  }
}

export class Repo<K extends TableKey> {
  private cache: { at: number; rows: RowMap[K][] } | null = null;
  private loadedOnce = false;
  private gen = 0;
  private readonly def: TableDef;
  private readonly keyCol: string;

  constructor(
    private client: SheetsClient,
    readonly key: K,
    readonly tab: string,
    private ttlMs: number,
    private mutex: Mutex,
    private loader: BatchLoader,
  ) {
    this.def = TABLES[key] as unknown as TableDef;
    this.keyCol = KEY_COLUMN[key];
    this.loader.register(this as unknown as Repo<TableKey>);
  }

  private isFresh() { return !!this.cache && Date.now() - this.cache.at < this.ttlMs; }

  /** True when this repo has been used before and its cache has expired or been invalidated. */
  isWarmAndStale() { return this.loadedOnce && !this.isFresh(); }

  /** Generation at the time a read starts. A write that lands while the read is in flight bumps it, and the result is discarded. */
  mark() { return this.gen; }

  /** Decodes a tab and caches it, unless a write invalidated the repo since `mark`. Returns the decoded rows either way. */
  fill(values: string[][], mark: number): RowMap[K][] {
    const rows = values.slice(1).filter((r) => r.some((c) => c !== '')).map((r) => decode(this.def, r) as unknown as RowMap[K]);
    if (mark === this.gen) {
      this.cache = { at: Date.now(), rows };
      this.loadedOnce = true;
    }
    return rows;
  }

  private async load(): Promise<RowMap[K][]> {
    if (this.isFresh()) return this.cache!.rows;
    this.loadedOnce = true;
    await this.loader.refresh(this as unknown as Repo<TableKey>);
    if (this.isFresh()) return this.cache!.rows;
    // The batch result raced with a write and was discarded; read this tab directly.
    const mark = this.mark();
    return this.fill(await this.client.read(this.tab), mark);
  }

  private invalidate() { this.cache = null; this.gen++; }

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
  const loader = new BatchLoader(client);
  const db = { client } as Record<string, unknown>;
  for (const key of Object.keys(TABLES) as TableKey[]) {
    db[key] = new Repo(client, key, `${tabPrefix}${TABLES[key].tab}`, cacheTtlMs, mutex, loader);
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
