import { google, type sheets_v4 } from 'googleapis';
import type { SheetsClient } from './client';

export interface GoogleSheetsOptions { sheetId: string; clientEmail: string; privateKey: string }

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
    const res = await this.api.spreadsheets.get({ spreadsheetId: this.opts.sheetId, fields: 'sheets.properties(sheetId,title)' });
    this.sheetIds.clear();
    for (const s of res.data.sheets ?? []) {
      if (s.properties?.title != null && s.properties.sheetId != null) this.sheetIds.set(s.properties.title, s.properties.sheetId);
    }
    return [...this.sheetIds.keys()];
  }

  async listTabs() { return this.refreshTabs(); }

  async createTab(tab: string, header: string[]) {
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.opts.sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A1`, valueInputOption: 'RAW', requestBody: { values: [header] },
    });
    await this.refreshTabs();
  }

  async read(tab: string) {
    const res = await this.api.spreadsheets.values.get({ spreadsheetId: this.opts.sheetId, range: `'${tab}'`, valueRenderOption: 'FORMATTED_VALUE' });
    return (res.data.values ?? []).map((r) => r.map((c) => String(c ?? '')));
  }

  async append(tab: string, rows: string[][]) {
    if (rows.length === 0) return;
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A:A`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });
  }

  async update(tab: string, rowNumber: number, row: string[]) {
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.opts.sheetId, range: `'${tab}'!A${rowNumber}`, valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }

  async remove(tab: string, rowNumber: number) {
    if (!this.sheetIds.has(tab)) await this.refreshTabs();
    const sheetId = this.sheetIds.get(tab);
    if (sheetId === undefined) throw new Error(`Tab not found: ${tab}`);
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.opts.sheetId,
      requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }] },
    });
  }
}
