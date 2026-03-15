/**
 * lib/whatsapp-client.ts
 *
 * Singleton wrapper around whatsapp-web.js.
 *
 * • Keeps one WhatsApp Web client alive for the lifetime of the Node process.
 * • Persists the session to disk (.wwebjs_auth/) so you only need to scan
 *   the QR code ONCE — subsequent server restarts reconnect automatically.
 * • Exposes a typed status object that the API routes and the setup UI read.
 *
 * Install dependencies:
 *   npm install whatsapp-web.js qrcode
 *   npm install --save-dev @types/qrcode
 *
 * The library requires Puppeteer (a headless Chromium).  On a normal dev
 * machine it works out of the box.  On a Linux server / Docker you may need:
 *   npm install puppeteer
 *   # and ensure chromium system deps are present (see Puppeteer docs)
 */

import path from 'path';
import qrcode from 'qrcode';

// ── Lazy-load whatsapp-web.js so the module can be imported in environments
//    where Puppeteer is not yet installed without crashing at import time. ──

type WWJSClient   = import('whatsapp-web.js').Client;
type WWJSMessage  = import('whatsapp-web.js').Message;
type LocalAuth    = import('whatsapp-web.js').LocalAuth;

export type WAStatus =
  | 'initialising'   // client created, not yet connected
  | 'qr_pending'     // QR generated, waiting for scan
  | 'authenticated'  // QR scanned, loading session
  | 'ready'          // fully connected, can send messages
  | 'disconnected'   // logged out or connection lost
  | 'error';         // unrecoverable error

export interface WAState {
  status: WAStatus;
  /** Base-64 data-URL of the QR code image (only set when status === 'qr_pending') */
  qrDataUrl: string | null;
  /** Human-readable info / error string */
  info: string;
  /** The phone number this client is authenticated as, e.g. "60123456789" */
  phoneNumber: string | null;
}

// Module-level singletons
let client: WWJSClient | null = null;
let state: WAState = {
  status:      'initialising',
  qrDataUrl:   null,
  info:        'Not started',
  phoneNumber: null,
};

// Listeners registered by API routes / SSE streams
const stateListeners = new Set<(s: WAState) => void>();

function setState(patch: Partial<WAState>) {
  state = { ...state, ...patch };
  stateListeners.forEach(fn => fn(state));
}

