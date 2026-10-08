import type { NextRequest } from 'next/server';
import {
  ADMIN_DISPLAY_NAME,
  applySessionCookie,
  checkCredentials,
  isLoginRateLimited,
  recordLoginFailure,
  resetLoginFailures,
} from '@/lib/auth';
import { getClientIp, json, readJsonBody } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login — body `{ password }` (no username).
 * Success → httpOnly `hadith_session` cookie (7 days).
 * Failure → 401 with Arabic error. Rate limited: 5 failures / minute / IP.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isLoginRateLimited(ip)) {
    return json(
      { ok: false, error: 'عدد كبير من محاولات الدخول، انتظر دقيقة واحدة ثم أعد المحاولة' },
      429,
    );
  }

  const body = await readJsonBody(request);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (password === '') {
    return json({ ok: false, error: 'كلمة المرور مطلوبة' }, 400);
  }

  if (!checkCredentials(password)) {
    recordLoginFailure(ip);
    return json({ ok: false, error: 'كلمة المرور غير صحيحة' }, 401);
  }

  resetLoginFailures(ip);
  const response = json({ ok: true, username: ADMIN_DISPLAY_NAME });
  applySessionCookie(response, ADMIN_DISPLAY_NAME);
  return response;
}
