import type { NextRequest } from 'next/server';
import {
  applySessionCookie,
  checkCredentials,
  isLoginRateLimited,
  recordLoginFailure,
  resetLoginFailures,
} from '@/lib/auth';
import { getClientIp, json, readJsonBody } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login — body `{ username, password }`.
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
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (username === '' || password === '') {
    return json({ ok: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' }, 400);
  }

  if (!checkCredentials(username, password)) {
    recordLoginFailure(ip);
    return json({ ok: false, error: 'بيانات الدخول غير صحيحة' }, 401);
  }

  resetLoginFailures(ip);
  const response = json({ ok: true, username });
  applySessionCookie(response, username);
  return response;
}
