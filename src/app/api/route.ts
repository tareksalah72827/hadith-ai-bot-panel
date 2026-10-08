import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET /api — minimal service descriptor (panel API is alive). */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'Hadith Ai.BOT panel API', version: '1.0.0' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
