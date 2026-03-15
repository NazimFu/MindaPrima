"use client";

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Student, Prices } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowLeft, FileDown, PlusCircle, Trash2, MessageCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Price helper
// ---------------------------------------------------------------------------

const calcPrice = (student: Student, prices: Prices): number => {
  const numSubjects = student.subjects.split(',').map(s => s.trim()).filter(Boolean).length;
  const levelPrices = prices[student.level];
  let tuitionFee = 0;
  if (levelPrices?.[numSubjects.toString()]) {
    tuitionFee = levelPrices[numSubjects.toString()];
  }
  let transportFee = 0;
  if (student.transport === 'Yes') {
    transportFee = student.transportArea === 'Inside Limit'
      ? prices.transportInbound
      : prices.transportOutbound;
  }
  return tuitionFee + transportFee;
};

// ---------------------------------------------------------------------------
// PDF builder — returns a Blob without triggering a download
// ---------------------------------------------------------------------------

async function buildPdfBlob(
  container: HTMLDivElement,
  invoiceId: string
): Promise<Blob> {
  const originalFont = container.style.fontFamily;
  container.style.fontFamily = 'sans-serif';

  const toHide = container.querySelectorAll<HTMLElement>('button, [data-pdf-hide]');
  toHide.forEach(el => { el.style.display = 'none'; });

  const interactive = Array.from(
    container.querySelectorAll<HTMLElement>('[data-pdf-interactive]')
  );
  const replacements: { original: HTMLElement; rep: HTMLSpanElement }[] = [];

  interactive.forEach(el => {
    let value = '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      value = (el as HTMLInputElement | HTMLTextAreaElement).value;
    } else if (el.dataset.radixSelectTrigger) {
      const span = el.querySelector<HTMLSpanElement>('span');
      if (span) value = span.innerText;
    }
    const rep = document.createElement('span');
    rep.className = el.dataset.pdfReplacementClass || '';
    rep.textContent = el.dataset.pdfPrefix ? `${el.dataset.pdfPrefix}${value}` : value;
    el.style.display = 'none';
    el.parentElement?.insertBefore(rep, el.nextSibling);
    replacements.push({ original: el, rep });
  });

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    return pdf.output('blob');
  } finally {
    container.style.fontFamily = originalFont;
    toHide.forEach(el => { el.style.display = ''; });
    replacements.forEach(({ original, rep }) => {
      original.style.display = '';
      rep.remove();
    });
  }
}

// ---------------------------------------------------------------------------
// WhatsApp sender -- POSTs to the server API route (whatsapp-web.js).
// Personal phone number, no access token required.
// Client must be connected first via /whatsapp-setup.
// ---------------------------------------------------------------------------

