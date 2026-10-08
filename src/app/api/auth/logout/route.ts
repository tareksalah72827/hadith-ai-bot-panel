import { clearSessionCookie } from '@/lib/auth';
import { json } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — expires the session cookie. */
export async function POST() {
  const response = json({ ok: true });
  clearSessionCookie(response);
  return response;
}
