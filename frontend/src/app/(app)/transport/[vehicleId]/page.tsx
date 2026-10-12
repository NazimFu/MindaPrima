'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatRange, type RunStatus, type StudentTransportRow, type VehicleBoardDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { del, patch, post } from '@/lib/api';
import { clientToday } from '@/lib/today';
import { useSession } from '@/components/session';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, PageHeader, PersonLink, SessionChip, Status, Table } from '@/components/ui';

export default function VehicleBoardPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { ref } = useSession();
  const [date, setDate] = useState(clientToday());
  const [sessionId, setSessionId] = useState('');
  const [skip, setSkip] = useState(false);
  const [err, setErr] = useState('');
  const board = useApi<VehicleBoardDto>(`/transport/vehicles/${vehicleId}/board?date=${date}`);
  const b = board.data;

  async function mark(entryId: string, status: RunStatus) {
    try { await patch(`/transport/entries/${entryId}`, { status }); board.reload(); } catch (e) { setErr((e as Error).message); }
  }
  async function undo(studentId: string) {
    try { await del(`/transport/skips?studentId=${studentId}&date=${date}`); board.reload(); } catch (e) { setErr((e as Error).message); }
  }

  const riders = (b?.riders ?? []).filter((r) => !sessionId || r.sessionId === sessionId);
  return (
    <div className="space-y-4">
      <PageHeader title="Transport"
        actions={<>
          <input type="date" aria-label="Date" className="inp !w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="btn" onClick={() => setSkip(true)}>Skip a day</button>
        </>} />
      <div className="flex flex-wrap gap-1 border-b border-ln">
        {ref.vehicles.map((v) => (
          <Link key={v.id} href={`/transport/${v.id}`} className={`-mb-px border-b-2 px-3 py-2 font-mono no-underline ${v.id === vehicleId ? 'border-ac text-ac' : 'border-transparent text-mu'}`}>{v.plate}</Link>
        ))}
      </div>
      <ErrorNote message={err || board.error} />
      {!b ? <Loading /> : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-mu">
            <span>{b.vehicle.model}</span><span>Driver {b.vehicle.driverName}</span><span className="font-mono">{b.vehicle.driverPhone}</span>
            <span className="font-mono">{b.vehicle.used}/{b.vehicle.seats} seats</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([['On list', b.stats.onList], ['Picked', b.stats.picked], ['Waiting', b.stats.waiting], ['Absent', b.stats.absent], ['Not riding', b.stats.notRiding]] as const).map(([k, v]) => (
              <div key={k} className="card px-3.5 py-2.5"><div className="text-mu">{k}</div><div className="font-mono text-[20px] font-semibold">{v}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`btn ${sessionId === '' ? 'btn-pr' : ''}`} onClick={() => setSessionId('')}>All</button>
            {b.sessions.map((s) => (
              <button key={s.sessionId} type="button" className={`btn ${sessionId === s.sessionId ? 'btn-pr' : ''}`} onClick={() => setSessionId(s.sessionId)}>
                {ref.sessions.find((x) => x.id === s.sessionId)?.name ?? ''} <span className="font-mono">{s.count}</span>
              </button>
            ))}
            <span className="text-mu">{sessionId && (() => { const s = ref.sessions.find((x) => x.id === sessionId); return s ? formatRange(s.start, s.end) : ''; })()}</span>
          </div>
          <Card>
            {riders.length === 0 ? <Empty>No riders</Empty> : (
              <Table min={820} head={['Student', 'Level', 'Session', 'Pick-up', 'Drop-off', 'Plan', 'Status', '']}>
                {riders.map((r) => (
                  <tr key={`${r.studentId}-${r.sessionId}`}>
                    <td className="td"><PersonLink kind="student" id={r.studentId}>{r.firstName}</PersonLink></td>
                    <td className="td">{r.levelName}</td>
                    <td className="td"><SessionChip id={r.sessionId} /></td>
                    <td className="td">{r.pickup}</td>
                    <td className="td">{r.dropoff}</td>
                    <td className="td">{r.plan}</td>
                    <td className="td"><Status value={r.status} /></td>
                    <td className="td whitespace-nowrap text-right">
                      {r.status === 'Not riding' ? <button type="button" className="btn" onClick={() => undo(r.studentId)}>Undo skip</button> : (
                        <>
                          <button type="button" className="btn" disabled={r.status === 'Picked'} onClick={() => mark(r.entryId, 'Picked')}>Picked</button>{' '}
                          <button type="button" className="btn" disabled={r.status === 'Absent'} onClick={() => mark(r.entryId, 'Absent')}>Absent</button>{' '}
                          <button type="button" className="btn" disabled={r.status === 'Waiting'} onClick={() => mark(r.entryId, 'Waiting')}>Reset</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
      {skip && <SkipDialog date={date} onClose={() => setSkip(false)} onDone={() => { setSkip(false); board.reload(); }} />}
    </div>
  );
}

function SkipDialog({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: () => void }) {
  const rides = useApi<StudentTransportRow[]>('/students/transport');
  const [studentId, setStudentId] = useState('');
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  async function save() {
    try { await post('/transport/skips', { studentId, dateFrom: from, ...(to ? { dateTo: to } : {}) }); onDone(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title="Skip a day" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" disabled={!studentId} onClick={save}>Skip</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <Field label="Student">
          <select className="inp" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Choose</option>
            {(rides.data ?? []).map((r) => <option key={r.studentId} value={r.studentId}>{r.firstName}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="date" className="inp" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To (optional)"><input type="date" className="inp" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <p className="text-mu">The weekly schedule stays. The student shows as Not riding on these dates.</p>
      </div>
    </Dialog>
  );
}
