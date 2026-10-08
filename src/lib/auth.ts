import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Stateless session auth for the panel.
 * JWT-like token (HMAC-SHA256, base64url) stored in an httpOnly cookie —
 * no external auth libraries, `node:crypto` only.
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Hadith@2026';
const AUTH_SECRET = process.env.AUTH_SECRET ?? 'hadith-panel-dev-secret-uniral-2026';

export const SESSION_COOKIE = 'hadith_session';
export const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Token primitives: `base64url(payload) + '.' + base64url(hmac)`
// ---------------------------------------------------------------------------

function signPayload(payloadB64: string): string {
  return createHmac('sha256', AUTH_SECRET).update(payloadB64, 'utf8').digest('base64url');
}

/** Creates a signed token carrying `{ sub, iat, exp }`. */
export function createSessionToken(username: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload = { sub: username, iat, exp: iat + SESSION_TTL_SEC };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

/** Verifies signature and expiry; returns `null` for any invalid token. */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const signatureB64 = token.slice(dot + 1);
  try {
    const expected = Buffer.from(signPayload(payloadB64), 'base64url');
    const given = Buffer.from(signatureB64, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const payload: unknown = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload === null || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;
    if (typeof record.sub !== 'string' || record.sub === '') return null;
    if (typeof record.exp !== 'number') return null;
    if (record.exp <= Math.floor(Date.now() / 1000)) return null;
    return {
      sub: record.sub,
      iat: typeof record.iat === 'number' ? record.iat : 0,
      exp: record.exp,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** Compares fixed-size digests so response time leaks nothing about length. */
function constantTimeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

export function checkCredentials(username: string, password: string): boolean {
  return constantTimeEqual(username, ADMIN_USERNAME) && constantTimeEqual(password, ADMIN_PASSWORD);
}

// ---------------------------------------------------------------------------
// Cookie handling (reads via async cookies(), writes via the response object)
// ---------------------------------------------------------------------------

function cookieOptions(): { httpOnly: boolean; sameSite: 'lax'; path: string; secure: boolean } {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}

/** Reads the current session from request cookies (Next 16: `await cookies()`). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** Attaches a fresh session cookie to an outgoing response. */
export function applySessionCookie(response: NextResponse, username: string): void {
  response.cookies.set(SESSION_COOKIE, createSessionToken(username), {
    ...cookieOptions(),
    maxAge: SESSION_TTL_SEC,
  });
}

/** Expires the session cookie on an outgoing response. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    ...cookieOptions(),
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Login rate limiting — in memory, per IP, best effort (5 failures / minute)
// ---------------------------------------------------------------------------

interface RateBucket {
  failures: number;
  resetAt: number; // epoch ms
}

const loginBuckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILURES = 5;

/** True when the IP exceeded the failed-attempt budget in the current window. */
export function isLoginRateLimited(ip: string): boolean {
  const bucket = loginBuckets.get(ip);
  if (!bucket) return false;
  if (bucket.resetAt <= Date.now()) {
    loginBuckets.delete(ip);
    return false;
  }
  return bucket.failures >= RATE_MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const bucket = loginBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    loginBuckets.set(ip, { failures: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    bucket.failures += 1;
  }
  // Bound memory growth on long-lived instances.
  if (loginBuckets.size > 1024) {
    for (const [key, entry] of loginBuckets) {
      if (entry.resetAt <= now) loginBuckets.delete(key);
    }
  }
}

export function resetLoginFailures(ip: string): void {
  loginBuckets.delete(ip);
}
