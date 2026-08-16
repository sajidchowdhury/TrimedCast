// ============================================
// GET /api/v1/billing/invoices/[id]
// Get individual invoice details
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getInvoiceDetail } from '@/lib/api/billing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get invoice ID from path
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return notFoundError('Invoice');
    }

    // 3. Get invoice detail (includes tenant isolation check)
    let invoiceDetail;
    try {
      invoiceDetail = await getInvoiceDetail(invoiceId, context.tenantId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('not found')) {
        return notFoundError('Invoice');
      }
      if (message.includes('does not belong')) {
        return notFoundError('Invoice');
      }
      throw err;
    }

    // 4. Return full invoice detail
    return apiSuccess({
      invoice: invoiceDetail,
    });
  } catch (error) {
    console.error('[Billing/Invoices/Detail]', error);
    return internalError('Failed to fetch invoice detail');
  }
}
