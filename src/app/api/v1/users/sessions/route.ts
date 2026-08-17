// ============================================
// GET /api/v1/users/sessions
// List active sessions for current user
// ============================================

import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getUserSessions } from '@/lib/auth/session-store';

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const sessions = await getUserSessions(context.userId);

    return apiSuccess(
      sessions.map(s => ({
        id: s.id,
        ip_address: s.ipAddress,
        user_agent: s.userAgent,
        created_at: s.createdAt,
        expires_at: s.expiresAt,
      }))
    );
  } catch (error) {
    console.error('[Users/Sessions/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list sessions' }, 500);
  }
}
