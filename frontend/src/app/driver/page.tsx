'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatRange, type RunStatus, type Session, type SessionUserDto, type VehicleBoardDto } from '@minda/common';
import { api, patch, post } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { Status } from '@/components/ui';

/** Phone run sheet for the driver. Shows only the driver's own vehicle. */
export default function DriverPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sid, setSid] = useState('');
  const [err, setErr] = useState('');
  const board = useApi<VehicleBoardDto>(user ? '/transport/mine' : null);

  useEffect(() => {
    api<SessionUserDto>('/auth/me').then((u) => {
      if (u.role !== 'driver') { router.replace('/'); return; }
      setUser(u);
      return api<Session[]>('/sessions').then(setSessions);
    }).catch(() => router.replace('/login'));
  }, [router]);

  async function mark(entryId: string, status: RunStatus) {
    try { await patch(`/transport/entries/${entryId}`, { status }); board.reload(); } catch (e) { setErr((e as Error).message); }
  }
  async function signOut() { try { await post('/auth/logout'); } finally { router.replace('/login'); } }

  const b = board.data;
  const riders = (b?.riders ?? []).filter((r) => !sid || r.sessionId === sid);
  const next = riders.find((r) => r.status === 'Waiting');
  return (
    <main className="mx-auto max-w-md space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div><h1>{b?.vehicle.plate ?? 'Run'}</h1><div className="text-mu">{b?.date}</div></div>
        <button type="button" className="btn" onClick={signOut}>Sign out</button>
      </div>
      {(err || board.error) && <div role="alert" className="rounded border border-er bg-erb px-3 py-2 text-er">{err || board.error}</div>}
      {b && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([['Picked', b.stats.picked], ['Waiting', b.stats.waiting], ['Absent', b.stats.absent]] as const).map(([k, v]) => (
              <div key={k} className="card py-2"><div className=" text-[20px] font-semibold">{v}</div><div className="text-mu">{k}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn ${sid === '' ? 'btn-pr' : ''}`} onClick={() => setSid('')}>All</button>
            {sessions.map((s) => <button key={s.id} type="button" className={`btn ${sid === s.id ? 'btn-pr' : ''}`} onClick={() => setSid(s.id)}>{s.name} {formatRange(s.start, s.end)}</button>)}
          </div>
          {next && (
            <div className="card border-ac p-3">
              <div className="text-mu">Next stop</div>
              <div className="mt-0.5 flex items-center justify-between"><strong className="text-[17px]">{next.firstName}</strong><span className="text-mu">{next.levelName}</span></div>
              <div>Pick-up: {next.pickup}</div>
              {next.guardianPhone && <a className="mt-2 inline-block text-ac no-underline" href={`tel:${next.guardianPhone}`}>Call {next.guardian.name} {next.guardianPhone}</a>}
            </div>
          )}
          <ul className="space-y-2">
            {riders.map((r) => (
              <li key={`${r.studentId}-${r.sessionId}`} className="card p-3">
                <div className="flex items-center justify-between"><strong>{r.firstName}</strong><Status value={r.status} /></div>
                <div className="text-mu">{r.levelName}</div>
                <div>Pick-up: {r.pickup}</div>
                <div>Drop-off: {r.dropoff}</div>
                {r.status !== 'Not riding' && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button type="button" className="btn btn-pr h-11" disabled={r.status === 'Picked'} onClick={() => mark(r.entryId, 'Picked')}>Picked</button>
                    <button type="button" className="btn h-11" disabled={r.status === 'Absent'} onClick={() => mark(r.entryId, 'Absent')}>Absent</button>
                    <button type="button" className="btn h-11" disabled={r.status === 'Waiting'} onClick={() => mark(r.entryId, 'Waiting')}>Reset</button>
                  </div>
                )}
              </li>
            ))}
            {riders.length === 0 && <li className="p-6 text-center text-mu">No riders</li>}
          </ul>
        </>
      )}
    </main>
  );
}
