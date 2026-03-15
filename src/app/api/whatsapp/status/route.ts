/**
 * app/api/whatsapp/status/route.ts
 *
 * GET /api/whatsapp/status
 *
 * Server-Sent Events stream.  The /whatsapp-setup page connects to this
 * endpoint to receive real-time QR code and connection status updates
 * without polling.
 *
 * Each event is a JSON-encoded WAState object:
 *   { status, qrDataUrl, info, phoneNumber }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initWhatsAppClient, getWAState, onStateChange } from '@/lib/whatsapp-client';

export async function GET(_req: NextRequest) {
  // Boot the client if it hasn't started yet
  initWhatsAppClient().catch(console.error);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send current state immediately so the UI doesn't wait for first event
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed — ignore
        }
      };

      send(getWAState());

      // Subscribe to future state changes
      const unsub = onStateChange(send);

      // Clean up when the client disconnects
      _req.signal.addEventListener('abort', () => {
        unsub();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  });
}