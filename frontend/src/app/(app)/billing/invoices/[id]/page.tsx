'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatRM, monthLabel, type InvoiceDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { useCentre } from '@/hooks/use-centre';
import { post } from '@/lib/api';
import { elementToPdf } from '@/lib/pdf';
import { DocSheet, DocTh, docTd } from '@/components/letterhead';
import { PaymentDialog } from '@/components/payment-dialog';
import { ErrorNote, Loading } from '@/components/ui';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const centre = useCentre();
  const { data: inv, error, loading } = useApi<InvoiceDto>(`/billing/invoices/${id}`);
  const sheet = useRef<HTMLDivElement>(null);
  const [pay, setPay] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading && !inv) return <Loading />;
  if (!inv) return <ErrorNote message={error || 'Not found'} />;

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
  const lineTotal = inv.lines.reduce((a, l) => a + l.amount, 0);
  const created = new Date(`${inv.createdAt.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[794px] flex-wrap items-center justify-between gap-3">
        <Link href="/billing" className="font-medium text-ac no-underline">← Billing</Link>
        <div className="flex flex-wrap gap-2">
          {inv.status !== 'Paid' && <button type="button" className="btn" onClick={() => setPay(true)}>Record payment</button>}
          <button type="button" className="btn" disabled={busy} onClick={send}>Send via WhatsApp</button>
          <button type="button" className="btn btn-pr" disabled={busy} onClick={download}>Download PDF</button>
        </div>
      </div>
      <ErrorNote message={err} />
      {note && <div className="mx-auto w-full max-w-[794px] rounded border border-ln bg-okb px-3 py-2 text-ok">{note}</div>}

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
            {inv.extraAmount !== 0 && (
              <tr><td className={docTd} colSpan={3}>{inv.extraLabel || 'Extra'}</td><td className={`${docTd} text-right`}>{formatRM(inv.extraAmount)}</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex w-[280px] flex-col gap-1.5 self-end">
          <div className="flex justify-between"><span className="text-[#666B66]">Tuition and transport</span><span>{formatRM(lineTotal)}</span></div>
          {inv.extraAmount !== 0 && <div className="flex justify-between"><span className="text-[#666B66]">{inv.extraAmount < 0 ? 'Discounts' : 'Extra fees'}</span><span>{inv.extraAmount < 0 ? '−' : ''}{formatRM(Math.abs(inv.extraAmount))}</span></div>}
          <div className="flex justify-between border-t-2 border-[#14382A] pt-2 text-[16px] font-semibold text-[#14382A]"><span>Total due</span><span>{formatRM(inv.total)}</span></div>
          {inv.paid > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Paid</span><span>{formatRM(inv.paid)}</span></div>}
          {inv.paid > 0 && <div className="flex justify-between"><span className="text-[#666B66]">Balance</span><span>{formatRM(inv.balance)}</span></div>}
        </div>
      </DocSheet>

      {inv.payments.length > 0 && (
        <div className="mx-auto w-full max-w-[794px]">
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
      {pay && <PaymentDialog invoiceId={inv.id} number={inv.number} balance={inv.balance} onClose={() => setPay(false)} onSaved={(p) => router.push(`/billing/receipts/${p.id}`)} />}
    </div>
  );
}
