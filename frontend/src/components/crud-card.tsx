'use client';
import { useState, type ReactNode } from 'react';
import { del, post, put } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, Table } from './ui';

export interface FieldDef { key: string; label: string; type?: 'text' | 'number' | 'color' | 'time' | 'textarea' | 'select'; options?: { value: string; label: string }[]; max?: number }

interface Props<T extends { id: string }> {
  title: string;
  path: string;
  head: string[];
  cells: (row: T) => ReactNode[];
  fields: FieldDef[];
  blank: Record<string, string>;
  toForm: (row: T) => Record<string, string>;
  toBody: (form: Record<string, string>) => unknown;
  noun: string;
  sort?: (a: T, b: T) => number;
  reloadRef?: () => void;
}

/** A card with a table, add, edit and delete for one master-data tab. */
export function CrudCard<T extends { id: string }>(p: Props<T>) {
  const { data, error, loading, reload } = useApi<T[]>(p.path);
  const [editing, setEditing] = useState<{ id: string | null; form: Record<string, string> } | null>(null);
  const [err, setErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const rows = data ? (p.sort ? [...data].sort(p.sort) : data) : [];
  const done = () => { reload(); p.reloadRef?.(); };

  async function save() {
    if (!editing) return;
    try {
      const body = p.toBody(editing.form);
      if (editing.id) await put(`${p.path}/${editing.id}`, body); else await post(p.path, body);
      setEditing(null); setFormErr(''); done();
    } catch (e) { setFormErr((e as Error).message); }
  }
  async function remove(row: T) {
    try { await del(`${p.path}/${row.id}`); setErr(''); done(); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <Card title={p.title} right={<button type="button" className="btn" onClick={() => { setFormErr(''); setEditing({ id: null, form: p.blank }); }}>Add {p.noun}</button>}>
      <ErrorNote message={err || error} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <Empty>Nothing yet</Empty> : (
        <Table head={[...p.head, '']} min={420}>
          {rows.map((r) => (
            <tr key={r.id}>
              {p.cells(r).map((c, i) => <td key={i} className="td">{c}</td>)}
              <td className="td whitespace-nowrap text-right">
                <button type="button" className="btn" onClick={() => { setFormErr(''); setEditing({ id: r.id, form: p.toForm(r) }); }}>Edit</button>{' '}
                <button type="button" className="btn" onClick={() => remove(r)}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <Dialog title={`${editing.id ? 'Edit' : 'Add'} ${p.noun}`} onClose={() => setEditing(null)}
          footer={<><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
          <div className="space-y-3 p-6">
            <ErrorNote message={formErr} />
            {p.fields.map((f) => {
              const set = (v: string) => setEditing({ ...editing, form: { ...editing.form, [f.key]: v } });
              const value = editing.form[f.key] ?? '';
              return (
                <Field key={f.key} label={f.label}>
                  {f.type === 'textarea' ? <textarea className="inp" rows={5} maxLength={f.max ?? 1000} value={value} onChange={(e) => set(e.target.value)} />
                    : f.type === 'select' ? <select className="inp" value={value} onChange={(e) => set(e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                    : <input className={`inp ${f.type === 'number' ? 'font-mono' : ''}`} type={f.type === 'color' ? 'color' : f.type === 'time' ? 'time' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} maxLength={f.max} value={value} onChange={(e) => set(e.target.value)} />}
                </Field>
              );
            })}
          </div>
        </Dialog>
      )}
    </Card>
  );
}
