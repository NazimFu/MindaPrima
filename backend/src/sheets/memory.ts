import type { SheetsClient } from './client';

/** In-memory stand-in used by tests and local smoke runs only. Refused in production by config. */
export class MemorySheets implements SheetsClient {
  private tabs = new Map<string, string[][]>();

  async listTabs() { return [...this.tabs.keys()]; }
  async createTab(tab: string, header: string[]) { if (!this.tabs.has(tab)) this.tabs.set(tab, [header]); }
  async read(tab: string) {
    const t = this.tabs.get(tab);
    if (!t) throw new Error(`Tab not found: ${tab}`);
    return t.map((r) => [...r]);
  }
  async readMany(tabs: string[]) { return Promise.all(tabs.map((t) => this.read(t))); }
  async append(tab: string, rows: string[][]) {
    const t = this.tabs.get(tab);
    if (!t) throw new Error(`Tab not found: ${tab}`);
    for (const r of rows) t.push([...r]);
  }
  async update(tab: string, rowNumber: number, row: string[]) {
    const t = this.tabs.get(tab);
    if (!t || rowNumber < 2 || rowNumber > t.length) throw new Error('Row not found');
    t[rowNumber - 1] = [...row];
  }
  async remove(tab: string, rowNumber: number) {
    const t = this.tabs.get(tab);
    if (!t || rowNumber < 2 || rowNumber > t.length) throw new Error('Row not found');
    t.splice(rowNumber - 1, 1);
  }
}
