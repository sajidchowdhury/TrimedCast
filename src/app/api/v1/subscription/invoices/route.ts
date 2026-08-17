// ============================================
// GET /api/v1/subscription/invoices
// Get invoices list (paginated)
// Works in demo mode when not authenticated
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiPaginated,
  apiSuccess,
  validationError,
  internalError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
export const runtime = 'nodejs';


const VALID_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'];

// Demo invoices
function getDemoInvoices(page: number, perPage: number) {
  const now = new Date();
  const demoInvoices = [
    {
      id: 'demo-inv-001',
      number: 'INV-2025-001',
      status: 'paid',
      dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: 6900,
      discount: 0,
      tax: 0,
      total: 6900,
      currency: 'BDT',
      lineItems: [{ description: 'TrimedCast Professional Plan — Monthly', amount: 6900 }],
      usageSummary: { forecast_runs: 45, ai_queries: 12, sku_count: 150, import_runs: 3 },
      periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
      paymentMethod: 'bkash',
      paymentRef: 'BK-DEMO-001',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-inv-002',
      number: 'INV-2025-002',
      status: 'open',
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: null,
      subtotal: 6900,
      discount: 0,
      tax: 0,
      total: 6900,
      currency: 'BDT',
      lineItems: [{ description: 'TrimedCast Professional Plan — Monthly', amount: 6900 }],
      usageSummary: { forecast_runs: 32, ai_queries: 8, sku_count: 150, import_runs: 2 },
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      paymentMethod: null,
      paymentRef: null,
      createdAt: now.toISOString(),
    },
  ];

  return apiSuccess({
    invoices: demoInvoices,
    page,
    per_page: perPage,
    total: demoInvoices.length,
    isDemo: true,
  });
}

export async function GET(request: NextRequest) {
  try {
    // 1. Try auth
    const ctx = await getAuthContext();

    if (!ctx.isAuthenticated) {
      const url = new URL(request.url);
      const { page, perPage } = parsePagination(url);
      return getDemoInvoices(page, perPage);
    }

    // 2. Parse pagination
    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    // 3. Parse filters
    const statusFilter = url.searchParams.get('status');
    if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
      return validationError(
        'status',
        `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }

    // 4. Build where clause
    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };
    if (statusFilter) {
      where.status = statusFilter;
    }

    // 5. Fetch invoices
    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          number: true,
          status: true,
          dueDate: true,
          paidAt: true,
          subtotal: true,
          discount: true,
          tax: true,
          total: true,
          currency: true,
          lineItems: true,
          usageSummary: true,
          periodStart: true,
          periodEnd: true,
          paymentMethod: true,
          paymentRef: true,
          subscriptionId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.invoice.count({ where }),
    ]);

    // 6. Parse line items JSON for each invoice
    const parsedInvoices = invoices.map((invoice) => ({
      ...invoice,
      lineItems: (() => { try { return invoice.lineItems ? JSON.parse(invoice.lineItems) : null; } catch { return null; } })(),
      usageSummary: (() => { try { return invoice.usageSummary ? JSON.parse(invoice.usageSummary) : null; } catch { return null; } })(),
    }));

    // 7. Return paginated results
    return apiPaginated(parsedInvoices, page, perPage, total, ctx.tenantId);
  } catch (error) {
    console.error('[Subscription/Invoices/GET]', error);
    return internalError('Failed to fetch invoices');
  }
}
