// ============================================
// TrimedCast LEAN — GET /api/auth/me
// Returns the current authenticated user (from session cookie).
// Used by the frontend to check if the user is logged in.
// ============================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken } from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Find the session + validate it's not expired
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Session expired or doesn't exist
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        businessName: session.user.businessName,
      },
    });
  } catch (err) {
    console.error('[auth/me] error:', err);
    return NextResponse.json({ user: null });
  }
}
