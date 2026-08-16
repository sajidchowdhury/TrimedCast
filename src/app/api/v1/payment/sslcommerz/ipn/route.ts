// ============================================
// POST /api/v1/payment/sslcommerz/ipn
// SSLCommerz IPN (Instant Payment Notification) handler
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  internalError,
} from '@/lib/api/response';
import { handleSSLCommerzIPN } from '@/lib/payment/gateway';
import { type SSLCommerzIPNPayload } from '@/lib/payment/types';

export async function POST(request: NextRequest) {
  try {
    const payload: SSLCommerzIPNPayload = await request.json();

    // Verify the IPN signature (in production, validate with SSLCommerz verify_sign)
    const result = handleSSLCommerzIPN(payload);

    if (result.success) {
      // Payment completed - update DB
      // The handleSSLCommerzIPN just maps the status; actual DB update
      // is done via verifyPayment flow
      console.log('[SSLCommerz/IPN] Payment completed:', {
        tran_id: payload.tran_id,
        amount: payload.amount,
        bank_tran_id: payload.bank_tran_id,
      });
    } else {
      console.warn('[SSLCommerz/IPN] Payment not completed:', {
        status: payload.status,
        tran_id: payload.tran_id,
      });
    }

    // Always return 200 to acknowledge IPN
    return apiSuccess({ received: true });
  } catch (error) {
    console.error('[Payment/SSLCommerz/IPN]', error);
    // Still return 200 to avoid retries
    return apiSuccess({ received: true, error: 'Processing failed' });
  }
}
