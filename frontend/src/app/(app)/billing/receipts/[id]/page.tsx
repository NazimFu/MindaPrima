'use client';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatRM, monthLabel, type ReceiptDto } from '@minda/common';
import { useApi } from '@/hooks/use-api';
import { elementToPdf } from '@/lib/pdf';
import { ErrorNote, Loading, PageHeader } from '@/components/ui';

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { data: r, error, loading } = useApi<ReceiptDto>(`/billing/receipts/${id}`);
  const sheet = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');
  if (loading && !r) return <Loading />;
  if (!r) return <ErrorNote message={error || 'Not found'} />;

  async function download() {
    if (!sheet.current || !r) return;
    try { (await elementToPdf(sheet.current)).save(`${r.payment.receiptNumber}.pdf`); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-4">
      <PageHeader title={r.payment.receiptNumber} back={{ href: `/billing/invoices/${r.invoice.id}`, label: r.invoice.number }}
        actions={<button type="button" className="btn" onClick={download}>Download PDF</button>} />
      <ErrorNote message={err} />
      <div ref={sheet} className="mx-auto max-w-[620px] bg-white p-8 text-[#1C1F1D]">
        <div className="flex justify-between border-b border-[#E2E2DA] pb-4">
          <div><div className="text-[20px] font-semibold">Minda Prima</div><div className="text-[#666B66]">Receipt</div></div>
          <div className="text-right"><div className="font-mono text-[16px] font-semibold">{r.payment.receiptNumber}</div><div className="text-[#666B66]">{r.payment.date}</div></div>
        </div>
        <div className="space-y-2 py-4">
          <div className="flex justify-between"><span className="text-[#666B66]">Received from</span><span>{r.invoice.guardian.name}</span></div>
          <div className="flex justify-between"><span className="text-[#666B66]">For</span><span><span className="font-mono">{r.invoice.number}</span>, {monthLabel(r.invoice.month)}</span></div>
          <div className="flex justify-between"><span className="text-[#666B66]">Students</span><span className="text-right">{[...new Set(r.invoice.lines.map((l) => l.studentName))].join(', ')}</span></div>
          <div className="flex justify-between"><span className="text-[#666B66]">Method</span><span>{r.payment.method}</span></div>
        </div>
        <div className="space-y-1 border-t border-[#E2E2DA] pt-3">
          <div className="flex justify-between"><span>Amount received</span><span className="font-mono text-[16px] font-semibold">{formatRM(r.payment.amount)}</span></div>
          <div className="flex justify-between"><span>Invoice total</span><span className="font-mono">{formatRM(r.invoice.total)}</span></div>
          <div className="flex justify-between"><span>Balance</span><span className="font-mono">{formatRM(r.balance)}</span></div>
        </div>
      </div>
    </div>
  );
}
