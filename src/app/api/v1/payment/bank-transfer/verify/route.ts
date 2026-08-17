// ============================================
// POST /api/v1/payment/bank-transfer/verify
// Admin endpoint to manually verify bank transfer
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { adminVerifyBankTransfer, adminMarkPaymentFailed } from '@/lib/payment/gateway';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth (admin only)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (context.role !== 'admin' && context.role !== 'finance') {
      return forbiddenError('Only admin or finance role can verify bank transfers');
    }

    // 2. Validate input
    const body = await request.json();
    const { paymentId, action, notes } = body as {
      paymentId?: string;
      action?: string;
      notes?: string;
    };

    if (!paymentId) {
      return validationError('paymentId', 'Payment ID is required');
    }

    if (!action || !['verify', 'reject'].includes(action)) {
      return validationError('action', 'Action must be verify or reject');
    }

    // 3. Execute action
    if (action === 'verify') {
      const result = await adminVerifyBankTransfer(paymentId, context.userId, notes);
      if (!result.success) {
        return internalError(result.message);
      }
      return apiSuccess({ verified: true, message: result.message });
    } else {
      const result = await adminMarkPaymentFailed(paymentId, context.userId, notes);
      if (!result.success) {
        return internalError(result.message);
      }
      return apiSuccess({ rejected: true, message: result.message });
    }
  } catch (error) {
    console.error('[Payment/BankTransfer/Verify]', error);
    return internalError('Failed to verify bank transfer');
  }
}
