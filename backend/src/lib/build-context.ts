import type { Config } from '../config';
import { GoogleSheets } from '../sheets/google';
import { MemorySheets } from '../sheets/memory';
import { createDb } from '../sheets/repo';
import type { AppContext } from './context';

export function buildContext(config: Config): AppContext {
  const client = config.SHEETS_DRIVER === 'google'
    ? new GoogleSheets({ sheetId: config.GOOGLE_SHEET_ID, clientEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL, privateKey: config.GOOGLE_PRIVATE_KEY })
    : new MemorySheets();
  return { config, db: createDb({ client, tabPrefix: config.SHEET_TAB_PREFIX, cacheTtlMs: config.CACHE_TTL_MS }) };
}
