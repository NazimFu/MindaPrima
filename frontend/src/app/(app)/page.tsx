'use client';
import { useState } from 'react';
import { formatRM, monthLabel, PAYMENT_STATUSES, type OverviewDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { clientMonth } from '@/lib/today';
import { Card, Empty, ErrorNote, Loading, MonthPicker, PageHeader, PersonLink, Status, Table } from '@/components/ui';
import { useSession } from '@/components/session';

export default function OverviewPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(clientMonth());
  const { data, error, loading } = useApi<OverviewDto>(user.role === 'teacher' ? null : `/overview?month=${month}`);
  if (user.role === 'teacher') return <PageHeader title="Overview" sub="Open Students or Teachers from the sidebar." />;

  return (
    <div className="space-y-4">
      <PageHeader title="Overview" sub={monthLabel(month)} actions={<MonthPicker value={month} onChange={setMonth} current={clientMonth()} />} />
      <ErrorNote message={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([['Students', data.counts.students], ['Guardians', data.counts.guardians], ['Teachers', data.counts.teachers], ['Vehicles', data.counts.vehicles]] as const).map(([k, v]) => (
              <div key={k} className="card px-3.5 py-3"><div className="text-mu">{k}</div><div className="font-mono text-[22px] font-semibold">{v}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {([['Expected', data.money.expected], ['Collected', data.money.collected], ['Owed', data.money.owed]] as const).map(([k, v]) => (
              <div key={k} className="card px-3.5 py-3"><div className="text-mu">{k}</div><div className="font-mono text-[22px] font-semibold">{formatRM(v)}</div></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {PAYMENT_STATUSES.map((s) => <span key={s} className="flex items-center gap-2"><Status value={s} /><span className="font-mono">{data.statusCounts[s]}</span></span>)}
          </div>
          <Card title="Guardians">
            {data.guardians.length === 0 ? <Empty>No guardians yet</Empty> : (
              <Table head={['Guardian', 'Children', { label: 'Owed', right: true }, 'Status']}>
                {data.guardians.map((g) => (
                  <tr key={g.id}>
                    <td className="td"><PersonLink kind="guardian" id={g.id}>{g.name}</PersonLink></td>
                    <td className="td">{g.children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<PersonLink kind="student" id={c.id}>{c.name}</PersonLink></span>)}</td>
                    <td className="td text-right font-mono">{formatRM(g.owed)}</td>
                    <td className="td"><Status value={g.status} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
