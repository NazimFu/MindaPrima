/**
 * app/api/whatsapp/send/route.ts
 *
 * POST /api/whatsapp/send
 *
 * Accepts multipart/form-data:
 *   pdf          — PDF file blob
 *   invoiceId    — e.g. "MAR0001"
 *   toNumber     — E.164, e.g. "+60123456789"
 *   guardianName — for the caption
 *   invoiceMonth — e.g. "March"
 *   grandTotal   — numeric string, e.g. "150.00"
 *
 * Uses whatsapp-web.js (personal phone, no API token required).
 * The client must be connected first — visit /whatsapp-setup to scan the QR.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initWhatsAppClient, sendPdfToNumber, getWAState } from '@/lib/whatsapp-client';

export async function POST(req: NextRequest) {
  // Ensure client is initialised (idempotent)
  try {
    await initWhatsAppClient();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to initialise WhatsApp client: ${err?.message ?? err}` },
      { status: 500 }
    );
  }

  const currentState = getWAState();
  if (currentState.status !== 'ready') {
    return NextResponse.json(
      {
        error: `WhatsApp is not connected (status: "${currentState.status}"). ` +
               'Please visit /whatsapp-setup to scan the QR code first.',
        status: currentState.status,
      },
      { status: 503 }
    );
  }

  // Parse form data
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 });
  }

  const pdf          = form.get('pdf')          as Blob   | null;
  const invoiceId    = form.get('invoiceId')    as string | null;
  const toNumber     = form.get('toNumber')     as string | null;
  const guardianName = form.get('guardianName') as string | null;
  const invoiceMonth = form.get('invoiceMonth') as string | null;
  const grandTotal   = form.get('grandTotal')   as string | null;

  if (!pdf || !invoiceId || !toNumber || !guardianName || !invoiceMonth || !grandTotal) {
    return NextResponse.json(
      { error: 'Missing fields: pdf, invoiceId, toNumber, guardianName, invoiceMonth, grandTotal' },
      { status: 400 }
    );
  }

  const arrayBuf  = await pdf.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuf);

  const filename = `Minda-Prima-Invoice-${invoiceId}.pdf`;
  const caption  =
    `Salam ${guardianName},\n\n` +
    `Sila semak invois Minda Prima bagi bulan *${invoiceMonth}*.\n` +
    `Jumlah bayaran: *RM${parseFloat(grandTotal).toFixed(2)}*\n` +
    `No. Invois: *${invoiceId}*\n\n` +
    `Terima kasih atas kepercayaan anda kepada Minda Prima. 🌟`;

  try {
    await sendPdfToNumber(toNumber, pdfBuffer, filename, caption);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error while sending.' },
      { status: 500 }
    );
  }
}