// ============================================
// POST /api/v1/auth/logout
// Invalidate session in DB
// ============================================

import { apiSuccess, unauthorizedError } from '@/lib/api/response';
import { getAuthContext, logout } from '@/lib/api/auth';
import { headers } from 'next/headers';

export async function POST() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Revoke the session in DB
    const hdrs = await headers();
    const authHeader = hdrs.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      await logout(authHeader.substring(7));
    }

    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth/Logout]', error);
    return apiSuccess({ message: 'Logged out' });
  }
}
