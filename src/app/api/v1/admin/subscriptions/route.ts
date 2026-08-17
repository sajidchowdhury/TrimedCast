// ============================================
// GET/POST /api/v1/admin/subscriptions
// Subscription management for super-admin
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  unauthorizedError,
  forbiddenError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required');
    }

    const { page, perPage, skip, take } = parsePagination(request.nextUrl);
    const url = request.nextUrl;
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, plan: true },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    return apiPaginated(subscriptions, page, perPage, total);
  } catch (error) {
    console.error('[Admin/Subscriptions/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get subscriptions' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required');
    }

    const body = await request.json();
    const { tenantId, action } = body; // action: 'apply_credit' | 'extend_grace'

    if (!tenantId || !action) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'tenantId and action are required' },
        400
      );
    }

    const subscription = await db.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      return apiError({ code: 'NOT_FOUND', message: 'Subscription not found for tenant' }, 404);
    }

    switch (action) {
      case 'apply_credit': {
        const { amountCents, reason } = body;
        if (!amountCents || !reason) {
          return apiError(
            { code: 'VALIDATION_ERROR', message: 'amountCents and reason required' },
            400
          );
        }
        // Create a credit invoice
        const invoice = await db.invoice.create({
          data: {
            tenantId,
            subscriptionId: subscription.id,
            status: 'paid',
            subtotalCents: -Math.abs(amountCents),
            totalCents: -Math.abs(amountCents),
            currency: 'usd',
            lineItems: JSON.stringify([{
              description: `Credit: ${reason}`,
              amount_cents: -Math.abs(amountCents),
            }]),
            paidAt: new Date(),
          },
        });
        return apiSuccess({ message: 'Credit applied', invoice }, 201);
      }

      case 'extend_grace': {
        const { days } = body;
        if (!days || days < 1 || days > 30) {
          return apiError(
            { code: 'VALIDATION_ERROR', message: 'days must be between 1 and 30' },
            400
          );
        }
        const gracePeriodEnd = subscription.gracePeriodEnd || new Date();
        const newGraceEnd = new Date(gracePeriodEnd.getTime() + days * 86400000);
        await db.subscription.update({
          where: { id: subscription.id },
          data: { gracePeriodEnd: newGraceEnd },
        });
        return apiSuccess({
          message: `Grace period extended by ${days} days`,
          newGraceEnd: newGraceEnd.toISOString(),
        });
      }

      default:
        return apiError(
          { code: 'INVALID_ACTION', message: 'Action must be apply_credit or extend_grace' },
          400
        );
    }
  } catch (error) {
    console.error('[Admin/Subscriptions/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to manage subscription' }, 500);
  }
}
