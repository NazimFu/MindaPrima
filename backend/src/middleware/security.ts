import type { NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE } from '@minda/common';
import type { Config } from '../config';
import { AppError, forbidden, unauthorized } from '../lib/errors';
import type { AppContext } from '../lib/context';
import { authenticate } from '../services/auth';
import type { Role } from '@minda/common';

export const securityHeaders = () => helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'no-referrer' },
});

/** Strict allow-list, never `*`. */
export const corsPolicy = (config: Config) => cors({
  origin(origin, cb) {
    if (!origin || config.corsOrigins.includes(origin)) cb(null, true);
    else cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', CSRF_HEADER],
  maxAge: 600,
});

export const globalLimiter = (config: Config) => rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_SECONDS * 1000, limit: config.RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests' },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign in attempts' },
});

export const sendLimiter = rateLimit({
  windowMs: 60 * 60_000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages sent' },
});

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** CSRF: Origin must be on the allow-list (when sent) and the double-submit token must match for state-changing requests. */
export function csrfGuard(config: Config, opts: { skip?: (req: Request) => boolean } = {}): RequestHandler {
  return (req, _res, next) => {
    if (!UNSAFE.has(req.method) || opts.skip?.(req)) return next();
    const origin = req.get('origin');
    if (origin && !config.corsOrigins.includes(origin)) return next(forbidden('Origin not allowed'));
    const cookie = req.cookies?.[CSRF_COOKIE];
    const header = req.get(CSRF_HEADER);
    if (typeof cookie !== 'string' || typeof header !== 'string' || cookie.length < 20) return next(forbidden('Missing CSRF token'));
    const a = Buffer.from(cookie);
    const b = Buffer.from(header);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return next(forbidden('Bad CSRF token'));
    next();
  };
}

export const requireAuth = (ctx: AppContext): RequestHandler => async (req, _res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') throw unauthorized();
    const { user, sid } = await authenticate(ctx, token);
    req.user = user;
    req.sid = sid;
    next();
  } catch (e) { next(e); }
};

/** Deny by default: a route must list the roles that may use it. */
export const requireRole = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

export function errorHandler(): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    const e = err as { type?: string; status?: number };
    if (e?.type === 'entity.too.large') { res.status(413).json({ error: 'Request too large' }); return; }
    if (e?.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error('Unhandled error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Something went wrong' });
  };
}
