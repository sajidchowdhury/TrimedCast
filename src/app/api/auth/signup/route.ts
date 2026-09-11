// ============================================
// TrimedCast LEAN — POST /api/auth/signup
// Create a new user with email + phone + business name + password.
// One account per email and per phone (unique).
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  generateSessionToken,
  getSessionExpiry,
  setSessionCookie,
  isValidEmail,
  isValidPhone,
} from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, businessName, password } = body;

    // Validate
    if (!email || !phone || !businessName || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, phone, business name, and password are all required.' },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format.' }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone format. Use BD format: 01XXXXXXXXX or +8801XXXXXXXXX.' },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Check if phone already exists
    const existingPhone = await db.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ success: false, error: 'An account with this phone number already exists.' }, { status: 409 });
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        phone,
        businessName,
        passwordHash,
      },
    });

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
    console.error('[auth/signup] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
