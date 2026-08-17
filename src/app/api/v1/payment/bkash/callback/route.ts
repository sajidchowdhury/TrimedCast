// ============================================
// GET /api/v1/payment/bkash/callback
// bKash payment callback handler
// User returns here after completing bKash payment
// ============================================

import {
  apiSuccess,
  internalError,
} from '@/lib/api/response';
import { verifyPayment } from '@/lib/payment/gateway';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const paymentID = url.searchParams.get('paymentID');
    const status = url.searchParams.get('status');

    if (!paymentID) {
      return internalError('Missing paymentID from bKash');
    }

    // In demo mode, auto-verify
    if (status === 'success' && paymentID.startsWith('BK_DEMO_')) {
      const result = await verifyPayment({
        paymentId: paymentID,
        gatewayPaymentId: paymentID,
        method: 'bkash',
        subscriptionPaymentId: paymentID,
      });

      return apiSuccess({
        callback: {
          method: 'bkash',
          payment_id: paymentID,
          status: result.status,
          success: result.success,
          message: result.message,
        },
      });
    }

    // In production, verify with bKash API
    const result = await verifyPayment({
      paymentId: paymentID,
      gatewayPaymentId: paymentID,
      method: 'bkash',
      subscriptionPaymentId: paymentID,
    });

    return apiSuccess({
      callback: {
        method: 'bkash',
        payment_id: paymentID,
        status: result.status,
        success: result.success,
        transaction_id: result.transactionId,
        amount: result.amount,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[Payment/bKash/Callback]', error);
    return internalError('bKash callback processing failed');
  }
}
