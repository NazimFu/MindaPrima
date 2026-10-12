/** Minimal spreadsheet access. All values are strings. Implementations: Google Sheets, in-memory (tests only). */
export interface SheetsClient {
  listTabs(): Promise<string[]>;
  createTab(tab: string, header: string[]): Promise<void>;
  /** Whole tab including the header row. */
  read(tab: string): Promise<string[][]>;
  append(tab: string, rows: string[][]): Promise<void>;
  /** rowNumber is 1-based sheet row (header is row 1). */
  update(tab: string, rowNumber: number, row: string[]): Promise<void>;
  remove(tab: string, rowNumber: number): Promise<void>;
}
