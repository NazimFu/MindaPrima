'use client';
import Link from 'next/link';
import { useState } from 'react';
import { formatRM, type GuardianListItem } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { clientMonth } from '@/lib/today';
import { GuardianDialog } from '@/components/guardian-dialog';
import { Empty, ErrorNote, Loading, Status } from '@/components/ui';

export default function GuardiansPage() {
  const { data, error, loading, reload } = useApi<GuardianListItem[]>(`/guardians?month=${clientMonth()}`);
  const [add, setAdd] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1>Guardians {data && <span className="font-normal text-mu">{data.length}</span>}</h1>
        <button type="button" className="btn btn-pr" onClick={() => setAdd(true)}>Add guardian</button>
      </div>
      <ErrorNote message={error} />
      <div className="card">
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No guardians</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead><tr><th className="th">Name</th><th className="th">Contact</th><th className="th">Children</th><th className="th text-right">Owed</th><th className="th">Status</th></tr></thead>
              <tbody>
                {data.map((g) => (
                  <tr key={g.id}>
                    <td className="td"><Link className="lk" href={`/guardians/${g.id}`}>{g.name}</Link></td>
                    <td className="td">{g.contact}</td>
                    <td className="td">{g.children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<Link className="lk" href={`/students/${c.id}`}>{c.name}</Link></span>)}</td>
                    <td className="td text-right">{formatRM(g.owed)}</td>
                    <td className="td"><Status value={g.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {add && <GuardianDialog onClose={() => setAdd(false)} onSaved={() => { setAdd(false); reload(); }} />}
    </div>
  );
}
