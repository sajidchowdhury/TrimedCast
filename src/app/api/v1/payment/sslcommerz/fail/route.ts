// ============================================
// GET /api/v1/payment/sslcommerz/fail
// SSLCommerz failure redirect handler
// ============================================

import { apiSuccess } from '@/lib/api/response';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tranId = url.searchParams.get('tran_id');
  const error = url.searchParams.get('error');

  return apiSuccess({
    callback: {
      method: 'sslcommerz',
      tran_id: tranId,
      status: 'failed',
      success: false,
      message: error || 'SSLCommerz payment failed',
    },
  });
}
