// ============================================
// TrimedCast LEAN — POST /api/auth/logout
// Deletes the session + clears the cookie.
// ============================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearSessionCookie, getSessionToken } from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      // Delete the session from DB
      await db.session.deleteMany({ where: { token } });
    }
    // Clear the cookie
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[auth/logout] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
