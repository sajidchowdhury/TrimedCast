// ============================================
// POST /api/v1/admin/security/events/[id]/resolve
// Resolve a security event
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { resolveSecurityEvent } from '@/lib/api/security-audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required to resolve security events');
    }

    const { id } = await params;
    const result = await resolveSecurityEvent(id, context.userId);

    if (!result) {
      return notFoundError('Security event');
    }

    return apiSuccess({
      message: 'Security event resolved',
      eventId: id,
      resolvedBy: context.userId,
    });
  } catch (error) {
    console.error('[Admin/Security/Events/Resolve/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to resolve security event' },
      500
    );
  }
}
