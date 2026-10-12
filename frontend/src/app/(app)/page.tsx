'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatRM, monthLabel, PAYMENT_STATUSES, type OverviewDto, type PaymentStatus } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { clientMonth } from '@/lib/today';
import { ErrorNote, Loading, MonthPicker, Status } from '@/components/ui';
import { useSession } from '@/components/session';

const TILE: Record<PaymentStatus, string> = { Paid: 'bg-okb', Partial: 'bg-wnb', Pending: 'bg-wnb', Overdue: 'bg-erb' };
const BAR: Record<PaymentStatus, string> = { Paid: 'bg-ok', Partial: 'bg-wn', Pending: 'bg-wn', Overdue: 'bg-er' };

export default function OverviewPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(clientMonth());
  const { data: d, error, loading } = useApi<OverviewDto>(user.role === 'teacher' ? null : `/overview?month=${month}`);
  if (user.role === 'teacher') return <h1>Overview</h1>;

  const students = d ? PAYMENT_STATUSES.reduce((a, s) => a + d.byStatus[s].students, 0) : 0;
  const notPaid = d ? students - d.byStatus.Paid.students : 0;
  const maxLevel = Math.max(1, ...(d?.levels.map((l) => l.count) ?? [1]));

  return (
    <div className="flex flex-col gap-6">
      <ErrorNote message={error} />
      {loading && !d ? <Loading /> : d && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-mu">{monthLabel(d.month)}</div>
              <h1 className="my-0.5 text-[30px] font-semibold tracking-[-0.01em]"><span className="text-er">{formatRM(d.money.owed).replace('.00', '')}</span> outstanding</h1>
              <div className="text-mu">
                {notPaid} of {students} students have not paid.
                {d.previous && ` ${monthLabel(d.previous.month).split(' ')[0]} closed at ${d.previous.collectedPercent}% collected.`}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MonthPicker value={month} onChange={setMonth} current={clientMonth()} />
              <Link href="/teachers?new=1" className="btn no-underline">Add teacher</Link>
              <Link href="/students?new=1" className="btn btn-pr no-underline">Add student</Link>
            </div>
          </div>

          <section>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm" role="img" aria-label="Students by payment status">
              {PAYMENT_STATUSES.filter((s) => d.byStatus[s].students > 0).map((s) => (
                <div key={s} className={BAR[s]} style={{ width: `${(d.byStatus[s].students / Math.max(1, students)) * 100}%` }} />
              ))}
            </div>
            <div className="mt-3 grid rounded-md border border-ln bg-sf" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {PAYMENT_STATUSES.map((s) => (
                <Link key={s} href={`/students?status=${s}`} className={`border-r border-ln px-4 py-3.5 no-underline last:border-r-0 ${TILE[s]}`}>
                  <Status value={s} />
                  <div className="mt-2 text-[20px] font-medium">{formatRM(d.byStatus[s].amount)}</div>
                  <div className="text-mu">{d.byStatus[s].students} students</div>
                </Link>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-start gap-8">
            <section className="min-w-0 flex-[3_1_460px]">
              <div className="mb-2 flex items-baseline justify-between">
                <h2>Guardians who owe</h2>
                <Link href="/billing" className="text-ac no-underline">Open billing</Link>
              </div>
              <div className="overflow-x-auto rounded-md border border-ln bg-sf">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead><tr><th className="th">Guardian</th><th className="th">Children</th><th className="th text-right">Owed</th><th className="th">Status</th></tr></thead>
                  <tbody>
                    {d.guardians.filter((g) => g.owed > 0).slice(0, 8).map((g) => (
                      <tr key={g.id}>
                        <td className="td font-medium"><Link className="lk" href={`/guardians/${g.id}`}>{g.name}</Link></td>
                        <td className="td text-mu">{g.children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<Link className="lk" href={`/students/${c.id}`}>{c.name}</Link></span>)}</td>
                        <td className="td text-right">{formatRM(g.owed)}</td>
                        <td className="td"><Status value={g.status} /></td>
                      </tr>
                    ))}
                    {d.guardians.every((g) => g.owed <= 0) && <tr><td className="td text-center text-mu" colSpan={4}>Nobody owes anything</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="min-w-0 flex-[2_1_280px]">
              <h2 className="mb-2">Enrolment by level</h2>
              <div className="flex flex-col gap-2 rounded-md border border-ln bg-sf px-4 py-3">
                {d.levels.map((l) => (
                  <div key={l.name} className="flex items-center gap-2.5">
                    <span className="w-[74px] text-mu">{l.name}</span>
                    <span className="h-1.5 flex-1 rounded-sm bg-hv"><span className="block h-1.5 rounded-sm bg-ac" style={{ width: `${(l.count / maxLevel) * 100}%` }} /></span>
                    <span className="w-6 text-right">{l.count}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-ln pt-2 text-mu">
                  <span>Primary {d.levels.filter((l) => l.name.startsWith('Primary')).reduce((a, l) => a + l.count, 0)}</span>
                  <span>Secondary {d.levels.filter((l) => l.name.startsWith('Secondary')).reduce((a, l) => a + l.count, 0)}</span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
