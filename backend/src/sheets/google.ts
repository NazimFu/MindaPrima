import { google, type sheets_v4 } from 'googleapis';
import type { SheetsClient } from './client';

export interface GoogleSheetsOptions { sheetId: string; clientEmail: string; privateKey: string }

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 32000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusOf(err: unknown): number | undefined {
  const e = err as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  for (const v of [e?.response?.status, e?.status, e?.code]) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 100) return n;
  }
  return undefined;
}

function retryAfterMs(err: unknown): number | undefined {
  const h = (err as { response?: { headers?: Record<string, unknown> } })?.response?.headers?.['retry-after'];
  const secs = Number(h);
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : undefined;
}

/**
 * Retries quota errors (429) with exponential backoff and jitter. A 429 means Google rejected the call before running it,
 * so retrying is safe for writes too. Server errors (5xx) are retried only for idempotent calls, because an append that
 * failed after being applied would otherwise be duplicated.
 */
async function withRetry<T>(fn: () => Promise<T>, idempotent: boolean): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = statusOf(err);
      const retryable = status === 429 || (idempotent && status !== undefined && status >= 500 && status <= 504);
      if (!retryable || attempt >= MAX_RETRIES) throw err;
      const backoff = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
      const wait = Math.max(retryAfterMs(err) ?? 0, backoff * (0.75 + Math.random() * 0.5));
      console.warn(`[sheets] ${status} from Google, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
}

const rowsOf = (values: unknown[][] | null | undefined): string[][] => (values ?? []).map((r) => r.map((c) => String(c ?? '')));

/** Google Sheets client. Uses a service account with the spreadsheets scope. Values are written RAW, so formulas are never evaluated. */
export class GoogleSheets implements SheetsClient {
  private api: sheets_v4.Sheets;
  private sheetIds = new Map<string, number>();

  constructor(private opts: GoogleSheetsOptions) {
    const auth = new google.auth.JWT({
      email: opts.clientEmail,
      key: opts.privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.api = google.sheets({ version: 'v4', auth });
  }

  private async refreshTabs(): Promise<string[]> {
    const res = await withRetry(() => this.api.spreadsheets.get({ spreadsheetId: this.opts.sheetId, fields: 'sheets.properties(sheetId,title)' }), true);
    this.sheetIds.clear();
    for (const s of res.data.sheets ?? []) {
      if (s.properties?.title != null && s.properties.sheetId != null) this.sheetIds.set(s.properties.title, s.properties.sheetId);
    }
    return [...this.sheetIds.keys()];
  }

  async listTabs() { return this.refreshTabs(); }

  async createTab(tab: string, header: string[]) {
    await withRetry(() => this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.opts.sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    }), false);
    await withRetry(() => this.api.spreadsheets.values.update({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A1`, valueInputOption: 'RAW', requestBody: { values: [header] },
    }), true);
    await this.refreshTabs();
  }

  async read(tab: string) {
    const res = await withRetry(() => this.api.spreadsheets.values.get({ spreadsheetId: this.opts.sheetId, range: `'${tab}'`, valueRenderOption: 'FORMATTED_VALUE' }), true);
    return rowsOf(res.data.values);
  }

  async readMany(tabs: string[]) {
    if (tabs.length === 0) return [];
    const res = await withRetry(() => this.api.spreadsheets.values.batchGet({
      spreadsheetId: this.opts.sheetId, ranges: tabs.map((t) => `'${t}'`), valueRenderOption: 'FORMATTED_VALUE',
    }), true);
    const ranges = res.data.valueRanges ?? [];
    if (ranges.length !== tabs.length) throw new Error(`Sheets batchGet returned ${ranges.length} ranges for ${tabs.length} tabs`);
    return ranges.map((r) => rowsOf(r.values));
  }

  async append(tab: string, rows: string[][]) {
    if (rows.length === 0) return;
    await withRetry(() => this.api.spreadsheets.values.append({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A:A`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    }), false);
  }

  async update(tab: string, rowNumber: number, row: string[]) {
    await withRetry(() => this.api.spreadsheets.values.update({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A${rowNumber}`, valueInputOption: 'RAW', requestBody: { values: [row] },
    }), true);
  }

  async remove(tab: string, rowNumber: number) {
    if (!this.sheetIds.has(tab)) await this.refreshTabs();
    const sheetId = this.sheetIds.get(tab);
    if (sheetId === undefined) throw new Error(`Tab not found: ${tab}`);
    await withRetry(() => this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.opts.sheetId,
      requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }] },
    }), false);
  }
}
