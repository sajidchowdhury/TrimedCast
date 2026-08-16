// ============================================
// TrimedCast - DB-Backed Session Store
// Replaces in-memory Map with persistent DB sessions
// ============================================

import { db } from '@/lib/db';

const SESSION_DURATION_HOURS = 24;
const SESSION_MAX_CONCURRENT = 5; // Max active sessions per user

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a new session for a user
 * Returns the session token
 */
export async function createSession(
  userId: string,
  tenantId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  // Check concurrent session limit
  const activeSessions = await db.userSession.count({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (activeSessions >= SESSION_MAX_CONCURRENT) {
    // Invalidate oldest session
    const oldest = await db.userSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (oldest) {
      await db.userSession.update({
        where: { id: oldest.id },
        data: { isActive: false },
      });
    }
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await db.userSession.create({
    data: {
      userId,
      tenantId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return token;
}

/**
 * Verify a session token and return session data
 */
export async function verifySession(
  token: string
): Promise<{ userId: string; tenantId: string; isActive: boolean } | null> {
  const session = await db.userSession.findUnique({
    where: { token },
  });

  if (!session) return null;
  if (!session.isActive) return null;
  if (session.expiresAt < new Date()) {
    // Expired — deactivate
    await db.userSession.update({
      where: { id: session.id },
      data: { isActive: false },
    });
    return null;
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId,
    isActive: true,
  };
}

/**
 * Deactivate a session (logout)
 */
export async function revokeSession(token: string): Promise<boolean> {
  const session = await db.userSession.findUnique({ where: { token } });
  if (!session) return false;

  await db.userSession.update({
    where: { id: session.id },
    data: { isActive: false },
  });

  return true;
}

/**
 * Revoke all sessions for a user (force logout all devices)
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.userSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  return result.count;
}

/**
 * Get all active sessions for a user (for "Manage Sessions" UI)
 */
export async function getUserSessions(userId: string) {
  return db.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.userSession.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      isActive: true,
    },
    data: { isActive: false },
  });
  return result.count;
}
