import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Server-side helpers shared by all panel API routes.
 * Every panel endpoint answers JSON only — never HTML error pages.
 */

/** JSON response with `no-store` (panel data is always live). */
export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Best-effort client IP for in-memory rate limiting.
 * Vercel / Caddy both set `x-forwarded-for`.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Parses a JSON object body from a request.
 * Returns `undefined` for empty or invalid payloads (never throws).
 */
export async function readJsonBody(
  request: NextRequest,
): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await request.text();
    if (raw.trim() === '') return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Raw text body for transparent proxying (keeps the exact payload).
 * Returns `undefined` when the body is empty.
 */
export async function readRawBody(request: NextRequest): Promise<string | undefined> {
  const raw = await request.text();
  return raw.trim() === '' ? undefined : raw;
}

/** Safe non-negative integer from a query param (fallback on garbage). */
export function queryInt(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
