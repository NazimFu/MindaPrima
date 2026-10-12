'use client';
import { useState } from 'react';
import type { Teacher } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { del, post, put } from '@/lib/api';
import { useSession } from '@/components/session';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, PageHeader, PersonLink, Table } from '@/components/ui';

export default function TeachersPage() {
  const { user, ref } = useSession();
  const canEdit = user.role === 'admin' || user.role === 'staff';
  const { data, error, loading, reload } = useApi<Teacher[]>('/teachers');
  const [edit, setEdit] = useState<Teacher | 'new' | null>(null);
  const [err, setErr] = useState('');
  const levelNames = (csv: string) => csv.split(',').filter(Boolean).map((id) => ref.levels.find((l) => l.id === id)?.name).filter(Boolean).join(', ');
  async function remove(t: Teacher) {
    try { await del(`/teachers/${t.id}`); reload(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Teachers" count={data?.length} actions={canEdit && <button type="button" className="btn btn-pr" onClick={() => setEdit('new')}>Add teacher</button>} />
      <ErrorNote message={err || error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No teachers</Empty> : (
          <Table head={['Teacher', 'Subject', 'Levels', 'Contact', '']}>
            {data.map((t) => (
              <tr key={t.id}>
                <td className="td"><PersonLink kind="teacher" id={t.id}>{t.name}</PersonLink></td>
                <td className="td">{t.subject}</td>
                <td className="td">{levelNames(t.levelIds)}</td>
                <td className="td font-mono">{t.contact}</td>
                <td className="td whitespace-nowrap text-right">{canEdit && <><button type="button" className="btn" onClick={() => setEdit(t)}>Edit</button> <button type="button" className="btn" onClick={() => remove(t)}>Delete</button></>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {edit && <TeacherDialog teacher={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function TeacherDialog({ teacher, onClose, onSaved }: { teacher?: Teacher; onClose: () => void; onSaved: () => void }) {
  const { ref } = useSession();
  const [name, setName] = useState(teacher?.name ?? '');
  const [subject, setSubject] = useState(teacher?.subject ?? '');
  const [contact, setContact] = useState(teacher?.contact ?? '');
  const [levelIds, setLevelIds] = useState<string[]>(teacher?.levelIds.split(',').filter(Boolean) ?? []);
  const [error, setError] = useState('');
  async function save() {
    try {
      const body = { name, subject, contact, levelIds };
      if (teacher) await put(`/teachers/${teacher.id}`, body); else await post('/teachers', body);
      onSaved();
    } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title={teacher ? 'Edit teacher' : 'Add teacher'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <Field label="Name"><input className="inp" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Subject">
          <select className="inp" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Choose</option>
            {ref.subjects.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Contact"><input className="inp" value={contact} maxLength={20} inputMode="tel" onChange={(e) => setContact(e.target.value)} /></Field>
        <div>
          <div className="lbl mb-1">Levels</div>
          <div className="flex flex-wrap gap-2">
            {ref.levels.map((l) => (
              <label key={l.id} className="flex items-center gap-1.5 rounded border border-ln px-2.5 py-1">
                <input type="checkbox" checked={levelIds.includes(l.id)} onChange={() => setLevelIds((c) => (c.includes(l.id) ? c.filter((x) => x !== l.id) : [...c, l.id]))} />{l.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
