'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatRM, monthLabel, type BillingRow, type InvoiceDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { api, post } from '@/lib/api';
import { clientMonth } from '@/lib/today';
import { PaymentDialog } from '@/components/payment-dialog';
import { Card, Dialog, Empty, ErrorNote, Field, Loading, MonthPicker, PageHeader, PersonLink, Status, Table } from '@/components/ui';

export default function BillingPage() {
  const router = useRouter();
  const [month, setMonth] = useState(clientMonth());
  const { data, error, loading, reload } = useApi<BillingRow[]>(`/billing?month=${month}`);
  const [gen, setGen] = useState(false);
  const [pay, setPay] = useState<InvoiceDto | null>(null);
  const [err, setErr] = useState('');

  async function openPay(invoiceId: string) {
    try { setPay(await api<InvoiceDto>(`/billing/invoices/${invoiceId}`)); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" sub={monthLabel(month)}
        actions={<><MonthPicker value={month} onChange={setMonth} current={clientMonth()} /><button type="button" className="btn btn-pr" onClick={() => setGen(true)}>Generate invoices</button></>} />
      <ErrorNote message={err || error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No guardians</Empty> : (
          <Table head={['Guardian', 'Children', 'Invoice', { label: 'Total', right: true }, { label: 'Paid', right: true }, 'Status', '']}>
            {data.map((r) => (
              <tr key={r.guardian.id}>
                <td className="td"><PersonLink kind="guardian" id={r.guardian.id}>{r.guardian.name}</PersonLink></td>
                <td className="td">{r.children.map((c, i) => <span key={c.id}>{i > 0 && ', '}<PersonLink kind="student" id={c.id}>{c.name}</PersonLink></span>)}</td>
                <td className="td">{r.invoice ? <Link className="lk font-mono" href={`/billing/invoices/${r.invoice.id}`}>{r.invoice.number}</Link> : <span className="text-mu">Not generated</span>}</td>
                <td className="td text-right font-mono">{formatRM(r.invoice?.total ?? r.expected)}</td>
                <td className="td text-right font-mono">{r.invoice ? formatRM(r.invoice.paid) : ''}</td>
                <td className="td">{r.invoice ? <Status value={r.invoice.status} /> : ''}</td>
                <td className="td text-right">{r.invoice && r.invoice.status !== 'Paid' && <button type="button" className="btn" onClick={() => openPay(r.invoice!.id)}>Record payment</button>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {gen && <GenerateDialog month={month} onClose={() => setGen(false)} onDone={() => { setGen(false); reload(); }} />}
      {pay && <PaymentDialog invoiceId={pay.id} number={pay.number} balance={pay.balance} onClose={() => setPay(null)} onSaved={(p) => router.push(`/billing/receipts/${p.id}`)} />}
    </div>
  );
}

function GenerateDialog({ month, onClose, onDone }: { month: string; onClose: () => void; onDone: () => void }) {
  const [extraLabel, setLabel] = useState('');
  const [extraAmount, setAmount] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  async function run() {
    try {
      const r = await post<{ created: number; skipped: number }>('/billing/generate', { month, extraLabel, extraAmount: Number(extraAmount) || 0 });
      setResult(`${r.created} created, ${r.skipped} skipped`);
    } catch (e) { setError((e as Error).message); }
  }
  return (
    <Dialog title={`Generate invoices, ${monthLabel(month)}`} onClose={result ? onDone : onClose}
      footer={result ? <button type="button" className="btn btn-pr" onClick={onDone}>Done</button> : <><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-pr" onClick={run}>Generate</button></>}>
      <div className="space-y-3 p-6">
        <ErrorNote message={error} />
        {result ? <p>{result}</p> : (
          <>
            <p className="text-mu">One invoice per guardian. Existing invoices for this month are kept.</p>
            <Field label="Extra line (optional)"><input className="inp" value={extraLabel} maxLength={80} onChange={(e) => setLabel(e.target.value)} /></Field>
            <Field label="Extra amount (RM)"><input className="inp font-mono" inputMode="decimal" value={extraAmount} onChange={(e) => setAmount(e.target.value)} /></Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
