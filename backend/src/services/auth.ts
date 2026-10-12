import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { Role, SessionUser, User } from '@minda/common';
import type { AppContext } from '../lib/context';
import { AppError, unauthorized } from '../lib/errors';
import { newId } from '../sheets/repo';
import { audit } from './audit';

const ISSUER = 'minda-prima';
const AUDIENCE = 'minda-prima-web';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const publicUser = (u: User): SessionUser => ({ id: u.id, email: u.email, name: u.name, role: u.role, vehicleId: u.vehicleId });

// Valid hash of a random value, compared against when the email is unknown so response time does not reveal accounts.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(12).toString('hex'), 10);

export interface IssuedSession { user: SessionUser; accessToken: string; refreshToken: string; csrfToken: string }

export function hashPassword(ctx: AppContext, password: string) {
  return bcrypt.hash(password, ctx.config.BCRYPT_COST);
}

async function issue(ctx: AppContext, user: User): Promise<IssuedSession> {
  const sid = newId();
  const refreshToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + ctx.config.REFRESH_TTL_DAYS * 86400_000);
  await ctx.db.refreshTokens.insert({
    id: sid, userId: user.id, tokenHash: sha256(refreshToken), expiresAt: expires.toISOString(),
    createdAt: new Date().toISOString(), revoked: false,
  });
  const accessToken = jwt.sign({ role: user.role, sid }, ctx.config.JWT_SECRET, {
    algorithm: 'HS256', subject: user.id, issuer: ISSUER, audience: AUDIENCE, expiresIn: `${ctx.config.ACCESS_TTL_MINUTES}m`,
  });
  return { user: publicUser(user), accessToken, refreshToken, csrfToken: randomBytes(24).toString('hex') };
}

export async function login(ctx: AppContext, email: string, password: string): Promise<IssuedSession> {
  const user = (await ctx.db.users.where((u) => u.email === email))[0];
  const generic = unauthorized('Wrong email or password');

  if (!user || !user.active) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw generic;
  }
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new AppError(429, 'Too many failed attempts. Try again later.', 'locked');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    const lock = failed >= ctx.config.LOGIN_MAX_FAILURES;
    await ctx.db.users.update(user.id, {
      failedLogins: lock ? 0 : failed,
      lockedUntil: lock ? new Date(Date.now() + ctx.config.LOGIN_LOCK_MINUTES * 60_000).toISOString() : user.lockedUntil,
    });
    await audit(ctx, user, lock ? 'login.locked' : 'login.failed', 'user', user.id);
    throw generic;
  }
  if (user.failedLogins > 0 || user.lockedUntil) await ctx.db.users.update(user.id, { failedLogins: 0, lockedUntil: '' });
  await audit(ctx, user, 'login', 'user', user.id);
  return issue(ctx, user);
}

/** Refresh token rotation. A used or revoked token is rejected. */
export async function refresh(ctx: AppContext, refreshToken: string): Promise<IssuedSession> {
  const hash = sha256(refreshToken);
  const row = (await ctx.db.refreshTokens.where((t) => t.tokenHash === hash))[0];
  if (!row || row.revoked || new Date(row.expiresAt) < new Date()) {
    if (row?.revoked) {
      // Reuse of a rotated token: revoke every session of that user.
      const mine = await ctx.db.refreshTokens.where((t) => t.userId === row.userId && !t.revoked);
      for (const t of mine) await ctx.db.refreshTokens.update(t.id, { revoked: true });
    }
    throw unauthorized();
  }
  const user = await ctx.db.users.find(row.userId);
  if (!user || !user.active) throw unauthorized();
  await ctx.db.refreshTokens.update(row.id, { revoked: true });
  return issue(ctx, user);
}

export async function logout(ctx: AppContext, sid: string | undefined, user: SessionUser | undefined) {
  if (sid) await ctx.db.refreshTokens.update(sid, { revoked: true });
  if (user) await audit(ctx, user, 'logout', 'user', user.id);
}

export async function authenticate(ctx: AppContext, accessToken: string): Promise<{ user: SessionUser; sid: string }> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(accessToken, ctx.config.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE }) as jwt.JwtPayload;
  } catch {
    throw unauthorized();
  }
  const sid = String(payload.sid ?? '');
  const [user, session] = await Promise.all([ctx.db.users.find(String(payload.sub)), ctx.db.refreshTokens.find(sid)]);
  if (!user || !user.active || !session || session.revoked) throw unauthorized();
  return { user: publicUser(user), sid };
}

export async function createUser(
  ctx: AppContext, input: { email: string; name: string; role: Role; password: string; vehicleId: string },
): Promise<SessionUser> {
  if ((await ctx.db.users.where((u) => u.email === input.email)).length) throw new AppError(409, 'Email already in use', 'conflict');
  const row: User = {
    id: newId(), email: input.email, name: input.name, role: input.role, passwordHash: await hashPassword(ctx, input.password),
    active: true, failedLogins: 0, lockedUntil: '', vehicleId: input.vehicleId, createdAt: new Date().toISOString(),
  };
  await ctx.db.users.insert(row);
  return publicUser(row);
}
