import { Router } from 'express';
import type { ZodTypeAny, z } from 'zod';
import type { Role, RowMap, TableKey } from '@minda/common';
import type { AppContext } from '../lib/context';
import { notFound } from '../lib/errors';
import { parse, param, wrap } from '../lib/http';
import { requireRole } from '../middleware/security';
import { newId } from '../sheets/repo';
import { audit } from '../services/audit';

interface CrudOptions<K extends TableKey, S extends ZodTypeAny> {
  key: K;
  schema: S;
  read: Role[];
  write: Role[];
  label: string;
  /** Build the stored row from validated input. */
  make: (input: z.infer<S>, id: string) => RowMap[K];
  /** Throw a 409 here when the row is still in use. */
  guardDelete?: (row: RowMap[K]) => Promise<void>;
  /** Throw a 409 here for duplicates. */
  guardWrite?: (input: z.infer<S>, selfId?: string) => Promise<void>;
  /** Shape returned to the client. */
  out?: (row: RowMap[K]) => unknown;
}

/** List, get, create, update, delete for a simple master-data tab. */
export function crud<K extends TableKey, S extends ZodTypeAny>(ctx: AppContext, o: CrudOptions<K, S>) {
  const r = Router();
  const repo = ctx.db[o.key] as unknown as {
    all(): Promise<RowMap[K][]>; find(id: string): Promise<RowMap[K] | undefined>;
    insert(row: RowMap[K]): Promise<RowMap[K]>; update(id: string, p: Partial<RowMap[K]>): Promise<RowMap[K] | undefined>;
    remove(id: string): Promise<boolean>;
  };
  const out = o.out ?? ((row: RowMap[K]) => row);

  r.get('/', requireRole(...o.read), wrap(async (_req, res) => { res.json((await repo.all()).map(out)); }));
  r.get('/:id', requireRole(...o.read), wrap(async (req, res) => {
    const row = await repo.find(param(req, 'id'));
    if (!row) throw notFound(o.label);
    res.json(out(row));
  }));
  r.post('/', requireRole(...o.write), wrap(async (req, res) => {
    const input = parse(o.schema, req.body);
    await o.guardWrite?.(input);
    const row = await repo.insert(o.make(input, newId()));
    await audit(ctx, req.user!, `${o.key}.create`, o.key, String((row as unknown as { id: string }).id));
    res.status(201).json(out(row));
  }));
  r.put('/:id', requireRole(...o.write), wrap(async (req, res) => {
    const id = param(req, 'id');
    if (!(await repo.find(id))) throw notFound(o.label);
    const input = parse(o.schema, req.body);
    await o.guardWrite?.(input, id);
    const row = await repo.update(id, o.make(input, id));
    await audit(ctx, req.user!, `${o.key}.update`, o.key, id);
    res.json(out(row as RowMap[K]));
  }));
  r.delete('/:id', requireRole(...o.write), wrap(async (req, res) => {
    const id = param(req, 'id');
    const row = await repo.find(id);
    if (!row) throw notFound(o.label);
    await o.guardDelete?.(row);
    await repo.remove(id);
    await audit(ctx, req.user!, `${o.key}.delete`, o.key, id);
    res.status(204).end();
  }));
  return r;
}
