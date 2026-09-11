// ============================================
// TrimedCast LEAN — POST /api/auth/login
// Login with email + password. Creates a session + sets cookie.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateSessionToken, getSessionExpiry, setSessionCookie } from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    // Find the user by email
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email. Please sign up first.' },
        { status: 401 },
      );
    }

    // Verify the password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password. Please try again.' },
        { status: 401 },
      );
    }

    // Create a session
    const token = generateSessionToken();
    const expiresAt = getSessionExpiry();
    await db.session.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Set the session cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[auth/login] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
