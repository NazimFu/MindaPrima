import 'dotenv/config';
import { z } from 'zod';

/** Every setting comes from environment variables. Nothing is hardcoded elsewhere. */
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().min(1),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  TZ_NAME: z.string().min(1),
  TRANSPORT_REFRESH_TIME: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TTL_MINUTES: z.coerce.number().int().min(1).max(120),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15),
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(3).max(20),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440),
  COOKIE_SECURE: bool,

  SHEETS_DRIVER: z.enum(['google', 'memory']),
  GOOGLE_SHEET_ID: z.string().default(''),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(''),
  GOOGLE_PRIVATE_KEY: z.string().default(''),
  SHEET_TAB_PREFIX: z.string().default(''),
  CACHE_TTL_MS: z.coerce.number().int().min(0).max(600000),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10),

  WHATSAPP_ENABLED: bool,
  WHATSAPP_SESSION_DIR: z.string().min(1),

  ADMIN_EMAIL: z.string().default(''),
  ADMIN_PASSWORD: z.string().default(''),
});

export type Config = Omit<z.infer<typeof schema>, 'CORS_ORIGINS'> & { corsOrigins: string[] };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid or missing environment variables:\n${lines}\nSee backend/.env.example`);
  }
  const { CORS_ORIGINS, ...rest } = parsed.data;
  const cfg: Config = { ...rest, corsOrigins: CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) };
  if (cfg.SHEETS_DRIVER === 'memory' && cfg.NODE_ENV === 'production') {
    throw new Error('SHEETS_DRIVER=memory is not allowed in production. The spreadsheet is the database.');
  }
  if (cfg.SHEETS_DRIVER === 'google' && (!cfg.GOOGLE_SHEET_ID || !cfg.GOOGLE_SERVICE_ACCOUNT_EMAIL || !cfg.GOOGLE_PRIVATE_KEY)) {
    throw new Error('GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are required when SHEETS_DRIVER=google');
  }
  if (cfg.NODE_ENV === 'production' && !cfg.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
  return cfg;
}
