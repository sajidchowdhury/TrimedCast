// ============================================
// POST /api/v1/payment/verify
// Verify a payment after gateway callback
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { verifyPayment } from '@/lib/payment/gateway';
import { type BDPaymentMethod } from '@/lib/payment/types';

const VALID_METHODS: BDPaymentMethod[] = ['bkash', 'nagad', 'sslcommerz', 'bank_transfer'];

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { paymentId, gatewayPaymentId, method, additionalData } = body as {
      paymentId?: string;
      gatewayPaymentId?: string;
      method?: string;
      additionalData?: Record<string, unknown>;
    };

    if (!paymentId) {
      return validationError('paymentId', 'Payment ID is required');
    }

    if (!gatewayPaymentId) {
      return validationError('gatewayPaymentId', 'Gateway payment ID is required');
    }

    if (!method || !VALID_METHODS.includes(method as BDPaymentMethod)) {
      return validationError('method', `Method must be one of: ${VALID_METHODS.join(', ')}`);
    }

    // 3. Verify payment
    const result = await verifyPayment({
      paymentId,
      gatewayPaymentId,
      method: method as BDPaymentMethod,
      additionalData,
      subscriptionPaymentId: paymentId,
    });

    // 4. Return verification result
    return apiSuccess({
      verification: {
        success: result.success,
        status: result.status,
        transaction_id: result.transactionId,
        amount: result.amount,
        currency: result.currency,
        paid_at: result.paidAt,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[Payment/Verify]', error);
    return internalError('Failed to verify payment');
  }
}
