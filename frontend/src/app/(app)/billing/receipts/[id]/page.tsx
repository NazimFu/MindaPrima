'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatRM, type ReceiptDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { useCentre } from '@/hooks/use-centre';
import { elementToPdf } from '@/lib/pdf';
import { DocSheet, DocTh, docTd } from '@/components/letterhead';
import { ErrorNote, Loading } from '@/components/ui';

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const centre = useCentre();
  const { data: r, error, loading } = useApi<ReceiptDto>(`/billing/receipts/${id}`);
  const sheet = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');
  if (loading && !r) return <Loading />;
  if (!r) return <ErrorNote message={error || 'Not found'} />;

  async function download() {
    if (!sheet.current || !r) return;
    try { (await elementToPdf(sheet.current)).save(`${r.payment.receiptNumber}.pdf`); } catch (e) { setErr((e as Error).message); }
  }
  const state = r.balance <= 0 ? 'Paid' : 'Part paid';
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[794px] flex-wrap items-center justify-between gap-3">
        <Link href={`/billing/invoices/${r.invoice.id}`} className="font-medium text-ac no-underline">← Invoice {r.invoice.number}</Link>
        <button type="button" className="btn btn-pr" onClick={download}>Download PDF</button>
      </div>
      <ErrorNote message={err} />
      <DocSheet sheetRef={sheet} centre={centre} title="Receipt" meta={
        <>
          <div className="mt-2"><span className="text-[#666B66]">No.</span> <span className="mono">{r.payment.receiptNumber}</span></div>
          <div><span className="text-[#666B66]">Date</span> {longDate(r.payment.date)}</div>
          <div><span className="text-[#666B66]">For invoice</span> <span className="mono">{r.invoice.number}</span></div>
        </>
      }>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <div className="text-[12px] text-[#666B66]">Received from</div>
            <div className="text-[15px] font-semibold">{r.invoice.guardian.name}</div>
            <div className="text-[#666B66]">{[r.invoice.guardian.address, r.invoice.guardian.contact].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-[#666B66]">Invoice status</div>
            <span className={`st ${r.balance <= 0 ? 'st-ok' : 'st-wn'}`}>{state}</span>
          </div>
        </div>
        <table className="w-full border-collapse">
          <thead><tr><DocTh>Date</DocTh><DocTh>Method</DocTh><DocTh>Students</DocTh><DocTh right>Amount</DocTh></tr></thead>
          <tbody>
            <tr>
              <td className={docTd}>{r.payment.date}</td>
              <td className={docTd}>{r.payment.method}</td>
              <td className={docTd}>{[...new Set(r.invoice.lines.map((l) => l.studentName))].join(', ')}</td>
              <td className={`${docTd} text-right`}>{formatRM(r.payment.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex w-[300px] flex-col gap-1.5 self-end">
          <div className="flex justify-between"><span className="text-[#666B66]">Invoice total</span><span>{formatRM(r.invoice.total)}</span></div>
          <div className="flex justify-between"><span className="text-[#666B66]">Received to date</span><span>{formatRM(r.received)}</span></div>
          <div className="flex justify-between border-t-2 border-[#14382A] pt-2 text-[16px] font-semibold text-[#14382A]"><span>Balance due</span><span>{formatRM(Math.max(0, r.balance))}</span></div>
        </div>
        <div className="border-t border-[#E2E2DA] pt-3.5 text-[12px] text-[#666B66]">Thank you. This receipt confirms the payment above. The invoice stays open until the balance is paid.</div>
      </DocSheet>
    </div>
  );
}
