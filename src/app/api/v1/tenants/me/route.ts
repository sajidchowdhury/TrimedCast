// ============================================
// GET /api/v1/tenants/me
// Current tenant info with subscription, usage, and status
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, unauthorizedError, notFoundError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { evaluateTenantStatus, getTierDefinition, getCurrentPeriodUsage } from '@/lib/api/billing';
export const runtime = 'nodejs';


export async function GET() {
  try {
    // 1. Require auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Fetch tenant with subscription
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      return notFoundError('Tenant');
    }

    // 3. Get current period usage counts
    const usage = await getCurrentPeriodUsage(tenant.id);

    // 4. Evaluate tenant status
    const statusCheck = evaluateTenantStatus(tenant);

    // 5. Get current tier definition
    const tierDefinition = getTierDefinition(tenant.plan);

    return apiSuccess({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        plan: tenant.plan,
        status: tenant.status,
        isActive: tenant.isActive,
        trialStartsAt: tenant.trialStartsAt.toISOString(),
        trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
        suspendedAt: tenant.suspendedAt?.toISOString() ?? null,
        suspensionReason: tenant.suspensionReason,
        cancelledAt: tenant.cancelledAt?.toISOString() ?? null,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
      subscription: tenant.subscription
        ? {
            id: tenant.subscription.id,
            tier: tenant.subscription.tier,
            status: tenant.subscription.status,
            trialEndsAt: tenant.subscription.trialEndsAt?.toISOString() ?? null,
            currentPeriodStart: tenant.subscription.currentPeriodStart?.toISOString() ?? null,
            currentPeriodEnd: tenant.subscription.currentPeriodEnd?.toISOString() ?? null,
            unitAmountCents: tenant.subscription.unitAmountCents,
            currency: tenant.subscription.currency,
            lastPaymentAt: tenant.subscription.lastPaymentAt?.toISOString() ?? null,
            nextPaymentAt: tenant.subscription.nextPaymentAt?.toISOString() ?? null,
          }
        : null,
      counts: {
        users: tenant._count.users,
        products: tenant._count.products,
      },
      usage,
      statusCheck,
      tier: tierDefinition,
    });
  } catch (error) {
    console.error('[Tenants/Me]', error);
    return internalError('Failed to fetch tenant info');
  }
}
