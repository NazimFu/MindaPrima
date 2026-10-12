'use client';
import { useState } from 'react';
import { DAYS, formatClock, type ClassDto, type Day, type Level, type SlotDto, type Subject, type Teacher } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { del, post, put } from '@/lib/api';
import { CrudCard } from '@/components/crud-card';
import { useSession } from '@/components/session';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, PageHeader, PersonLink, Table } from '@/components/ui';

export default function ClassesPage() {
  const { ref, user } = useSession();
  const canEdit = user.role !== 'teacher';
  const classes = useApi<ClassDto[]>('/classes');
  const [edit, setEdit] = useState<ClassDto | 'new' | null>(null);
  const [err, setErr] = useState('');
  async function remove(c: ClassDto) {
    try { await del(`/classes/${c.id}`); classes.reload(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Classes" />
      <ErrorNote message={err || classes.error} />
      <Card title="Classes" right={canEdit && <button type="button" className="btn" onClick={() => setEdit('new')}>Add class</button>}>
        {classes.loading && !classes.data ? <Loading /> : !classes.data?.length ? <Empty>No classes</Empty> : (
          <Table head={['Level', 'Subject', 'Teacher', 'Days and times', { label: 'Students', right: true }, '']}>
            {classes.data.map((c) => (
              <tr key={c.id}>
                <td className="td">{c.levelName}</td>
                <td className="td">{c.subject}</td>
                <td className="td">{c.teacher ? <PersonLink kind="teacher" id={c.teacher.id}>{c.teacher.name}</PersonLink> : ''}</td>
                <td className="td">{c.slots.map((s) => `${s.day} ${formatClock(s.start)}-${formatClock(s.end)}`).join(', ')}</td>
                <td className="td text-right">{c.studentCount}</td>
                <td className="td whitespace-nowrap text-right">{canEdit && <><button type="button" className="btn" onClick={() => setEdit(c)}>Edit</button> <button type="button" className="btn" onClick={() => remove(c)}>Delete</button></>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {canEdit && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CrudCard<Level> title="Levels" path="/levels" noun="level" head={['Order', 'Name']} reloadRef={ref.reload}
            cells={(l) => [<span key="o" className="">{l.order}</span>, l.name]} sort={(a, b) => a.order - b.order}
            fields={[{ key: 'name', label: 'Name', max: 40 }, { key: 'order', label: 'Order', type: 'number' }]}
            blank={{ name: '', order: String(ref.levels.length + 1) }} toForm={(l) => ({ name: l.name, order: String(l.order) })}
            toBody={(f) => ({ name: f.name, order: Number(f.order) })} />
          <CrudCard<Subject> title="Subjects" path="/subjects" noun="subject" head={['Name']} reloadRef={ref.reload}
            cells={(s) => [s.name]} sort={(a, b) => a.name.localeCompare(b.name)}
            fields={[{ key: 'name', label: 'Name', max: 60 }]} blank={{ name: '' }} toForm={(s) => ({ name: s.name })} toBody={(f) => ({ name: f.name })} />
        </div>
      )}
      {edit && <ClassDialog cls={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); classes.reload(); }} />}
    </div>
  );
}

function ClassDialog({ cls, onClose, onSaved }: { cls?: ClassDto; onClose: () => void; onSaved: () => void }) {
  const { ref } = useSession();
  const teachers = useApi<Teacher[]>('/teachers');
  const [levelId, setLevelId] = useState(cls?.levelId ?? ref.levels[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState(cls?.subjectId ?? ref.subjects[0]?.id ?? '');
  const [teacherId, setTeacherId] = useState(cls?.teacher?.id ?? '');
  const [slots, setSlots] = useState<SlotDto[]>(cls?.slots ?? []);
  const [error, setError] = useState('');
  const setSlot = (i: number, patch: Partial<SlotDto>) => setSlots((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save() {
    try {
      const body = { levelId, subjectId, teacherId, slots };
      if (cls) await put(`/classes/${cls.id}`, body); else await post('/classes', body);
      onSaved();
    } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog wide title={cls ? 'Edit class' : 'Add class'} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Save</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Level"><select className="inp" value={levelId} onChange={(e) => setLevelId(e.target.value)}>{ref.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
          <Field label="Subject"><select className="inp" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{ref.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Teacher"><select className="inp" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">None</option>{(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        </div>
        <div className="space-y-2">
          <div className="lbl">Days and times</div>
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr_1fr_1fr_auto] items-end gap-2">
              <select aria-label="Day" className="inp" value={s.day} onChange={(e) => setSlot(i, { day: e.target.value as Day })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
              <input aria-label="Start" type="time" className="inp" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} />
              <input aria-label="End" type="time" className="inp" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} />
              <select aria-label="Session" className="inp" value={s.sessionId} onChange={(e) => setSlot(i, { sessionId: e.target.value })}>{ref.sessions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <button type="button" className="btn" onClick={() => setSlots((cur) => cur.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => setSlots((cur) => [...cur, { day: 'Mon', start: ref.sessions[0]?.start ?? '08:00', end: ref.sessions[0]?.end ?? '09:00', sessionId: ref.sessions[0]?.id ?? '' }])}>Add time</button>
        </div>
      </div>
    </Dialog>
  );
}
