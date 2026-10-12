'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type StudentTransportRow, type VehicleBoardDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { del, post } from '@/lib/api';
import { clientToday } from '@/lib/today';
import { useSession } from '@/components/session';
import { Dialog, ErrorNote, Field, Loading, Status } from '@/components/ui';

const STAT = [
  { key: 'onList', label: 'On list', bg: '', fg: '' },
  { key: 'picked', label: 'Picked', bg: 'bg-okb', fg: 'text-ok' },
  { key: 'waiting', label: 'Waiting', bg: 'bg-wnb', fg: 'text-wn' },
  { key: 'absent', label: 'Absent', bg: 'bg-erb', fg: 'text-er' },
  { key: 'notRiding', label: 'Not riding', bg: 'bg-hv', fg: 'text-mu' },
] as const;

export default function VehicleBoardPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { ref } = useSession();
  const [date, setDate] = useState(clientToday());
  const [sessionId, setSessionId] = useState('');
  const [skip, setSkip] = useState<{ studentId: string } | null>(null);
  const [err, setErr] = useState('');
  const board = useApi<VehicleBoardDto>(`/transport/vehicles/${vehicleId}/board?date=${date}`);
  const b = board.data;

  useEffect(() => { setSessionId(''); }, [vehicleId]);
  const active = sessionId || b?.sessions.find((s) => s.count > 0)?.sessionId || b?.sessions[0]?.sessionId || '';
  const riders = (b?.riders ?? []).filter((r) => r.sessionId === active);

  async function undo(studentId: string) {
    try { await del(`/transport/skips?studentId=${studentId}&date=${date}`); board.reload(); } catch (e) { setErr((e as Error).message); }
  }
  const dateText = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Transport</h1>
          <div className="mt-0.5 text-mu">{dateText}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" aria-label="Date" className="inp !w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="btn" onClick={() => window.print()}>Print run sheets</button>
          <Link href="/settings/pricing" className="btn btn-pr no-underline">Add vehicle</Link>
        </div>
      </div>

      <div className="flex flex-wrap border-b border-ln">
        {ref.vehicles.map((v) => (
          <Link key={v.id} href={`/transport/${v.id}`} className={`tab font-medium ${v.id === vehicleId ? 'tab-on' : ''}`}>
            <span className="mono !text-[13px]">{v.plate}</span> <span className="sub">{v.driverName}</span>
          </Link>
        ))}
      </div>
      <ErrorNote message={err || board.error} />

      {!b ? <Loading /> : (
        <>
          <div className="grid rounded-md border border-ln bg-sf" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {STAT.map((k) => (
              <div key={k.key} className={`border-r border-ln px-4 py-3 last:border-r-0 ${k.bg}`}>
                <div className={k.fg}>{k.label}</div>
                <div className={`text-[20px] font-medium ${k.fg}`}>{b.stats[k.key]}</div>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-md border border-ln bg-sf">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ln bg-th px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="mono !text-[15px] font-semibold">{b.vehicle.plate}</span>
                <span>{b.vehicle.model}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span><span className="sub">Driver</span> <span className="font-medium">{b.vehicle.driverName}</span> <span className="sub">{b.vehicle.driverPhone}</span></span>
                <span><span className="sub">Seats</span> <span className="font-medium">{b.vehicle.used} of {b.vehicle.seats}</span></span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-ln px-4 py-2.5">
              {b.sessions.map((k) => {
                const sess = ref.sessions.find((x) => x.id === k.sessionId);
                const on = k.sessionId === active;
                return (
                  <button key={k.sessionId} type="button" onClick={() => setSessionId(k.sessionId)} aria-pressed={on}
                    className="inline-flex gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                    style={on ? { background: sess?.color, color: '#fff', borderColor: sess?.color } : { background: 'var(--sf)', color: 'var(--tx)', borderColor: 'var(--ln)' }}>
                    {sess?.name} <span className="opacity-80">{k.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead><tr><th className="th w-8">#</th><th className="th">Student</th><th className="th">Pick-up</th><th className="th">Drop-off</th><th className="th">Plan</th><th className="th">Status</th></tr></thead>
                <tbody>
                  {riders.map((r, i) => (
                    <tr key={`${r.studentId}-${r.sessionId}`} className="align-top">
                      <td className="td sub">{i + 1}</td>
                      <td className="td">
                        <div className="font-medium"><Link className="lk" href={`/students/${r.studentId}`}>{r.firstName}</Link></div>
                        <div className="sub">{r.levelName} · <Link className="lk" href={`/guardians/${r.guardian.id}`}>{r.guardian.name}</Link>, {r.guardianPhone}</div>
                      </td>
                      <td className="td">{r.status === 'Not riding' ? '' : r.pickup}</td>
                      <td className="td">{r.status === 'Not riding' ? '' : r.dropoff}</td>
                      <td className="td">{r.plan}</td>
                      <td className="td">
                        <Status value={r.status} />
                        <div className="sub mt-1">
                          {r.status === 'Not riding' ? <>Skipped. <button type="button" className="text-ac" onClick={() => undo(r.studentId)}>Undo</button></>
                            : <button type="button" className="text-ac" onClick={() => setSkip({ studentId: r.studentId })}>Skip a day</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {riders.length === 0 && <tr><td className="td text-center text-mu" colSpan={6}>No riders in this session</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sub px-4 py-2">Showing {riders.length} riders</div>
          </section>
        </>
      )}
      {skip && <SkipDialog studentId={skip.studentId} date={date} onClose={() => setSkip(null)} onDone={() => { setSkip(null); board.reload(); }} />}
    </div>
  );
}

function SkipDialog({ studentId, date, onClose, onDone }: { studentId: string; date: string; onClose: () => void; onDone: () => void }) {
  const rides = useApi<StudentTransportRow[]>('/students/transport');
  const name = rides.data?.find((r) => r.studentId === studentId)?.firstName ?? '';
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  async function save() {
    try { await post('/transport/skips', { studentId, dateFrom: from, ...(to ? { dateTo: to } : {}) }); onDone(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title={`Skip a day for ${name}`} onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={save}>Skip</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="date" className="inp" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To (optional)"><input type="date" className="inp" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <p className="text-mu">The weekly schedule stays. The student shows as Not riding on these dates.</p>
      </div>
    </Dialog>
  );
}
