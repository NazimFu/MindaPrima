'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatRM, monthLabel, type InvoiceDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { post } from '@/lib/api';
import { elementToPdf } from '@/lib/pdf';
import { PaymentDialog } from '@/components/payment-dialog';
import { ErrorNote, Loading, PageHeader, Status } from '@/components/ui';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  return (
    <div className="space-y-4">
      <PageHeader title={inv.number} back={{ href: '/billing', label: 'Billing' }} sub={<Status value={inv.status} />}
        actions={<>
          <button type="button" className="btn" disabled={busy} onClick={download}>Download PDF</button>
          <button type="button" className="btn" disabled={busy} onClick={send}>Send on WhatsApp</button>
          {inv.status !== 'Paid' && <button type="button" className="btn btn-pr" onClick={() => setPay(true)}>Record payment</button>}
        </>} />
      <ErrorNote message={err} />
      {note && <div className="rounded border border-ln bg-okb px-3 py-2 text-ok">{note}</div>}

      <div ref={sheet} className="mx-auto max-w-[760px] bg-white p-8 text-[#1C1F1D]">
        <div className="flex justify-between border-b border-[#E2E2DA] pb-4">
          <div><div className="text-[20px] font-semibold">Minda Prima</div><div className="text-[#666B66]">Invoice</div></div>
          <div className="text-right"><div className="font-mono text-[16px] font-semibold">{inv.number}</div><div className="text-[#666B66]">{monthLabel(inv.month)}</div></div>
        </div>
        <div className="py-4">
          <div className="text-[#666B66]">Bill to</div>
          <div className="font-semibold">{inv.guardian.name}</div>
          <div>{inv.guardian.address}</div>
          <div className="font-mono">{inv.guardian.contact}</div>
        </div>
        <table className="w-full border-collapse">
          <thead><tr><th className="border-b border-[#E2E2DA] bg-[#EAF1EB] px-3 py-2 text-left">Student</th><th className="border-b border-[#E2E2DA] bg-[#EAF1EB] px-3 py-2 text-left">Description</th><th className="border-b border-[#E2E2DA] bg-[#EAF1EB] px-3 py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className="border-b border-[#E2E2DA] px-3 py-2">{l.studentName}<div className="text-[#666B66]">{l.levelName}</div></td>
                <td className="border-b border-[#E2E2DA] px-3 py-2">{l.description}</td>
                <td className="border-b border-[#E2E2DA] px-3 py-2 text-right font-mono">{formatRM(l.amount)}</td>
              </tr>
            ))}
            {inv.extraAmount > 0 && (
              <tr><td className="border-b border-[#E2E2DA] px-3 py-2" colSpan={2}>{inv.extraLabel}</td><td className="border-b border-[#E2E2DA] px-3 py-2 text-right font-mono">{formatRM(inv.extraAmount)}</td></tr>
            )}
          </tbody>
        </table>
        <div className="ml-auto mt-4 w-64 space-y-1">
          <div className="flex justify-between"><span>Total</span><span className="font-mono font-semibold">{formatRM(inv.total)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span className="font-mono">{formatRM(inv.paid)}</span></div>
          <div className="flex justify-between border-t border-[#E2E2DA] pt-1"><span>Balance</span><span className="font-mono font-semibold">{formatRM(inv.balance)}</span></div>
        </div>
      </div>

      {inv.payments.length > 0 && (
        <div className="mx-auto max-w-[760px]">
          <h3 className="mb-2">Payments</h3>
          <ul className="card divide-y divide-ln">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex justify-between px-3.5 py-2.5">
                <span><Link className="lk font-mono" href={`/billing/receipts/${p.id}`}>{p.receiptNumber}</Link> <span className="text-mu">{p.date}, {p.method}</span></span>
                <span className="font-mono">{formatRM(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pay && <PaymentDialog invoiceId={inv.id} number={inv.number} balance={inv.balance} onClose={() => setPay(false)} onSaved={(p) => router.push(`/billing/receipts/${p.id}`)} />}
    </div>
  );
}
