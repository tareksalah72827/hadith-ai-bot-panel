import type { NextRequest } from 'next/server';
import { botGet, botPost, botPut, isBotUnavailableError } from '@/lib/bot-client';
import { getSession } from '@/lib/auth';
import {
  demoAiReply,
  demoAyah,
  demoBroadcasts,
  demoGroupsApproved,
  demoGroupsPending,
  demoLogs,
  demoPairingCode,
  demoQr,
  demoQuote,
  demoSchedules,
  demoSettings,
  demoStatus,
  demoUsers,
} from '@/lib/demo-data';
import type { BotUser, LogEntry } from '@/lib/types';
import { json, queryInt, readRawBody } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/**
 * Authenticated proxy to the Bot REST API.
 * GET/POST/PUT `/api/bot/<sub-path>` → `BOT_API_URL/api/<sub-path>`
 * (same method, query and body forwarded verbatim).
 *
 * When the bot is unreachable (network / timeout / non-2xx / non-JSON)
 * the route answers deterministic demo data flagged with `demo: true`.
 * Responses are always HTTP 200 — except 401 for unauthenticated calls.
 */

interface BotRouteContext {
  params: Promise<{ path: string[] }>;
}

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
  } catch (error) {
    if (!isBotUnavailableError(error)) return json({ ok: false, error: 'تعذر تنفيذ الطلب' });
    return json(demoGetResponse(joined, request.nextUrl.searchParams));
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
  } catch (error) {
    if (!isBotUnavailableError(error)) return json({ ok: false, error: 'تعذر تنفيذ الطلب' });
    return json(demoMutationResponse('POST', joined));
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
  } catch (error) {
    if (!isBotUnavailableError(error)) return json({ ok: false, error: 'تعذر تنفيذ الطلب' });
    return json(demoMutationResponse('PUT', joined));
  }
}

// ---------------------------------------------------------------------------
// Demo fallback — read paths
// ---------------------------------------------------------------------------

function demoGetResponse(joined: string, searchParams: URLSearchParams): Record<string, unknown> {
  switch (joined) {
    case 'status':
      return { ok: true, ...demoStatus, demo: true };
    case 'qr':
    case 'connect/qr':
      return { ok: true, qr: demoQr, state: 'waiting', demo: true };
    case 'users':
      return { ok: true, users: filterDemoUsers(searchParams), demo: true };
    case 'groups':
      return { ok: true, groups: demoGroupsApproved, pending: demoGroupsPending, demo: true };
    case 'broadcasts':
      return { ok: true, broadcasts: demoBroadcasts, demo: true };
    case 'schedules':
      return { ok: true, schedules: demoSchedules, demo: true };
    case 'settings':
      return { ok: true, settings: demoSettings, demo: true };
    case 'logs':
      return { ok: true, logs: filterDemoLogs(searchParams), demo: true };
    default:
      return { ok: false, error: 'غير مدعوم في وضع العرض التجريبي', demo: true };
  }
}

/** `?q&limit&offset` — search matches name, pushname, number and jid. */
function filterDemoUsers(searchParams: URLSearchParams): BotUser[] {
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const source =
    q === ''
      ? demoUsers
      : demoUsers.filter((user) =>
          [user.name, user.pushname, user.number, user.jid].some((field) =>
            field.toLowerCase().includes(q),
          ),
        );
  const offset = queryInt(searchParams.get('offset'), 0);
  const limit = queryInt(searchParams.get('limit'), source.length);
  return source.slice(offset, offset + limit);
}

/** `?level=info|warn|error&type=&limit=` — always newest-first. */
function filterDemoLogs(searchParams: URLSearchParams): LogEntry[] {
  const level = searchParams.get('level');
  const type = (searchParams.get('type') ?? '').trim();
  let list = [...demoLogs].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  if (level === 'info' || level === 'warn' || level === 'error') {
    list = list.filter((entry) => entry.level === level);
  }
  if (type !== '') {
    list = list.filter((entry) => entry.type === type);
  }
  const limit = Math.min(queryInt(searchParams.get('limit'), 100), 200);
  return list.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Demo fallback — mutation paths
// ---------------------------------------------------------------------------

const DEMO_SAVED: Record<string, unknown> = {
  ok: true,
  demo: true,
  message: 'حُفظ في وضع العرض التجريبي',
};

function demoMutationResponse(method: 'POST' | 'PUT', joined: string): Record<string, unknown> {
  if (method === 'POST') {
    switch (joined) {
      case 'quran/send-now':
        return { ok: true, ayah: { ...demoAyah, audioSent: true }, audioSent: true, demo: true };
      case 'quote/send-now':
        return { ok: true, quote: demoQuote, demo: true };
      case 'test/ai':
        return { ok: true, reply: demoAiReply, demo: true };
      case 'broadcast':
        return {
          ok: true,
          sent: 128,
          failed: 0,
          demo: true,
          message: 'تمت محاكاة البث في وضع العرض التجريبي',
        };
      case 'connect/start':
        return {
          ok: true,
          demo: true,
          message: 'بدأ الاتصال (محاكاة) — تابع رمز الاستجابة السريعة في صفحة الاتصال',
        };
      case 'connect/pair':
        return {
          ok: true,
          pairingCode: demoPairingCode,
          demo: true,
          message: 'رمز اقتران محاكاة في وضع العرض التجريبي',
        };
      case 'connect/logout':
        return { ok: true, demo: true, message: 'تمت محاكاة فصل الجلسة في وضع العرض التجريبي' };
    }
    if (/^users\/\d+\/(message|block|subscribe)$/.test(joined)) return { ...DEMO_SAVED };
    if (/^groups\/\d+\/(approve|reject)$/.test(joined)) return { ...DEMO_SAVED };
  } else if (joined === 'settings' || /^schedules\/[A-Za-z0-9_-]+$/.test(joined)) {
    return { ...DEMO_SAVED };
  }
  return { ok: false, error: 'غير مدعوم في وضع العرض التجريبي', demo: true };
}
