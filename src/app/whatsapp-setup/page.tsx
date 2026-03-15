"use client";

/**
 * app/whatsapp-setup/page.tsx
 *
 * Admin page for connecting your personal WhatsApp number.
 * Navigate to /whatsapp-setup to scan the QR code.
 * Once connected the session is saved to disk — you won't need to
 * scan again unless you explicitly log out or delete .wwebjs_auth/.
 */

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Wifi, WifiOff, Loader2, CheckCircle2, QrCode, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

type WAStatus = 'initialising' | 'qr_pending' | 'authenticated' | 'ready' | 'disconnected' | 'error';

interface WAState {
  status: WAStatus;
  qrDataUrl: string | null;
  info: string;
  phoneNumber: string | null;
}

const STATUS_CONFIG: Record<WAStatus, { label: string; color: string; icon: React.ReactNode }> = {
  initialising:  { label: 'Initialising',   color: 'text-[hsl(38,85%,58%)]',   icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  qr_pending:    { label: 'Scan QR Code',   color: 'text-[hsl(38,85%,58%)]',   icon: <QrCode  className="w-4 h-4" /> },
  authenticated: { label: 'Authenticated',  color: 'text-[hsl(168,60%,55%)]',  icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  ready:         { label: 'Connected',      color: 'text-[hsl(168,60%,55%)]',  icon: <CheckCircle2 className="w-4 h-4" /> },
  disconnected:  { label: 'Disconnected',   color: 'text-[hsl(0,72%,62%)]',    icon: <WifiOff className="w-4 h-4" /> },
  error:         { label: 'Error',          color: 'text-[hsl(0,72%,62%)]',    icon: <WifiOff className="w-4 h-4" /> },
};

export default function WhatsAppSetupPage() {
  const [waState, setWaState] = React.useState<WAState>({
    status:      'initialising',
    qrDataUrl:   null,
    info:        'Connecting to server…',
    phoneNumber: null,
  });
  const [sseError, setSseError] = React.useState(false);

  // ── Connect to SSE status stream ──────────────────────────────────────────
  React.useEffect(() => {
    let es: EventSource;

    function connect() {
      setSseError(false);
      es = new EventSource('/api/whatsapp/status');

      es.onmessage = (e) => {
        try {
          setWaState(JSON.parse(e.data) as WAState);
        } catch { /* ignore malformed events */ }
      };

      es.onerror = () => {
        setSseError(true);
        es.close();
        // Retry after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => es?.close();
  }, []);

  const cfg = STATUS_CONFIG[waState.status];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-4 px-6">
          <Logo />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
      </header>

      <main className="px-6 py-6 max-w-screen-sm mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Link>
          </Button>
          <span className="text-[hsl(var(--border))]">/</span>
          <span className="text-sm text-[hsl(var(--foreground))]">WhatsApp Setup</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl text-[hsl(var(--foreground))]"
            style={{ fontFamily: "'DM Serif Display', serif" }}>
            WhatsApp Connection
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Link your personal WhatsApp number to send invoices directly to guardians.
          </p>
        </div>

        {/* Status card */}
        <div className={`rounded-xl border bg-[hsl(var(--card))] p-6 mb-4 ${
          waState.status === 'ready'
            ? 'border-[hsl(168,60%,48%/0.3)]'
            : waState.status === 'error' || waState.status === 'disconnected'
            ? 'border-[hsl(0,72%,55%/0.3)]'
            : 'border-[hsl(var(--border))]'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              waState.status === 'ready'
                ? 'bg-[hsl(168,60%,48%/0.12)]'
                : waState.status === 'error' || waState.status === 'disconnected'
                ? 'bg-[hsl(0,72%,55%/0.12)]'
                : 'bg-[hsl(var(--muted))]'
            } ${cfg.color}`}>
              {cfg.icon}
            </div>
            <div>
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
              {waState.phoneNumber && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
                  <Smartphone className="w-3 h-3" />
                  +{waState.phoneNumber}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            {sseError ? 'Lost connection to server — retrying…' : waState.info}
          </p>
        </div>

        {/* QR code panel */}
        {waState.status === 'qr_pending' && (
          <div className="rounded-xl border border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--card))] p-6 mb-4 text-center animate-fade-up">
            <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">
              Scan with WhatsApp on your phone
            </p>
            {waState.qrDataUrl ? (
              <div className="inline-block p-3 bg-white rounded-xl border border-[hsl(var(--border))] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={waState.qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56" />
              </div>
            ) : (
              <div className="w-56 h-56 mx-auto rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
              </div>
            )}
            <div className="mt-4 space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
              <p>1. Open WhatsApp on your phone</p>
              <p>2. Go to <strong className="text-[hsl(var(--foreground))]">Settings → Linked Devices</strong></p>
              <p>3. Tap <strong className="text-[hsl(var(--foreground))]">Link a Device</strong> and scan</p>
            </div>
          </div>
        )}

        {/* Connected confirmation */}
        {waState.status === 'ready' && (
          <div className="rounded-xl border border-[hsl(168,60%,48%/0.3)] bg-[hsl(168,60%,48%/0.05)] p-5 mb-4 animate-fade-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[hsl(168,60%,55%)] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[hsl(168,60%,55%)]">Session active</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Your session is saved to disk. You won't need to scan again after a server restart.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disconnected / error — offer reconnect */}
        {(waState.status === 'disconnected' || waState.status === 'error') && (
          <div className="rounded-xl border border-[hsl(0,72%,55%/0.3)] bg-[hsl(0,72%,55%/0.05)] p-5 mb-4 animate-fade-up">
            <p className="text-sm text-[hsl(0,72%,62%)] mb-3">
              WhatsApp disconnected. You may need to scan the QR code again.
            </p>
            <Button
              size="sm" variant="outline"
              onClick={() => window.location.reload()}
              className="border-[hsl(0,72%,55%/0.4)] text-[hsl(0,72%,62%)] hover:bg-[hsl(0,72%,55%/0.1)] text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reconnect
            </Button>
          </div>
        )}

        {/* Info box */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4 text-xs text-[hsl(var(--muted-foreground))] space-y-2">
          <p className="font-medium text-[hsl(var(--foreground))]">How it works</p>
          <p>This uses <strong className="text-[hsl(var(--foreground))]">whatsapp-web.js</strong> — the same technology as WhatsApp Web. Your phone stays the host; the server just acts as a browser tab.</p>
          <p>The session is stored in <code className="bg-[hsl(var(--muted))] px-1 rounded">.wwebjs_auth/</code> on the server. Delete this folder to log out.</p>
          <p>No Meta developer account or API token is needed.</p>
        </div>
      </main>
    </div>
  );
}