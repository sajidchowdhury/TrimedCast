// ============================================
// POST /api/v1/auth/logout
// ============================================

import { apiSuccess, unauthorizedError } from '@/lib/api/response';
import { getAuthContext, revokeToken } from '@/lib/api/auth';
import { headers } from 'next/headers';

export async function POST() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Revoke the token
    const hdrs = await headers();
    const authHeader = hdrs.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      revokeToken(authHeader.substring(7));
    }

    return apiSuccess({ message: 'Logged out' });
  } catch (error) {
    console.error('[Auth/Logout]', error);
    return apiSuccess({ message: 'Logged out' });
  }
}
