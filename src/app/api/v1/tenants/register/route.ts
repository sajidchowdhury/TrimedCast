// ============================================
// POST /api/v1/tenants/register
// Tenant registration with auto-provisioning
// Creates: Tenant + Admin User + ForecastSettings + Subscription
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiCreated, apiError, validationError, conflictError, internalError } from '@/lib/api/response';
import { generateToken } from '@/lib/api/auth';
import { createSubscription, TierSlug } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';

const VALID_TIERS: TierSlug[] = ['starter', 'professional', 'enterprise'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_name,
      slug,
      admin_name,
      admin_email,
      admin_password,
      tier,
      phone,
      domain,
    } = body;

    // --- Validate required fields ---
    const errors: Array<{ code: string; message: string; field: string }> = [];

    if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'company_name is required', field: 'company_name' });
    }
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'slug is required', field: 'slug' });
    } else if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'slug must be 3-50 chars, lowercase alphanumeric and hyphens, cannot start/end with hyphen',
        field: 'slug',
      });
    }
    if (!admin_name || typeof admin_name !== 'string' || admin_name.trim().length === 0) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'admin_name is required', field: 'admin_name' });
    }
    if (!admin_email || typeof admin_email !== 'string') {
      errors.push({ code: 'VALIDATION_ERROR', message: 'admin_email is required', field: 'admin_email' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'admin_email must be a valid email address', field: 'admin_email' });
    }
    if (!admin_password || typeof admin_password !== 'string') {
      errors.push({ code: 'VALIDATION_ERROR', message: 'admin_password is required', field: 'admin_password' });
    } else if (admin_password.length < 8) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'admin_password must be at least 8 characters', field: 'admin_password' });
    }
    if (!tier || !VALID_TIERS.includes(tier)) {
      errors.push({ code: 'VALIDATION_ERROR', message: `tier must be one of: ${VALID_TIERS.join(', ')}`, field: 'tier' });
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // --- Check uniqueness constraints ---
    const existingUser = await db.user.findUnique({ where: { email: admin_email } });
    if (existingUser) {
      return conflictError('A user with this email already exists');
    }

    const existingTenant = await db.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return conflictError('A tenant with this slug already exists');
    }

    // --- Auto-provision in transaction ---
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await db.$transaction(async (tx) => {
      // a. Create Tenant (trial status, 14-day trial)
      const tenant = await tx.tenant.create({
        data: {
          name: company_name,
          slug,
          domain: domain || null,
          plan: tier,
          status: 'trial',
          isActive: true,
          trialEndsAt,
        },
      });

      // b. Create User (tenant admin = warehouse_manager)
      const user = await tx.user.create({
        data: {
          email: admin_email,
          name: admin_name,
          role: 'warehouse_manager',
          tenantId: tenant.id,
          isActive: true,
        },
      });

      // c. Create ForecastSetting with BD defaults
      await tx.forecastSetting.create({
        data: {
          tenantId: tenant.id,
          model: 'prophet',
          horizonDays: 90,
          confidenceLevel: 0.95,
          seasonalityMode: 'multiplicative',
          includeHolidays: true,
          includePromos: true,
          cnyAdjustment: true,
          autoRecalibration: true,
          recalibrationThreshold: 0.15,
        },
      });

      return { tenant, user };
    });

    // d. Create Subscription (outside tx since createSubscription updates tenant itself)
    const { subscriptionId } = await createSubscription(result.tenant.id, tier as TierSlug, 14);

    // Generate auth token for the new admin
    const token = generateToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
    });

    // Audit log
    await createAuditLog({
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'create',
      entity: 'tenant',
      entityId: result.tenant.id,
      metadata: {
        company_name,
        slug,
        tier,
        domain: domain || null,
        admin_email,
        subscriptionId,
      },
    });

    return apiCreated({
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: tier,
        status: 'trial',
        trialEndsAt: result.tenant.trialEndsAt?.toISOString(),
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      token,
      subscription: {
        id: subscriptionId,
        tier,
        status: 'trial',
      },
    });
  } catch (error) {
    console.error('[Tenants/Register]', error);
    return internalError('Tenant registration failed');
  }
}
