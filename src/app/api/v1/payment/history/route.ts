// ============================================
// GET /api/v1/payment/history
// Get payment history for the current tenant
// ============================================

import {
  apiSuccess,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getPaymentHistory } from '@/lib/payment/gateway';

export async function GET(request: Request) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Parse pagination
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10)));

    // 3. Get payment history
    const result = await getPaymentHistory(context.tenantId, page, perPage);

    // 4. Return formatted
    return apiSuccess({
      payments: result.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        transaction_id: p.transactionId,
        period_start: p.periodStart,
        period_end: p.periodEnd,
        receipt_url: p.receiptUrl,
        notes: p.notes,
        created_at: p.createdAt,
        verified_at: p.verifiedAt,
      })),
      pagination: {
        page: result.page,
        per_page: result.perPage,
        total: result.total,
        total_pages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[Payment/History]', error);
    return internalError('Failed to fetch payment history');
  }
}