function onStateChange(fn: (s: WAState) => void): () => void {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

// ── Initialise (idempotent — safe to call multiple times) ──────────────────

export async function initWhatsAppClient(): Promise<void> {
  if (client) return; // already running

  // Dynamic import so this only loads in a Node environment
  const { Client, LocalAuth: LA } = await import('whatsapp-web.js');

  const authPath = path.resolve(process.cwd(), '.wwebjs_auth');

  client = new Client({
    authStrategy: new LA({ dataPath: authPath }) as LocalAuth,

    // ── Pin a stable WhatsApp Web version ─────────────────────────────────
    // Without this, whatsapp-web.js loads whatever version WhatsApp serves,
    // which may trigger multi-page navigations that destroy Puppeteer's
    // execution context mid-call ("Protocol error: Execution context was
    // destroyed").  Pinning a known-good version via the local cache keeps
    // the page stable for the lifetime of the session.
    webVersionCache: {
      type: 'local',
    },

    puppeteer: {
      // waitForInitialPage: false prevents the context-destroyed error on
      // Windows during the initial about:blank → web.whatsapp.com navigation.
      waitForInitialPage: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        // Prevent WhatsApp Web from triggering background page reloads
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    },

    // Give WhatsApp Web more time to load on slower machines
    authTimeoutMs: 60000,
    // Automatically restart the client if auth fails (e.g. after a reload)
    restartOnAuthFail: true,
  });

  // ── Events ────────────────────────────────────────────────────────────────

  client.on('qr', async (qr: string) => {
    try {
      const dataUrl = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
      setState({ status: 'qr_pending', qrDataUrl: dataUrl, info: 'Scan the QR code with WhatsApp on your phone.' });
    } catch {
      setState({ status: 'qr_pending', qrDataUrl: null, info: 'QR received (could not render image).' });
    }
  });

  client.on('authenticated', () => {
    setState({ status: 'authenticated', qrDataUrl: null, info: 'Authenticated — loading session…' });
  });

  client.on('ready', async () => {
    const info = client!.info;
    const phone = info?.wid?.user ?? null;
    setState({ status: 'ready', qrDataUrl: null, info: 'Connected and ready.', phoneNumber: phone });
  });

  client.on('auth_failure', (msg: string) => {
    setState({ status: 'error', qrDataUrl: null, info: `Authentication failed: ${msg}` });
    client = null; // allow re-init
  });

  client.on('disconnected', (reason: string) => {
    setState({ status: 'disconnected', qrDataUrl: null, info: `Disconnected: ${reason}`, phoneNumber: null });
    client = null; // allow re-init on next request
  });

  setState({ status: 'initialising', info: 'Starting WhatsApp client…' });
  await client.initialize();
}

// ── Public getters ─────────────────────────────────────────────────────────

export function getWAState(): WAState {
  return state;
}

export { onStateChange };

// ── Send a PDF document to a phone number ─────────────────────────────────

/**
 * @param toNumber  E.164 number, e.g. "+60123456789"
 * @param pdfBuffer The PDF as a Buffer
 * @param filename  Filename shown to the recipient
 * @param caption   Text message sent alongside the document
 */
export async function sendPdfToNumber(
  toNumber: string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string,
): Promise<void> {
  if (!client || state.status !== 'ready') {
    throw new Error(
      `WhatsApp client is not ready (status: ${state.status}). ` +
      'Visit /whatsapp-setup to connect first.'
    );
  }

  const { MessageMedia } = await import('whatsapp-web.js');

  // Strip everything except digits (handles +60..., 60..., 0... inputs).
  const digits = toNumber.replace(/\D/g, '');

  // ── Resolve the correct chat ID via WhatsApp's own lookup ──────────────
  //
  // Manually constructing `${digits}@c.us` causes "No LID for user" errors
  // on newer versions of whatsapp-web.js because WhatsApp now uses an
  // internal LID system that getNumberId() handles transparently.
  //
  // getNumberId() queries WhatsApp's servers to verify the number is
  // registered and returns the canonical { _serialized } chat ID.
  // It returns null if the number has no WhatsApp account.
  //
  // We try the number as-is first (should already have country code),
  // then fall back to prepending "60" in case a bare local number slipped
  // through normalisation.

  let chatId: string | null = null;

  try {
    const result = await (client as any).getNumberId(digits);
    if (result?._serialized) {
      chatId = result._serialized;
    }
  } catch {
    // getNumberId() threw -- fall through to fallback below
  }

  // Fallback: if number started with "0" it may have been stored without
  // country code -- try prepending Malaysia country code "60"
  if (!chatId && !digits.startsWith('60')) {
    try {
      const result = await (client as any).getNumberId(`60${digits}`);
      if (result?._serialized) {
        chatId = result._serialized;
      }
    } catch { /* ignore */ }
  }

  if (!chatId) {
    throw new Error(
      `The number ${toNumber} does not appear to have a WhatsApp account, ` +
      `or could not be resolved. Please check the guardian's contact number.`
    );
  }

  const b64   = pdfBuffer.toString('base64');
  const media = new MessageMedia('application/pdf', b64, filename);

  // Retry once on "Execution context was destroyed" — this can happen when
  // WhatsApp Web reloads its service worker in the background on Windows.
  // A single retry is enough because the context is stable again by then.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await client.sendMessage(chatId, media, { caption });
      return; // success
    } catch (err: any) {
      lastError = err;
      const isContextError =
        typeof err?.message === 'string' &&
        (err.message.includes('Execution context was destroyed') ||
         err.message.includes('Protocol error'));

      if (isContextError && attempt === 1) {
        // Wait 2 s for the page to stabilise, then retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}