// ============================================
// GET /api/v1/admin/tenants
// SaaS admin dashboard — list all tenants
// Session 14: Usage Metering & Feature Check
// ============================================

import { NextRequest } from 'next/server';
import {
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
    // 1. Get auth context (require auth, require executive role)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (context.role !== 'executive') {
      return forbiddenError('Executive role required to access admin endpoints');
    }

    // 2. Parse pagination
    const { page, perPage, skip, take } = parsePagination(request.nextUrl);

    // 3. Parse filters
    const status = request.nextUrl.searchParams.get('status');
    const plan = request.nextUrl.searchParams.get('plan');
    const search = request.nextUrl.searchParams.get('search');

    // 4. Build where clause with filters
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (plan) {
      where.plan = plan;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    // 5. Fetch tenants with subscription info, user count, product count
    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            select: {
              tier: true,
              status: true,
              unitAmountCents: true,
            },
          },
          _count: {
            select: {
              users: true,
              products: true,
            },
          },
        },
      }),
      db.tenant.count({ where }),
    ]);

    // 6. Return apiPaginated with tenant list
    const tenantList = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      domain: tenant.domain,
      trialEndsAt: tenant.trialEndsAt,
      suspendedAt: tenant.suspendedAt,
      cancelledAt: tenant.cancelledAt,
      _count: {
        users: tenant._count.users,
        products: tenant._count.products,
      },
      subscription: tenant.subscription
        ? {
            tier: tenant.subscription.tier,
            status: tenant.subscription.status,
            unitAmountCents: tenant.subscription.unitAmountCents,
          }
        : null,
    }));

    return apiPaginated(tenantList, page, perPage, total);
  } catch (error) {
    console.error('[Admin/Tenants/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenants' },
      500
    );
  }
}
