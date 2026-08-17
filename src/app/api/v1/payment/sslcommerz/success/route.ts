// ============================================
// GET /api/v1/payment/sslcommerz/success
// SSLCommerz success redirect handler
// ============================================

import {
  apiSuccess,
  internalError,
} from '@/lib/api/response';
import { verifyPayment } from '@/lib/payment/gateway';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tranId = url.searchParams.get('tran_id');
    const valId = url.searchParams.get('val_id');
    const amount = url.searchParams.get('amount');

    if (!tranId) {
      return internalError('Missing tran_id from SSLCommerz');
    }

    const result = await verifyPayment({
      paymentId: tranId,
      gatewayPaymentId: valId || tranId,
      method: 'sslcommerz',
      subscriptionPaymentId: tranId,
      additionalData: { amount: amount ? parseFloat(amount) : 0 },
    });

    return apiSuccess({
      callback: {
        method: 'sslcommerz',
        tran_id: tranId,
        val_id: valId,
        status: result.status,
        success: result.success,
        transaction_id: result.transactionId,
        amount: result.amount,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[Payment/SSLCommerz/Success]', error);
    return internalError('SSLCommerz success handler failed');
  }
}
