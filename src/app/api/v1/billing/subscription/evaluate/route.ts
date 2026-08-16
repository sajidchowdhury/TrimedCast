// ============================================
// POST /api/v1/billing/subscription/evaluate
// Evaluate and auto-transition subscription status
// ============================================

import {
  apiSuccess,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { evaluateAndTransitionSubscription } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';

export async function POST() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Evaluate and auto-transition
    const result = await evaluateAndTransitionSubscription(context.tenantId);

    // 3. Audit log if a transition occurred
    if (result && result.success) {
      await createAuditLog({
        tenantId: context.tenantId,
        userId: context.userId,
        action: 'status_change',
        entity: 'subscription',
        changes: {
          before: { status: result.fromStatus },
          after: { status: result.toStatus },
        },
        metadata: {
          type: 'auto_transition',
          action: result.action,
          from: result.fromStatus,
          to: result.toStatus,
        },
      });
    }

    // 4. Return evaluation result
    return apiSuccess({
      evaluated: true,
      transition_occurred: result?.success ?? false,
      transition: result
        ? {
            from_status: result.fromStatus,
            to_status: result.toStatus,
            action: result.action,
          }
        : null,
      message: result?.success
        ? `Subscription auto-transitioned from '${result.fromStatus}' to '${result.toStatus}'`
        : 'No transition needed — subscription is in a valid state',
    });
  } catch (error) {
    console.error('[Billing/Subscription/Evaluate]', error);
    return internalError('Failed to evaluate subscription');
  }
}
