import type { NextRequest } from 'next/server';
import { botGet, botPost, botPut } from '@/lib/bot-client';
import { getSession } from '@/lib/auth';
import { json, readRawBody } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/**
 * Authenticated proxy to the Bot REST API.
 * GET/POST/PUT `/api/bot/<sub-path>` → `BOT_API_URL/api/<sub-path>`
 * (same method, query and body forwarded verbatim).
 *
 * No mock data: when the bot is unreachable the route answers
 * `{ ok: false, error }` so the panel shows the REAL state only.
 */

interface BotRouteContext {
  params: Promise<{ path: string[] }>;
}

/** Honest offline message — the single source of every unreachable reply. */
const BOT_OFFLINE_ERROR =
  'البوت غير متصل — تأكد من تشغيل خادم البوت على السيرفر (hadithbot.wispbyte.org) ثم أعد المحاولة';

function unauthorized(): ReturnType<typeof json> {
  return json({ ok: false, error: 'غير مصرح' }, 401);
}

function segmentsOf(rawSegments: string[] | undefined): string[] {
  return (rawSegments ?? []).filter((segment) => segment !== '');
}

function queryRecord(request: NextRequest): Record<string, string> {
  const record: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function GET(request: NextRequest, context: BotRouteContext) {
  if ((await getSession()) === null) return unauthorized();
  const { path } = await context.params;
  const segments = segmentsOf(path);
  const joined = segments.join('/');
  // Spec §4 lets the panel call /api/bot/qr while the bot exposes /api/connect/qr.
  const forwardPath = joined === 'qr' ? 'connect/qr' : joined;
  try {
    const data = await botGet<unknown>(forwardPath, queryRecord(request));
    return json(data);
  } catch {
    return json({ ok: false, error: BOT_OFFLINE_ERROR });
  }
}

export async function POST(request: NextRequest, context: BotRouteContext) {
  if ((await getSession()) === null) return unauthorized();
  const { path } = await context.params;
  const joined = segmentsOf(path).join('/');
  const body = await readRawBody(request);
  try {
    const data = await botPost<unknown>(joined, body);
    return json(data);
  } catch {
    return json({ ok: false, error: BOT_OFFLINE_ERROR });
  }
}

export async function PUT(request: NextRequest, context: BotRouteContext) {
  if ((await getSession()) === null) return unauthorized();
  const { path } = await context.params;
  const joined = segmentsOf(path).join('/');
  const body = await readRawBody(request);
  try {
    const data = await botPut<unknown>(joined, body);
    return json(data);
  } catch {
    return json({ ok: false, error: BOT_OFFLINE_ERROR });
  }
}
