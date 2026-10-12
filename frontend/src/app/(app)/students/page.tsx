'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AREA_LABEL, type PaymentStatus, type StudentListItem, type StudentProfileDto, type StudentTransportRow } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { api, del } from '@/lib/api';
import { clientMonth } from '@/lib/today';
import { useSession } from '@/components/session';
import { StudentForm } from '@/components/student-form';
import { Card, Dialog, Empty, ErrorNote, Loading, MonthPicker, PageHeader, PersonLink, SessionChip, Status, Table, Tabs } from '@/components/ui';

type Tab = 'all' | PaymentStatus | 'transport';

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useSession();
  const canEdit = user.role === 'admin' || user.role === 'staff';
  const [month, setMonth] = useState(clientMonth());
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ student?: StudentProfileDto } | null>(null);
  const [confirm, setConfirm] = useState<StudentListItem | null>(null);
  const [err, setErr] = useState('');
  const list = useApi<StudentListItem[]>(`/students?month=${month}`);
  const rides = useApi<StudentTransportRow[]>(tab === 'transport' && canEdit ? '/students/transport' : null);

  const rows = (list.data ?? []).filter((s) => (tab === 'all' || tab === 'transport' ? true : s.status === tab) && s.firstName.toLowerCase().includes(q.toLowerCase()));
  const count = (st: PaymentStatus) => (list.data ?? []).filter((s) => s.status === st).length;

  async function edit(id: string) {
    try { setForm({ student: await api<StudentProfileDto>(`/students/${id}`) }); } catch (e) { setErr((e as Error).message); }
  }
  async function remove(s: StudentListItem) {
    try { await del(`/students/${s.id}`); setConfirm(null); list.reload(); } catch (e) { setErr((e as Error).message); setConfirm(null); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Students" count={list.data?.length}
        actions={<>
          <MonthPicker value={month} onChange={setMonth} current={clientMonth()} />
          {canEdit && <button type="button" className="btn btn-pr" onClick={() => setForm({})}>Add student</button>}
        </>} />
      <ErrorNote message={err || list.error} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'all', label: 'All', count: list.data?.length },
        { id: 'Paid', label: 'Paid', count: count('Paid') },
        { id: 'Pending', label: 'Pending', count: count('Pending') },
        { id: 'Overdue', label: 'Overdue', count: count('Overdue') },
        ...(canEdit ? [{ id: 'transport' as const, label: 'Transport' }] : []),
      ]} />
      <div><input className="inp max-w-xs" placeholder="Search by first name" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {tab === 'transport' ? (
        <Card>
          {rides.loading ? <Loading /> : (rides.data ?? []).length === 0 ? <Empty>No students ride</Empty> : (
            <Table head={['Student', 'Level', 'Vehicle', 'Zone', 'Plan', 'Days']}>
              {(rides.data ?? []).filter((r) => r.firstName.toLowerCase().includes(q.toLowerCase())).map((r) => (
                <tr key={r.studentId}>
                  <td className="td"><PersonLink kind="student" id={r.studentId}>{r.firstName}</PersonLink></td>
                  <td className="td">{r.levelName}</td>
                  <td className="td font-mono">{r.vehicle?.plate ?? ''}</td>
                  <td className="td">{AREA_LABEL[r.area]}</td>
                  <td className="td">{r.plan}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(r.schedule.reduce<Record<string, string[]>>((m, s) => { (m[s.day] ??= []).push(s.sessionId); return m; }, {})).map(([day, ids]) => (
                        <span key={day} className="inline-flex items-center gap-1"><span className="text-mu">{day}</span>{ids.map((id) => <SessionChip key={id} id={id} />)}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          {list.loading && !list.data ? <Loading /> : rows.length === 0 ? <Empty>No students</Empty> : (
            <Table head={['Student', 'Level', 'Subjects', 'Guardian', 'Status', '']}>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="td"><PersonLink kind="student" id={s.id}>{s.firstName}</PersonLink></td>
                  <td className="td">{s.levelName}</td>
                  <td className="td">{s.subjects.join(', ')}</td>
                  <td className="td">{canEdit ? <PersonLink kind="guardian" id={s.guardian.id}>{s.guardian.name}</PersonLink> : s.guardian.name}</td>
                  <td className="td"><Status value={s.status} /></td>
                  <td className="td whitespace-nowrap text-right">
                    <button type="button" className="btn" onClick={() => router.push(`/students/${s.id}`)}>View</button>
                    {canEdit && <> <button type="button" className="btn" onClick={() => edit(s.id)}>Edit</button> <button type="button" className="btn" onClick={() => setConfirm(s)}>Delete</button></>}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {form && <StudentForm student={form.student} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />}
      {confirm && (
        <Dialog title="Delete student" onClose={() => setConfirm(null)}
          footer={<><button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={() => remove(confirm)}>Delete</button></>}>
          <p className="px-6 py-5">Delete {confirm.firstName}? Past invoices are kept.</p>
        </Dialog>
      )}
    </div>
  );
}