async function sendWhatsAppPdf(opts: {
  toNumber: string;
  guardianName: string;
  invoiceMonth: string;
  grandTotal: number;
  invoiceId: string;
  pdfBlob: Blob;
}): Promise<void> {
  const { toNumber, guardianName, invoiceMonth, grandTotal, invoiceId, pdfBlob } = opts;

  const body = new FormData();
  body.append('pdf',          pdfBlob, `invoice-${invoiceId}.pdf`);
  body.append('invoiceId',    invoiceId);
  body.append('toNumber',     toNumber);
  body.append('guardianName', guardianName);
  body.append('invoiceMonth', invoiceMonth);
  body.append('grandTotal',   grandTotal.toFixed(2));

  const res  = await fetch('/api/whatsapp/send', { method: 'POST', body });
  const data = await res.json() as { success?: boolean; error?: string };

  if (!res.ok || data.error) {
    if (res.status === 503) {
      throw new Error(
        'WhatsApp is not connected. Go to /whatsapp-setup and scan the QR code first.\n\n' +
        (data.error ?? '')
      );
    }
    throw new Error(data.error ?? `Unexpected response (${res.status})`);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FlexibleFee = {
  description: string;
  details: string;
  type: 'Addition' | 'Deduction';
  amount: number;
};

type WaState = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InvoicePage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const invoiceRef   = React.useRef<HTMLDivElement>(null);

  const [invoiceData,   setInvoiceData]   = React.useState<any>(null);
  const [flexibleFees,  setFlexibleFees]  = React.useState<FlexibleFee[]>([]);
  const [discount,      setDiscount]      = React.useState(0);
  const [notes,         setNotes]         = React.useState(
    'T(I): Transport (Bandar Putra area)\nT(O): Transport (Outside limit)'
  );
  const [waState,       setWaState]       = React.useState<WaState>('idle');
  const [waError,       setWaError]       = React.useState('');
  const [pdfBusy,       setPdfBusy]       = React.useState(false);

  React.useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      setInvoiceData(JSON.parse(data));
      setFlexibleFees([
        { description: 'New Registration', details: 'One-time fee',     type: 'Addition', amount: 0 },
        { description: 'Personal Tuition', details: '1 Person',         type: 'Addition', amount: 0 },
        { description: 'Worksheet',        details: 'Once a year (3P)', type: 'Addition', amount: 0 },
      ]);
    }
  }, [searchParams]);

  // ── Derived totals ──────────────────────────────────────────────────────

  const subtotal = React.useMemo(() => {
    if (!invoiceData) return 0;
    return (invoiceData.children as Student[]).reduce(
      (acc, s) => acc + calcPrice(s, invoiceData.prices), 0
    );
  }, [invoiceData]);

  const flexibleTotal = React.useMemo(
    () => flexibleFees.reduce((acc, f) => acc + (f.type === 'Addition' ? f.amount : -f.amount), 0),
    [flexibleFees]
  );

  const grandTotal = subtotal + flexibleTotal - discount;

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getInvoiceMonth = (): string => {
    if (!invoiceData?.month) return '';
    if (invoiceData.month === 'current')
      return new Date().toLocaleString('default', { month: 'long' });
    return invoiceData.month.split(' ')[0];
  };

  const getTransportNote = (student: Student, prices: Prices): string => {
    if (student.transport !== 'Yes') return '';
    return student.transportArea === 'Inside Limit'
      ? `T(I): RM${prices.transportInbound.toFixed(2)}`
      : `T(O): RM${prices.transportOutbound.toFixed(2)}`;
  };

  const updateFee = (index: number, field: keyof FlexibleFee, value: string | number) => {
    setFlexibleFees(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === 'amount' ? (parseFloat(value as string) || 0) : value,
      };
      return next;
    });
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setPdfBusy(true);
    try {
      const blob = await buildPdfBlob(invoiceRef.current, params.id as string);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `invoice-${params.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoiceRef.current || !invoiceData) return;

    // Phone number stored as +60xxxxxxxx (normalised by the student form).
    // Fall back to the first child's guardianContact for legacy records.
    const rawNumber: string =
      invoiceData.contact ||
      (invoiceData.children as Student[])[0]?.guardianContact ||
      '';

    if (!rawNumber) {
      setWaError('No phone number found for this guardian.');
      setWaState('error');
      return;
    }

    setWaState('loading');
    setWaError('');

    try {
      const pdfBlob = await buildPdfBlob(invoiceRef.current, params.id as string);
      await sendWhatsAppPdf({
        toNumber: rawNumber,
        guardianName: invoiceData.guardianName,
        invoiceMonth: getInvoiceMonth(),
        grandTotal,
        invoiceId: params.id as string,
        pdfBlob,
      });
      setWaState('success');
      setTimeout(() => setWaState('idle'), 4000);
    } catch (err: any) {
      setWaError(err?.message ?? 'Unknown error');
      setWaState('error');
    }
  };

  // ── Loading guard ────────────────────────────────────────────────────────

  if (!invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[hsl(var(--background))] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
        <p className="text-xs text-[hsl(var(--muted-foreground))] tracking-widest uppercase">Loading invoice</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-4 sm:p-8">

      {/* Action bar */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="ghost" size="sm" asChild
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* WhatsApp button */}
          <Button
            size="sm" variant="outline"
            onClick={handleSendWhatsApp}
            disabled={waState === 'loading'}
            className={`text-xs border transition-colors ${
              waState === 'success' ? 'border-[hsl(168,60%,48%/0.5)] text-[hsl(168,60%,55%)] bg-[hsl(168,60%,48%/0.08)]'
              : waState === 'error'   ? 'border-[hsl(0,72%,55%/0.5)]  text-[hsl(0,72%,60%)]  bg-[hsl(0,72%,55%/0.08)]'
              : 'border-[hsl(168,60%,48%/0.4)] text-[hsl(168,60%,55%)] hover:bg-[hsl(168,60%,48%/0.08)]'
            }`}
          >
            {waState === 'loading' && <Loader2      className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {waState === 'success' && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
            {waState === 'error'   && <XCircle      className="h-3.5 w-3.5 mr-1.5" />}
            {waState === 'idle'    && <MessageCircle className="h-3.5 w-3.5 mr-1.5" />}
            {waState === 'loading' ? 'Sending…'
              : waState === 'success' ? 'Sent!'
              : waState === 'error'   ? 'Failed — retry'
              : 'Send via WhatsApp'}
          </Button>

          {/* Download PDF button */}
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.9)] text-[hsl(var(--primary-foreground))] text-xs font-medium shadow-lg shadow-[hsl(var(--gold)/0.2)]"
          >
            {pdfBusy
              ? <Loader2  className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
            {pdfBusy ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {waState === 'error' && waError && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-3 rounded-lg border border-[hsl(0,72%,55%/0.3)] bg-[hsl(0,72%,55%/0.08)] text-xs text-[hsl(0,72%,62%)]">
          <strong>WhatsApp error:</strong> {waError}
        </div>
      )}

      {/* Invoice document */}
      <div className="max-w-4xl mx-auto">
        <div ref={invoiceRef} className="bg-white text-gray-900 shadow-2xl" style={{ fontFamily: 'Arial, sans-serif' }}>

          {/* Header */}
          <div className="bg-[#1a2332] px-10 py-8 flex justify-between items-start">
            <div className="text-white">
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#f5c842' }}>
                Minda Prima
              </div>
              <div className="text-sm text-gray-300 space-y-0.5 mt-2">
                <p>5406A, Jalan Kenari 18</p>
                <p>Bandar Putra, 81000 Kulai, Johor</p>
                <p>(+60) 137090363</p>
              </div>
            </div>
            <div className="w-[100px] h-[100px] relative">
              <Image src="/images/MP-LOGO.png" alt="Minda Prima Logo" fill priority className="object-contain" sizes="100px" />
            </div>
          </div>

          {/* Gold stripe */}
          <div className="h-1 bg-gradient-to-r from-[#f5c842] via-[#e8b830] to-[#f5c842]" />

          <div className="px-10 py-8">
            {/* Meta */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[#1a2332] mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  Invoice
                </h2>
                <p className="text-xl text-[#f5c842] font-semibold">{getInvoiceMonth()}</p>
              </div>
              <div className="text-right text-sm">
                <div className="mb-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Invoice No.</span>
                  <p className="font-bold text-[#1a2332]">{params.id}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Date</span>
                  <p className="font-medium text-gray-700">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-8">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Billed To</p>
              <p className="font-bold text-[#1a2332] text-base">{invoiceData.guardianName}</p>
              {invoiceData.address.split(',').map((line: string, i: number) => (
                <p key={i} className="text-sm text-gray-600">{line.trim()}</p>
              ))}
            </div>

            {/* Students */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-[#1a2332] text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-md">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Subjects</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Note</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Level</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider rounded-tr-md">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoiceData.children as Student[]).map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-[#1a2332]">{student.name}</td>
                    <td className="px-4 py-3 text-gray-600">{student.subjects}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{getTransportNote(student, invoiceData.prices)}</td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {student.subjects.split(',').map(s => s.trim()).filter(Boolean).length}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-[#1a2332]/10 text-[#1a2332] px-2 py-0.5 rounded text-xs font-medium">
                        {student.level.includes('Primary') ? `P${student.level.split(' ')[1]}` : `S${student.level.split(' ')[1]}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#1a2332]">
                      RM{calcPrice(student, invoiceData.prices).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Flexible fees */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="bg-[#f5c842]">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-[#1a2332] uppercase tracking-wider rounded-tl-md w-1/3">Flexible Fees</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-[#1a2332] uppercase tracking-wider w-1/3">Details</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-[#1a2332] uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-[#1a2332] uppercase tracking-wider">Amount</th>
                  <th className="px-2 py-2.5 w-10" data-pdf-hide="true" />
                </tr>
              </thead>
              <tbody>
                {flexibleFees.map((fee, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">
                      <Input type="text" value={fee.description}
                        onChange={e => updateFee(index, 'description', e.target.value)}
                        className="h-7 border-gray-200 rounded text-sm bg-transparent"
                        data-pdf-interactive="true" />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="text" value={fee.details}
                        onChange={e => updateFee(index, 'details', e.target.value)}
                        className="h-7 border-gray-200 rounded text-sm bg-transparent"
                        data-pdf-interactive="true" />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={fee.type} onValueChange={(v: 'Addition' | 'Deduction') => updateFee(index, 'type', v)}>
                        <SelectTrigger className="h-7 border-gray-200 rounded text-sm bg-transparent"
                          data-pdf-interactive="true" data-radix-select-trigger="true">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Addition">Addition</SelectItem>
                          <SelectItem value="Deduction">Deduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input type="number" value={fee.amount}
                        onChange={e => updateFee(index, 'amount', e.target.value)}
                        className="w-28 h-7 text-right border-gray-200 rounded text-sm bg-transparent ml-auto"
                        data-pdf-interactive="true" data-pdf-prefix="RM"
                        data-pdf-replacement-class="text-right" />
                    </td>
                    <td className="px-2 py-2 text-center" data-pdf-hide="true">
                      <button onClick={() => setFlexibleFees(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-8" data-pdf-hide="true">
              <button
                onClick={() => setFlexibleFees(prev => [...prev, { description: '', details: '', type: 'Addition', amount: 0 }])}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1a2332] transition-colors border border-dashed border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg"
              >
                <PlusCircle className="h-3.5 w-3.5" />Add Row
              </button>
            </div>

            {/* Notes + totals */}
            <div className="flex justify-between items-start">
              <div className="w-64">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">Notes</p>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="text-xs w-full h-20 border-gray-200 rounded-lg bg-gray-50 text-gray-600 resize-none"
                  data-pdf-interactive="true"
                  data-pdf-replacement-class="text-xs whitespace-pre-wrap text-gray-600" />
              </div>

              <div className="w-56">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">RM{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Flexible Fees</span>
                    <span className={`font-medium ${flexibleTotal < 0 ? 'text-red-500' : ''}`}>
                      {flexibleTotal < 0 ? '-' : ''}RM{Math.abs(flexibleTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Discount</span>
                    <Input type="number" value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-28 h-7 text-right text-sm border-gray-200 rounded bg-transparent"
                      data-pdf-interactive="true" data-pdf-prefix="RM"
                      data-pdf-replacement-class="text-right font-medium" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t-2 border-[#1a2332] flex justify-between items-center">
                  <span className="font-bold text-[#1a2332] text-base">Grand Total</span>
                  <span className="text-xl font-bold" style={{ color: '#f5c842' }}>
                    RM{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#1a2332] px-10 py-6 mt-4">
            <div className="h-px bg-[#f5c842]/30 mb-4" />
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p className="text-white font-medium">Bank Details: Maybank Islamic · Account: xxxxx-xxxxxx</p>
              <p>VAT Registration: 100000000 · Company No: 98765432</p>
              <p className="text-[#f5c842] font-semibold mt-2">Thank you for trusting Minda Prima ✦</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}