/**
 * Server-side client for the Hadith Ai.BOT REST API (wispbyte server).
 * Any transport failure (network, timeout, non-2xx, non-JSON) throws
 * `BotUnavailableError` so routes can answer with a clear offline error.
 * Server-only — never import this from client components.
 */

const DEFAULT_BASE = 'https://hadithbot.wispbyte.org';
const DEFAULT_KEY = 'hadith_bot_key_2026_uniral';
const TIMEOUT_MS = 8_000;

export class BotUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BotUnavailableError';
  }
}

export function isBotUnavailableError(error: unknown): error is BotUnavailableError {
  return error instanceof BotUnavailableError;
}

/** `${BOT_API_URL}/api` — tolerates a base that already ends with `/api`. */
function apiBase(): string {
  const raw = (process.env.BOT_API_URL ?? DEFAULT_BASE).trim().replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

interface BotRequestOptions {
  query?: Record<string, string>;
  body?: unknown;
}

async function botRequest<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  options: BotRequestOptions = {},
): Promise<T> {
  const cleanPath = path.replace(/^\/+/, '');
  let url: URL;
  try {
    url = new URL(`${apiBase()}/${cleanPath}`);
  } catch {
    throw new BotUnavailableError('تكوين رابط البوت غير صالح');
  }
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== '') url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    'X-API-Key': process.env.BOT_API_KEY ?? DEFAULT_KEY,
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    // Raw strings are proxied verbatim; objects are JSON-encoded.
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    throw new BotUnavailableError('البوت غير متاح (فشل الاتصال)', { cause: error });
  }

  // Contract: the bot answers HTTP 200 for everything but a bad API key,
  // so any non-2xx means "unreachable / misconfigured" → offline error.
  if (!response.ok) {
    throw new BotUnavailableError(`البوت غير متاح (HTTP ${response.status})`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new BotUnavailableError('البوت أعاد ردًّا غير صالح', { cause: error });
  }
}

export function botGet<T>(path: string, query?: Record<string, string>): Promise<T> {
  return botRequest<T>('GET', path, { query });
}

export function botPost<T>(path: string, body?: unknown): Promise<T> {
  return botRequest<T>('POST', path, { body });
}

export function botPut<T>(path: string, body?: unknown): Promise<T> {
  return botRequest<T>('PUT', path, { body });
}
