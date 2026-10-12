import path from 'node:path';
import qrcode from 'qrcode';
import type { SessionUser } from '@minda/common';
import { formatRM } from '@minda/common';
import type { AppContext } from '../lib/context';
import { AppError, badRequest, conflict, notFound } from '../lib/errors';
import { newId } from '../sheets/repo';
import { audit } from './audit';
import { getInvoice } from './billing';

/**
 * whatsapp-web.js wrapper. The session lives on the server only (WHATSAPP_SESSION_DIR, git-ignored)
 * and is never exposed to the browser.
 */
type WWJSClient = import('whatsapp-web.js').Client;

export type WAStatus = 'disabled' | 'initialising' | 'qr_pending' | 'authenticated' | 'ready' | 'disconnected' | 'error';
export interface WAState { status: WAStatus; qrDataUrl: string | null; info: string; phoneNumber: string | null }

let client: WWJSClient | null = null;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let state: WAState = { status: 'initialising', qrDataUrl: null, info: 'Not started', phoneNumber: null };
const listeners = new Set<(s: WAState) => void>();

function setState(patch: Partial<WAState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export const waState = (ctx: AppContext): WAState =>
  ctx.config.WHATSAPP_ENABLED ? state : { status: 'disabled', qrDataUrl: null, info: 'WhatsApp is turned off (WHATSAPP_ENABLED=false)', phoneNumber: null };

export function onWaState(fn: (s: WAState) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export async function initWhatsApp(ctx: AppContext): Promise<void> {
  if (!ctx.config.WHATSAPP_ENABLED || client) return;
  const { Client, LocalAuth } = await import('whatsapp-web.js');
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.resolve(process.cwd(), ctx.config.WHATSAPP_SESSION_DIR) }),
    webVersionCache: { type: 'local' },
    puppeteer: {
      waitForInitialPage: false,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        // Headless Chromium slows background pages down. WhatsApp Web loads in one, so keep it at full speed.
        '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    },
    authTimeoutMs: 60000,
    restartOnAuthFail: true,
  });
  client.on('qr', async (qr: string) => {
    try { setState({ status: 'qr_pending', qrDataUrl: await qrcode.toDataURL(qr, { width: 300, margin: 2 }), info: 'Scan the QR code with WhatsApp on the phone.' }); }
    catch { setState({ status: 'qr_pending', qrDataUrl: null, info: 'QR received but could not be drawn.' }); }
  });
  client.on('authenticated', () => {
    setState({ status: 'authenticated', qrDataUrl: null, info: 'Authenticated, loading.' });
    clearTimeout(watchdog);
    const t0 = Date.now();
    const tick = () => {
      if (state.status !== 'authenticated') return;
      const s = Math.round((Date.now() - t0) / 1000);
      if (s >= 300) {
        setState({ status: 'error', info: 'Loading took too long. Reload this page to try again.' });
        void client?.destroy().catch(() => undefined); client = null;
        return;
      }
      if (s >= 60) setState({ info: `Still loading after ${s} seconds. The first link syncs your chats and can take a few minutes.` });
      watchdog = setTimeout(tick, 15000);
    };
    watchdog = setTimeout(tick, 15000);
  });
  client.on('loading_screen', (percent: number | string, message: string) => {
    if (state.status === 'authenticated' || state.status === 'initialising') setState({ info: `Loading ${percent}%${message ? `, ${message}` : ''}` });
  });
  client.on('ready', () => { clearTimeout(watchdog); setState({ status: 'ready', qrDataUrl: null, info: 'Connected.', phoneNumber: client?.info?.wid?.user ?? null }); });
  client.on('auth_failure', (m: string) => { setState({ status: 'error', qrDataUrl: null, info: `Authentication failed: ${m}` }); client = null; });
  client.on('disconnected', (r: string) => { setState({ status: 'disconnected', qrDataUrl: null, info: `Disconnected: ${r}`, phoneNumber: null }); client = null; });
  setState({ status: 'initialising', info: 'Starting WhatsApp.' });
  try { await client.initialize(); }
  catch (e) {
    clearTimeout(watchdog);
    setState({ status: 'error', qrDataUrl: null, info: `Could not start WhatsApp: ${(e as Error).message ?? e}`.slice(0, 200) });
    void client?.destroy().catch(() => undefined);
    client = null;
    throw e;
  }
}

const MAX_PDF_BYTES = 5 * 1024 * 1024;

async function resolveChat(number: string): Promise<string> {
  const digits = number.replace(/\D/g, '');
  const candidates = [digits, digits.startsWith('0') ? `6${digits}` : digits, digits.startsWith('60') ? digits : `60${digits}`];
  for (const c of [...new Set(candidates)]) {
    try {
      const r = await (client as unknown as { getNumberId(n: string): Promise<{ _serialized: string } | null> }).getNumberId(c);
      if (r?._serialized) return r._serialized;
    } catch { /* try next */ }
  }
  throw badRequest('That number has no WhatsApp account. Check the guardian contact.');
}

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');

/** Sends the invoice PDF to the guardian's number from the database. The browser never chooses the recipient. */
export async function sendInvoice(ctx: AppContext, user: SessionUser, invoiceId: string, pdfBase64: string): Promise<void> {
  if (!ctx.config.WHATSAPP_ENABLED) throw new AppError(503, 'WhatsApp is turned off', 'disabled');
  await initWhatsApp(ctx);
  if (!client || state.status !== 'ready') throw new AppError(503, `WhatsApp is not connected (${state.status}). Open WhatsApp settings and scan the QR code.`, 'not_ready');

  const inv = await getInvoice(ctx, invoiceId);
  if (!inv.guardian.contact) throw notFound('Guardian contact');
  const pdf = Buffer.from(pdfBase64, 'base64');
  if (pdf.length === 0 || pdf.length > MAX_PDF_BYTES) throw badRequest('PDF is empty or too large');
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw badRequest('File is not a PDF');

  const tpl = (await ctx.db.waTemplates.all()).find((t) => t.name === 'invoice');
  if (!tpl) throw conflict('Add a WhatsApp template named "invoice" first');
  const caption = fill(tpl.body, { guardian: inv.guardian.name, month: inv.month, total: formatRM(inv.total), number: inv.number, balance: formatRM(inv.balance) });

  const log = { id: newId(), at: new Date().toISOString(), to: inv.guardian.contact, invoiceId: inv.id };
  try {
    const { MessageMedia } = await import('whatsapp-web.js');
    const chatId = await resolveChat(inv.guardian.contact);
    const media = new MessageMedia('application/pdf', pdf.toString('base64'), `Invoice-${inv.number}.pdf`);
    try { await client.sendMessage(chatId, media, { caption }); }
    catch (e) {
      if (/Execution context was destroyed|Protocol error/.test((e as Error).message)) {
        await new Promise((r) => setTimeout(r, 2000));
        await client.sendMessage(chatId, media, { caption });
      } else throw e;
    }
    await ctx.db.messageLog.insert({ ...log, status: 'sent', error: '' });
    await audit(ctx, user, 'whatsapp.send', 'invoice', inv.id);
  } catch (e) {
    await ctx.db.messageLog.insert({ ...log, status: 'failed', error: (e as Error).message.slice(0, 200) });
    throw e instanceof AppError ? e : new AppError(502, 'Could not send the message', 'send_failed');
  }
}
