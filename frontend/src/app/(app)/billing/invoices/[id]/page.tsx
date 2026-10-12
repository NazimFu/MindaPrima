'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatRM, monthLabel, round2, type InvoiceDto, type InvoiceExtraDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { useCentre } from '@/hooks/use-centre';
import { post, put } from '@/lib/api';
import { elementToPdf } from '@/lib/pdf';
import { DocSheet, DocTh, docTd } from '@/components/letterhead';
import { PaymentDialog } from '@/components/payment-dialog';
import { ErrorNote, Loading } from '@/components/ui';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const centre = useCentre();
  const { data: inv, error, loading, reload } = useApi<InvoiceDto>(`/billing/invoices/${id}`);
  const sheet = useRef<HTMLDivElement>(null);
  const [pay, setPay] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ label: string; detail: string; kind: InvoiceExtraDto['kind']; amount: string }[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (inv) { setDraft(inv.extras.map((e) => ({ label: e.label, detail: e.detail, kind: e.kind, amount: e.amount.toFixed(2) }))); setDirty(false); }
  }, [inv]);
  if (loading && !inv) return <Loading />;
  if (!inv) return <ErrorNote message={error || 'Not found'} />;

  const rows = draft.map((e) => ({ ...e, n: Number(e.amount) || 0 }));
  const additions = round2(rows.filter((r) => r.kind === 'Addition').reduce((a, r) => a + r.n, 0));
  const discounts = round2(rows.filter((r) => r.kind === 'Discount').reduce((a, r) => a + r.n, 0));
  const lineTotal = inv.lines.reduce((a, l) => a + l.amount, 0);
  const total = round2(lineTotal + additions - discounts);
  const balance = round2(total - inv.paid);
  const created = new Date(`${inv.createdAt.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const edit = (i: number, patch: Partial<(typeof draft)[number]>) => { setDraft(draft.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); };

  async function saveExtras() {
    if (!inv) return;
    setBusy(true); setErr(''); setNote('');
    try {
      await put(`/billing/invoices/${inv.id}/extras`, { extras: draft.filter((r) => r.label.trim() || r.amount.trim()).map((r) => ({ label: r.label, detail: r.detail, kind: r.kind, amount: Number(r.amount) })) });
      reload(); setNote('Saved');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function download() {
    if (!sheet.current || !inv) return;
    setBusy(true);
    try { (await elementToPdf(sheet.current)).save(`${inv.number}.pdf`); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function send() {
    if (!sheet.current || !inv) return;
    setBusy(true); setErr(''); setNote('');
    try {
      const pdfBase64 = (await elementToPdf(sheet.current)).output('datauristring').split(',')[1] ?? '';
      await post('/whatsapp/send-invoice', { invoiceId: inv.id, pdfBase64 });
      setNote('Sent on WhatsApp');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-[420px] flex-col gap-3">
      <div className="mx-auto flex w-full max-w-[794px] flex-wrap items-center justify-between gap-3">
        <Link href="/billing" className="font-medium text-ac no-underline">← Billing</Link>
        <div className="flex flex-wrap gap-2">
          {inv.status !== 'Paid' && <button type="button" className="btn" disabled={dirty} onClick={() => setPay(true)}>Record payment</button>}
          <button type="button" className="btn" disabled={busy || dirty} onClick={send}>Send via WhatsApp</button>
          <button type="button" className="btn btn-pr" disabled={busy || dirty} onClick={download}>Download PDF</button>
        </div>
      </div>
      <ErrorNote message={err} />
      {note && <div className="mx-auto w-full max-w-[794px] rounded border border-ln bg-okb px-3 py-2 text-ok">{note}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
      <DocSheet sheetRef={sheet} centre={centre} title="Invoice" meta={
        <>
          <div className="text-[#666B66]">{monthLabel(inv.month)}</div>
          <div className="mt-2"><span className="text-[#666B66]">No.</span> <span className="mono">{inv.number}</span></div>
          <div><span className="text-[#666B66]">Date</span> {created}</div>
        </>
      }>
        <div>
          <div className="text-[12px] text-[#666B66]">Billed to</div>
          <div className="text-[15px] font-semibold">{inv.guardian.name}</div>
          <div className="text-[#666B66]">{[inv.guardian.address, inv.guardian.contact].filter(Boolean).join(' · ')}</div>
        </div>
        <table className="w-full border-collapse">
          <thead><tr><DocTh>Student</DocTh><DocTh>Level</DocTh><DocTh>Subjects</DocTh><DocTh right>Amount</DocTh></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className={`${docTd} font-medium`}>{l.studentName}</td>
                <td className={docTd}>{l.levelName}</td>
                <td className={`${docTd} text-[#666B66]`}>{l.description}</td>
                <td className={`${docTd} text-right`}>{formatRM(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div data-html2canvas-ignore="true">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-semibold">Extra fees and discounts</span>
            <span className="flex items-center gap-3">
              {dirty && <button type="button" className="font-medium text-ac" disabled={busy} onClick={saveExtras}>Save rows</button>}
              <button type="button" className="text-ac" onClick={() => { setDraft([...draft, { label: '', detail: '', kind: 'Addition', amount: '' }]); setDirty(true); }}>Add row</button>
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {draft.length === 0 && <div className="text-[#666B66]">None. Use Add row for a fee or a discount.</div>}
            {draft.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input className="inp !h-[30px] min-w-[140px] flex-[2_1_160px] !border-dashed" placeholder="Fee name" aria-label="Fee name" maxLength={80} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} />
                <input className="inp !h-[30px] min-w-[140px] flex-[2_1_160px] !border-dashed" placeholder="Details" aria-label="Details" maxLength={120} value={r.detail} onChange={(e) => edit(i, { detail: e.target.value })} />
                <select className="inp !h-[30px] !w-[110px] !border-dashed" aria-label="Type" value={r.kind} onChange={(e) => edit(i, { kind: e.target.value as InvoiceExtraDto['kind'] })}><option>Addition</option><option>Discount</option></select>
                <input className="inp !h-[30px] !w-[90px] !border-dashed text-right" placeholder="0.00" aria-label="Amount" inputMode="decimal" value={r.amount} onChange={(e) => edit(i, { amount: e.target.value })} />
                <button type="button" aria-label="Remove row" className="h-[30px] w-7 text-mu hover:text-er" onClick={() => { setDraft(draft.filter((_, j) => j !== i)); setDirty(true); }}>×</button>
              </div>
            ))}
          </div>
        </div>
        {rows.length > 0 && !dirty && (
          <div data-pdf-only="true" style={{ display: 'none' }}>
            <div className="mb-1.5 font-semibold">Extra fees and discounts</div>
            <table className="w-full border-collapse"><tbody>
              {rows.map((r, i) => (
                <tr key={i}><td className={`${docTd} font-medium`}>{r.label}</td><td className={`${docTd} text-[#666B66]`}>{r.detail}</td><td className={`${docTd} text-[#666B66]`}>{r.kind}</td><td className={`${docTd} text-right`}>{r.kind === 'Discount' ? '−' : ''}{formatRM(r.n)}</td></tr>
              ))}
            </tbody></table>
          </div>
        )}

        <div className="flex w-[280px] flex-col gap-1.5 self-end">
          <div className="flex justify-between"><span className="text-[#666B66]">Tuition and transport</span><span>{formatRM(lineTotal)}</span></div>
          {additions > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Extra fees</span><span>{formatRM(additions)}</span></div>}
          {discounts > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Discounts</span><span>−{formatRM(discounts)}</span></div>}
          <div className="flex justify-between border-t-2 border-[#14382A] pt-2 text-[16px] font-semibold text-[#14382A]"><span>Total due</span><span>{formatRM(total)}</span></div>
          {inv.paid > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Paid</span><span>{formatRM(inv.paid)}</span></div>}
          {inv.paid > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Balance</span><span>{formatRM(balance)}</span></div>}
        </div>
      </DocSheet>

      {inv.payments.length > 0 && (
        <div className="mx-auto mt-4 w-full max-w-[794px]">
          <h2 className="mb-2">Receipts</h2>
          <ul className="card divide-y divide-ln">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex justify-between px-3.5 py-2.5">
                <span><Link className="lk mono" href={`/billing/receipts/${p.id}`}>{p.receiptNumber}</Link> <span className="text-mu">{p.date}, {p.method}</span></span>
                <span>{formatRM(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
      {pay && <PaymentDialog invoiceId={inv.id} number={inv.number} balance={inv.balance} onClose={() => setPay(false)} onSaved={(p) => router.push(`/billing/receipts/${p.id}`)} />}
    </div>
  );
}
