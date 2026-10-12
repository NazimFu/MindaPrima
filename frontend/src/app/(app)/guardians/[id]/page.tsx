'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatRM, monthLabel, type GuardianProfileDto, type InvoiceDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { GuardianDialog } from '@/components/guardian-dialog';
import { PaymentDialog } from '@/components/payment-dialog';
import { ErrorNote, Loading } from '@/components/ui';
import { useRouter } from 'next/navigation';

const Card = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="card"><div className="card-h"><span>{title}</span>{right}</div>{children}</div>
);

export default function GuardianProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: g, error, loading, reload } = useApi<GuardianProfileDto>(`/guardians/${id}`);
  const [edit, setEdit] = useState(false);
  const [pay, setPay] = useState<InvoiceDto | null>(null);
  const [err, setErr] = useState('');
  if (loading && !g) return <Loading />;
  if (!g) return <ErrorNote message={error || 'Not found'} />;

  const open = g.invoices.find((i) => i.total - i.paid > 0);
  async function record() {
    if (!open) return;
    try { setPay(await api<InvoiceDto>(`/billing/invoices/${open.id}`)); } catch (e) { setErr((e as Error).message); }
  }
  const wa = g.contact.replace(/\D/g, '');
  const waNumber = wa.startsWith('0') ? `60${wa.slice(1)}` : wa;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/guardians" className="text-ac no-underline">← Guardians</Link>
          <h1 className="mt-1.5">{g.name}</h1>
          <div className="text-mu">{g.children.length} children · <span className={`st ${g.owed > 0 ? 'st-wn' : 'st-ok'}`}>{g.owed > 0 ? `${formatRM(g.owed)} owed` : 'Paid up'}</span></div>
        </div>
        <button type="button" className="btn btn-pr" onClick={() => setEdit(true)}>Edit guardian</button>
      </div>
      <ErrorNote message={err} />
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="flex flex-col gap-4">
          <Card title="Details">
            <div className="kv">
              <span>Name</span><span>{g.name}</span>
              <span>Contact</span><span>{g.contact}</span>
              <span>WhatsApp</span><span><a className="lk" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">Message</a></span>
              <span>Address</span><span>{g.address}</span>
              <span>Family total</span><span>{formatRM(g.familyTotal)} a month</span>
            </div>
          </Card>
          <Card title="Children">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] border-collapse">
                <thead><tr><th className="th">Student</th><th className="th">Level</th><th className="th text-right">Fee</th></tr></thead>
                <tbody>
                  {g.children.map((c) => (
                    <tr key={c.id}>
                      <td className="td"><Link className="lk" href={`/students/${c.id}`}>{c.firstName}</Link></td>
                      <td className="td">{c.levelName}</td>
                      <td className="td text-right">{formatRM(c.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <Card title="Invoices and receipts" right={open && <button type="button" className="font-normal text-ac" onClick={record}>Record payment</button>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse">
              <thead><tr><th className="th">Invoice</th><th className="th">Month</th><th className="th text-right">Total</th><th className="th text-right">Owed</th><th className="th">Receipt</th></tr></thead>
              <tbody>
                {g.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="td"><Link className="lk" href={`/billing/invoices/${i.id}`}>{i.number}</Link></td>
                    <td className="td">{monthLabel(i.month)}</td>
                    <td className="td text-right">{formatRM(i.total)}</td>
                    <td className="td text-right">{formatRM(Math.max(0, i.total - i.paid))}</td>
                    <td className="td">{i.receipts.length ? i.receipts.map((r, k) => <span key={r.id}>{k > 0 && ', '}<Link className="lk" href={`/billing/receipts/${r.id}`}>{r.number}</Link></span>) : i.total - i.paid <= 0 ? 'Paid' : ''}</td>
                  </tr>
                ))}
                {g.invoices.length === 0 && <tr><td className="td text-center text-mu" colSpan={5}>No invoices</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {edit && <GuardianDialog guardian={g} address={g.address} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
      {pay && <PaymentDialog invoiceId={pay.id} number={pay.number} balance={pay.balance} onClose={() => setPay(null)} onSaved={(p) => router.push(`/billing/receipts/${p.id}`)} />}
    </div>
  );
}
