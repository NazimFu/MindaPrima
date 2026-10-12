'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AREA_LABEL, toSheet, type PaymentStatus, type StudentListItem, type StudentProfileDto, type StudentTransportRow } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { api, del } from '@/lib/api';
import { clientMonth } from '@/lib/today';
import { useSession } from '@/components/session';
import { StudentForm } from '@/components/student-form';
import { Dialog, Empty, ErrorNote, Loading, MonthPicker, SessionChip, Status, Tabs } from '@/components/ui';

type Tab = 'all' | PaymentStatus | 'transport';

export default function StudentsPage() {
  return <Suspense fallback={<Loading />}><Students /></Suspense>;
}

function Students() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ref } = useSession();
  const canEdit = user.role === 'admin' || user.role === 'staff';
  const [month, setMonth] = useState(clientMonth());
  const initial = params.get('status');
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'transport' && canEdit ? 'transport' : initial === 'Paid' || initial === 'Pending' || initial === 'Overdue' || initial === 'Partial' ? initial : 'all');
  const [q, setQ] = useState('');
  const [levelId, setLevelId] = useState('');
  const [form, setForm] = useState<{ student?: StudentProfileDto } | null>(params.get('new') && canEdit ? {} : null);
  const [confirm, setConfirm] = useState<StudentListItem | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [err, setErr] = useState('');
  const list = useApi<StudentListItem[]>(`/students?month=${month}`);
  const rides = useApi<StudentTransportRow[]>(canEdit ? '/students/transport' : null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!menuRef.current?.contains(t) && !t.closest('[data-row-menu]')) setMenu(null);
    };
    const off = () => setMenu(null);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', off, true);
    window.addEventListener('resize', off);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', off, true);
      window.removeEventListener('resize', off);
    };
  }, []);

  const all = list.data ?? [];
  const match = (name: string) => name.toLowerCase().includes(q.toLowerCase());
  const rows = all.filter((s) => (tab === 'all' || s.status === tab) && (!levelId || s.levelId === levelId)
    && (match(s.firstName) || s.guardian.name.toLowerCase().includes(q.toLowerCase()) || s.subjects.some((x) => match(x))));
  const count = (st: PaymentStatus) => all.filter((s) => s.status === st).length;
  const rideRows = (rides.data ?? []).filter((r) => match(r.firstName));

  async function edit(id: string) {
    setMenu(null);
    try { setForm({ student: await api<StudentProfileDto>(`/students/${id}`) }); } catch (e) { setErr((e as Error).message); }
  }
  async function remove(s: StudentListItem) {
    try { await del(`/students/${s.id}`); setConfirm(null); list.reload(); } catch (e) { setErr((e as Error).message); setConfirm(null); }
  }
  function exportCsv() {
    const head = ['Name', 'Level', 'Subjects', 'Guardian', 'Status'];
    const lines = [head, ...rows.map((s) => [s.firstName, s.levelName, s.subjects.join(' / '), s.guardian.name, s.status])]
      .map((r) => r.map((c) => `"${toSheet(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines], { type: 'text/csv' }));
    a.download = `students-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Students</h1>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} current={clientMonth()} />
          <button type="button" className="btn" onClick={exportCsv}>Export CSV</button>
          {canEdit && <button type="button" className="btn btn-pr" onClick={() => setForm({})}>Add student</button>}
        </div>
      </div>
      <ErrorNote message={err || list.error} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'all', label: 'All', count: all.length },
        { id: 'Paid', label: 'Paid', count: count('Paid') },
        { id: 'Partial', label: 'Partial', count: count('Partial') },
        { id: 'Pending', label: 'Pending', count: count('Pending') },
        { id: 'Overdue', label: 'Overdue', count: count('Overdue') },
        ...(canEdit ? [{ id: 'transport' as const, label: 'Transport', count: rides.data?.length }] : []),
      ]} />

      <div className="flex flex-wrap gap-2">
        <input className="inp min-w-[260px] flex-1" placeholder={tab === 'transport' ? 'Search name' : 'Search name, subject or guardian'} aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
        {tab !== 'transport' && (
          <select className="inp !w-auto" aria-label="Level" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">All levels</option>
            {ref.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {tab === 'transport' ? (
        <div className="overflow-x-auto rounded-md border border-ln bg-sf">
          {rides.loading ? <Loading /> : rideRows.length === 0 ? <Empty>No students ride</Empty> : (
            <table className="w-full min-w-[640px] border-collapse">
              <thead><tr><th className="th">Name</th><th className="th">Level</th><th className="th">Vehicle</th><th className="th">Address is</th><th className="th">Plan</th><th className="th">Days and sessions</th></tr></thead>
              <tbody>
                {rideRows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="td font-medium"><Link className="lk" href={`/students/${r.studentId}`}>{r.firstName}</Link></td>
                    <td className="td">{r.levelName}</td>
                    <td className="td"><span className="mono">{r.vehicle?.plate ?? ''}</span></td>
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
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-ln bg-sf">
            {list.loading && !list.data ? <Loading /> : rows.length === 0 ? <Empty>No students</Empty> : (
              <table className="w-full min-w-[640px] border-collapse">
                <thead><tr><th className="th">Name</th><th className="th">Level</th><th className="th">Subjects</th><th className="th">Guardian</th><th className="th">Status</th><th className="th w-12" /></tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="td font-medium"><Link className="lk" href={`/students/${s.id}`}>{s.firstName}</Link></td>
                      <td className="td">{s.levelName}</td>
                      <td className="td text-mu">{s.subjects.join(', ')}</td>
                      <td className="td text-mu">{canEdit ? <Link className="lk" href={`/guardians/${s.guardian.id}`}>{s.guardian.name}</Link> : s.guardian.name}</td>
                      <td className="td"><Status value={s.status} /></td>
                      <td className="td">
                        <button type="button" data-row-menu aria-label="Row actions" aria-haspopup="menu" aria-expanded={menu?.id === s.id}
                          onClick={(e) => {
                            if (menu?.id === s.id) { setMenu(null); return; }
                            const r = e.currentTarget.getBoundingClientRect();
                            const x = Math.max(8, Math.min(r.right - 188, window.innerWidth - 196));
                            const y = r.bottom + 4 + 130 > window.innerHeight ? Math.max(8, r.top - 4 - 130) : r.bottom + 4;
                            setMenu({ id: s.id, x, y });
                          }}
                          className="h-7 w-9 rounded-[4px] text-base text-mu hover:bg-hv">…</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {menu && (() => {
            const row = all.find((x) => x.id === menu.id);
            if (!row) return null;
            return (
              <div ref={menuRef} role="menu" style={{ position: 'fixed', left: menu.x, top: menu.y }}
                className="z-50 w-[188px] rounded-md border border-ln bg-sf p-1 shadow-[0_6px_20px_rgba(0,0,0,.18)]">
                <button role="menuitem" type="button" className="block w-full rounded-[4px] px-2.5 py-[7px] text-left hover:bg-hv" onClick={() => router.push(`/students/${row.id}`)}>View profile</button>
                {canEdit && <button role="menuitem" type="button" className="block w-full rounded-[4px] px-2.5 py-[7px] text-left hover:bg-hv" onClick={() => edit(row.id)}>Edit</button>}
                {canEdit && <><div className="my-1 h-px bg-ln" /><button role="menuitem" type="button" className="block w-full rounded-[4px] px-2.5 py-[7px] text-left text-er hover:bg-hv" onClick={() => { setMenu(null); setConfirm(row); }}>Delete…</button></>}
              </div>
            );
          })()}
          <div className="text-mu">Showing {rows.length} of {all.length}</div>
        </>
      )}

      {form && <StudentForm student={form.student} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); rides.reload(); }} />}
      {confirm && (
        <Dialog title={`Delete ${confirm.firstName}?`} onClose={() => setConfirm(null)}
          footer={<><button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={() => remove(confirm)}>Delete student</button></>}>
          <p className="px-6 py-5">This removes the student record from the registry and from future invoices. Past invoices are not changed.</p>
        </Dialog>
      )}
    </div>
  );
}
