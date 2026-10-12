'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatRM, monthLabel, type GuardianProfileDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { Card, Empty, ErrorNote, KV, Loading, PageHeader, PersonLink, Status, Table } from '@/components/ui';
import { GuardianDialog } from '@/components/guardian-dialog';

export default function GuardianProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: g, error, loading, reload } = useApi<GuardianProfileDto>(`/guardians/${id}`);
  const [edit, setEdit] = useState(false);
  if (loading && !g) return <Loading />;
  if (!g) return <ErrorNote message={error || 'Not found'} />;
  return (
    <div className="space-y-4">
      <PageHeader title={g.name} back={{ href: '/guardians', label: 'Guardians' }} actions={<button type="button" className="btn" onClick={() => setEdit(true)}>Edit</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Details">
          <KV rows={[
            ['Contact', <span key="c" className="font-mono">{g.contact}</span>],
            ['Address', g.address],
            ['Family total', <span key="t" className="font-mono">{formatRM(g.familyTotal)}</span>],
            ['Owed', <span key="o" className="font-mono font-semibold">{formatRM(g.owed)}</span>],
          ]} />
        </Card>
        <Card title="Children">
          {g.children.length === 0 ? <Empty>No children</Empty> : (
            <Table head={['Student', 'Level', { label: 'Monthly fee', right: true }]} min={320}>
              {g.children.map((c) => (
                <tr key={c.id}>
                  <td className="td"><PersonLink kind="student" id={c.id}>{c.firstName}</PersonLink></td>
                  <td className="td">{c.levelName}</td>
                  <td className="td text-right font-mono">{formatRM(c.fee)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
      <Card title="Invoices">
        {g.invoices.length === 0 ? <Empty>No invoices</Empty> : (
          <Table head={['Month', 'Invoice', { label: 'Total', right: true }, { label: 'Paid', right: true }, 'Status', 'Receipts']}>
            {g.invoices.map((i) => (
              <tr key={i.id}>
                <td className="td">{monthLabel(i.month)}</td>
                <td className="td"><Link className="lk font-mono" href={`/billing/invoices/${i.id}`}>{i.number}</Link></td>
                <td className="td text-right font-mono">{formatRM(i.total)}</td>
                <td className="td text-right font-mono">{formatRM(i.paid)}</td>
                <td className="td"><Status value={i.status} /></td>
                <td className="td font-mono">{i.receipts.join(', ')}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {edit && <GuardianDialog guardian={g} address={g.address} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
    </div>
  );
}
