import { getSession } from '@/lib/auth';
import { json } from '@/lib/utils-server';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — `{ ok, authenticated, username? }`. */
export async function GET() {
  const session = await getSession();
  if (session === null) {
    return json({ ok: true, authenticated: false });
  }
  return json({ ok: true, authenticated: true, username: session.sub });
}
