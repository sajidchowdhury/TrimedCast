// ============================================
// GET  /api/v1/billing/invoice  — List invoices for tenant
// POST /api/v1/billing/invoice  — Generate a new invoice
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiCreated,
  apiPaginated,
  unauthorizedError,
  internalError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { generateInvoice } from '@/lib/api/billing';
export const runtime = 'nodejs';


// --- GET: List invoices ---
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Parse pagination
    const { page, perPage, skip, take } = parsePagination(new URL(request.url));

    // 3. Fetch invoices (paginated, sorted by createdAt desc)
    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where: { tenantId: context.tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      db.invoice.count({
        where: { tenantId: context.tenantId },
      }),
    ]);

    // 4. Return paginated response
    return apiPaginated(
      invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        subtotal_cents: inv.subtotalCents,
        total_cents: inv.totalCents,
        currency: inv.currency,
        due_date: inv.dueDate,
        period_start: inv.periodStart,
        period_end: inv.periodEnd,
        paid_at: inv.paidAt,
        created_at: inv.createdAt,
      })),
      page,
      perPage,
      total,
      context.tenantId
    );
  } catch (error) {
    console.error('[Billing/Invoice/GET]', error);
    return internalError('Failed to fetch invoices');
  }
}

// --- POST: Generate a new invoice ---
export async function POST() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Generate invoice
    const result = await generateInvoice(context.tenantId);

    // 3. Fetch full invoice details
    const invoice = await db.invoice.findUnique({
      where: { id: result.invoiceId },
    });

    return apiCreated({
      invoice: {
        id: invoice!.id,
        number: invoice!.number,
        status: invoice!.status,
        subtotal_cents: invoice!.subtotalCents,
        total_cents: invoice!.totalCents,
        currency: invoice!.currency,
        due_date: invoice!.dueDate,
        period_start: invoice!.periodStart,
        period_end: invoice!.periodEnd,
        line_items: result.lineItems,
        created_at: invoice!.createdAt,
      },
    });
  } catch (error) {
    console.error('[Billing/Invoice/POST]', error);

    // Handle known business logic errors
    const message = error instanceof Error ? error.message : 'Failed to generate invoice';
    if (message.includes('not found')) {
      return internalError('No active subscription found for this tenant');
    }
    return internalError('Failed to generate invoice');
  }
}
