'use client';
import { useState } from 'react';
import { formatRM, type GuardianListItem } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { clientMonth } from '@/lib/today';
import { GuardianDialog } from '@/components/guardian-dialog';
import { Card, Empty, ErrorNote, Loading, MonthPicker, PageHeader, PersonLink, Status, Table } from '@/components/ui';

export default function GuardiansPage() {
  const [month, setMonth] = useState(clientMonth());
  const { data, error, loading, reload } = useApi<GuardianListItem[]>(`/guardians?month=${month}`);
  const [edit, setEdit] = useState<GuardianListItem | 'new' | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Guardians" count={data?.length}
        actions={<><MonthPicker value={month} onChange={setMonth} current={clientMonth()} /><button type="button" className="btn btn-pr" onClick={() => setEdit('new')}>Add guardian</button></>} />
      <ErrorNote message={error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No guardians</Empty> : (
          <Table head={['Guardian', 'Contact', 'Children', { label: 'Owed', right: true }, 'Status', '']}>
            {data.map((g) => (
              <tr key={g.id}>
                <td className="td"><PersonLink kind="guardian" id={g.id}>{g.name}</PersonLink></td>
                <td className="td font-mono">{g.contact}</td>
                <td className="td">{g.children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<PersonLink kind="student" id={c.id}>{c.name}</PersonLink></span>)}</td>
                <td className="td text-right font-mono">{formatRM(g.owed)}</td>
                <td className="td"><Status value={g.status} /></td>
                <td className="td text-right"><button type="button" className="btn" onClick={() => setEdit(g)}>Edit</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {edit && <GuardianDialog guardian={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
