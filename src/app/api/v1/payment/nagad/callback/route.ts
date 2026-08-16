// ============================================
// GET /api/v1/payment/nagad/callback
// Nagad payment callback handler
// ============================================

import {
  apiSuccess,
  internalError,
} from '@/lib/api/response';
import { verifyPayment } from '@/lib/payment/gateway';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const status = url.searchParams.get('status');

    if (!orderId) {
      return internalError('Missing orderId from Nagad');
    }

    // Nagad status codes: 5 = Completed
    const isCompleted = status === '5';

    const result = await verifyPayment({
      paymentId: orderId,
      gatewayPaymentId: orderId,
      method: 'nagad',
      subscriptionPaymentId: orderId,
    });

    return apiSuccess({
      callback: {
        method: 'nagad',
        order_id: orderId,
        status: result.status,
        success: result.success || isCompleted,
        transaction_id: result.transactionId,
        amount: result.amount,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[Payment/Nagad/Callback]', error);
    return internalError('Nagad callback processing failed');
  }
}
