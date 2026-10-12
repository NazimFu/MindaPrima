'use client';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { formatRM, type BillingDto, type InvoiceDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { api, post } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { clientMonth } from '@/lib/today';
import { PaymentDialog } from '@/components/payment-dialog';
import { Dialog, Empty, ErrorNote, Field, Loading, MonthPicker, Status } from '@/components/ui';
import { monthLabel } from '@minda/common';

export default function BillingPage() {
  const router = useRouter();
  const [month, setMonth] = useState(clientMonth());
  const { data, error, loading, reload } = useApi<BillingDto>(`/billing?month=${month}`);
  const [q, setQ] = useState('');
  const [unpaid, setUnpaid] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState(false);
  const [pay, setPay] = useState<InvoiceDto | null>(null);
  const [err, setErr] = useState('');

  const rows = (data?.rows ?? []).filter((r) => {
    const t = q.toLowerCase();
    return (!t || r.guardian.name.toLowerCase().includes(t) || r.children.some((c) => c.name.toLowerCase().includes(t)))
      && (!unpaid || !r.invoice || r.invoice.status !== 'Paid');
  });
  const billed = (data?.rows ?? []).reduce((a, r) => a + (r.invoice?.total ?? 0), 0);
  const collected = (data?.rows ?? []).reduce((a, r) => a + (r.invoice?.paid ?? 0), 0);
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function openPay(invoiceId: string) {
    try { setPay(await api<InvoiceDto>(`/billing/invoices/${invoiceId}`)); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Billing</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} current={clientMonth()} />
          <button type="button" className="btn btn-pr" onClick={() => setGen(true)}>Generate invoices</button>
        </div>
      </div>
      <ErrorNote message={err || error} />

      <div className="grid rounded-md border border-ln bg-sf" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="border-r border-ln px-4 py-3"><div className="text-mu">Billed</div><div className="text-[20px] font-medium">{formatRM(billed)}</div></div>
        <div className="border-r border-ln bg-okb px-4 py-3"><div className="text-ok">Collected</div><div className="text-[20px] font-medium text-ok">{formatRM(collected)}</div></div>
        <div className="bg-erb px-4 py-3"><div className="text-er">Outstanding</div><div className="text-[20px] font-medium text-er">{formatRM(Math.max(0, billed - collected))}</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="inp min-w-[260px] flex-1" placeholder="Search guardian or child" aria-label="Search guardians" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} />Unpaid only</label>
      </div>

      <div className="overflow-x-auto rounded-md border border-ln bg-sf">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty>No guardians</Empty> : (
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr><th className="th w-7" /><th className="th">Guardian</th><th className="th">Contact</th><th className="th">Invoice</th><th className="th text-right">Amount</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open.has(r.guardian.id);
                return (
                  <Fragment key={r.guardian.id}>
                    <tr>
                      <td className="td"><button type="button" aria-label={isOpen ? 'Hide children' : 'Show children'} aria-expanded={isOpen} className="text-mu" onClick={() => toggle(r.guardian.id)}>{isOpen ? '▾' : '▸'}</button></td>
                      <td className="td font-medium"><Link className="lk" href={`/guardians/${r.guardian.id}`}>{r.guardian.name}</Link> <span className="font-normal text-mu">{r.children.length === 1 ? r.children[0]!.name : `${r.children.length} children`}</span></td>
                      <td className="td text-mu">{r.guardian.contact}</td>
                      <td className="td">{r.invoice ? <Link href={`/billing/invoices/${r.invoice.id}`} className="mono text-ac no-underline">{r.invoice.number}</Link> : <span className="text-mu">Not generated</span>}</td>
                      <td className="td text-right">{formatRM(r.invoice?.total ?? r.expected)}</td>
                      <td className="td">{r.invoice ? <Status value={r.invoice.status} /> : ''}</td>
                      <td className="td text-right">{r.invoice && r.invoice.status !== 'Paid' && <button type="button" className="btn" onClick={() => openPay(r.invoice!.id)}>Record payment</button>}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="border-b border-ln bg-bg p-0">
                          <div className="px-3 pb-3 pl-10 pt-1">
                            <table className="w-full border-collapse">
                              <thead><tr><th className="th">Child</th><th className="th">Level</th><th className="th">Subjects (this month)</th><th className="th text-right">Fee</th><th className="th">Status</th></tr></thead>
                              <tbody>
                                {r.children.map((c) => (
                                  <tr key={c.id}>
                                    <td className="td font-medium"><Link className="lk" href={`/students/${c.id}`}>{c.name}</Link></td>
                                    <td className="td">{c.levelName}</td>
                                    <td className="td text-mu">{c.subjects.join(', ')}</td>
                                    <td className="td text-right">{formatRM(c.fee)}</td>
                                    <td className="td"><Status value={c.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
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
            <Field label="Extra amount (RM)"><input className="inp" inputMode="decimal" value={extraAmount} onChange={(e) => setAmount(e.target.value)} /></Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
