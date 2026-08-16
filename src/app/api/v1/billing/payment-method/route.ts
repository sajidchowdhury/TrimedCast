// ============================================
// GET  /api/v1/billing/payment-method — Get current payment method
// POST /api/v1/billing/payment-method — Update payment method
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getPaymentMethod, updatePaymentMethod } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';

// --- GET: Fetch current payment method ---
export async function GET() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get payment method
    const paymentMethod = await getPaymentMethod(context.tenantId);

    if (!paymentMethod) {
      return notFoundError('Payment method');
    }

    // 3. Return payment method info
    return apiSuccess({
      payment_method: {
        type: paymentMethod.type,
        last_four: paymentMethod.lastFour,
        expiry_month: paymentMethod.expiryMonth,
        expiry_year: paymentMethod.expiryYear,
        is_expired: paymentMethod.isExpired,
      },
    });
  } catch (error) {
    console.error('[Billing/PaymentMethod/GET]', error);
    return internalError('Failed to fetch payment method');
  }
}

// --- POST: Update payment method ---
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { type, last_four, expiry_month, expiry_year } = body as {
      type?: string;
      last_four?: string;
      expiry_month?: number;
      expiry_year?: number;
    };

    if (!type) {
      return validationError('type', 'Payment method type is required');
    }

    if (!last_four) {
      return validationError('last_four', 'Last four digits are required');
    }

    if (!expiry_month || expiry_month < 1 || expiry_month > 12) {
      return validationError('expiry_month', 'Valid expiry month (1-12) is required');
    }

    if (!expiry_year || expiry_year < new Date().getFullYear()) {
      return validationError('expiry_year', 'Valid expiry year is required');
    }

    // 3. Update payment method
    const result = await updatePaymentMethod(context.tenantId, {
      type,
      lastFour: last_four,
      expiryMonth: expiry_month,
      expiryYear: expiry_year,
    });

    // 4. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'payment_method',
      changes: {
        after: {
          type: result.type,
          last_four: result.lastFour,
          expiry_month: result.expiryMonth,
          expiry_year: result.expiryYear,
        },
      },
      metadata: {
        type: 'payment_method_updated',
        is_expired: result.isExpired,
      },
    });

    // 5. Return updated payment method
    return apiSuccess({
      payment_method: {
        type: result.type,
        last_four: result.lastFour,
        expiry_month: result.expiryMonth,
        expiry_year: result.expiryYear,
        is_expired: result.isExpired,
      },
    });
  } catch (error) {
    console.error('[Billing/PaymentMethod/POST]', error);
    return internalError('Failed to update payment method');
  }
}
