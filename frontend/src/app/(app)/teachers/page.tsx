'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { Teacher } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { del, post, put } from '@/lib/api';
import { useSession } from '@/components/session';
import { Dialog, Empty, ErrorNote, Field, Loading } from '@/components/ui';

export default function TeachersPage() {
  return <Suspense fallback={<Loading />}><Teachers /></Suspense>;
}

function Teachers() {
  const { user } = useSession();
  const params = useSearchParams();
  const canEdit = user.role === 'admin' || user.role === 'staff';
  const { data, error, loading, reload } = useApi<Teacher[]>('/teachers');
  const [edit, setEdit] = useState<Teacher | 'new' | null>(params.get('new') && canEdit ? 'new' : null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Teachers {data && <span className="font-normal text-mu">{data.length}</span>}</h1>
        {canEdit && <button type="button" className="btn btn-pr" onClick={() => setEdit('new')}>Add teacher</button>}
      </div>
      <ErrorNote message={error} />
      <div className="card">
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No teachers</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead><tr><th className="th">Name</th><th className="th">Subject</th><th className="th">Contact</th><th className="th w-[120px]" /></tr></thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td className="td font-medium"><Link className="lk" href={`/teachers/${t.id}`}>{t.name}</Link></td>
                    <td className="td">{t.subject}</td>
                    <td className="td text-mu">{t.contact}</td>
                    <td className="td text-right">{canEdit && <button type="button" className="font-medium text-ac" onClick={() => setEdit(t)}>Edit</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  async function remove() {
    if (!teacher) return;
    try { await del(`/teachers/${teacher.id}`); onSaved(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title={teacher ? 'Edit teacher' : 'Add teacher'} onClose={onClose}
      footer={<>
        {teacher && <button type="button" className="btn mr-auto text-er" onClick={remove}>Delete</button>}
        <button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button>
      </>}>
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
