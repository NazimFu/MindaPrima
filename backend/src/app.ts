import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { API_PREFIX } from '@minda/common';
import type { AppContext } from './lib/context';
import { corsPolicy, csrfGuard, errorHandler, globalLimiter, securityHeaders } from './middleware/security';
import { apiRouter } from './routes/api';

export function createApp(ctx: AppContext): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', ctx.config.TRUST_PROXY);
  app.use(securityHeaders());
  app.use(corsPolicy(ctx.config));
  app.use(globalLimiter(ctx.config));
  app.use(cookieParser());
  // Small default body limit. The WhatsApp route raises it for itself.
  app.use(express.json({ limit: '100kb', type: (req) => !(req.url ?? '').includes('/whatsapp/send-invoice') }));
  app.use(API_PREFIX, csrfGuard(ctx.config, { skip: (req) => req.path === '/auth/login' || req.path === '/auth/refresh' }));
  app.use(API_PREFIX, apiRouter(ctx));
  app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });
  app.use(errorHandler());
  return app;
}
