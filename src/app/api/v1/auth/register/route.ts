// ============================================
// POST /api/v1/auth/register
// Register new tenant + admin user (SaaS onboarding)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, validationError } from '@/lib/api/response';
import { generateToken } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_name, subdomain, admin_name, admin_email, password, subscription_tier } = body;

    // Validate required fields
    if (!company_name || !subdomain || !admin_name || !admin_email || !password) {
      return apiError([
        ...(!company_name ? [{ code: 'VALIDATION_ERROR' as const, message: 'company_name is required', field: 'company_name' }] : []),
        ...(!subdomain ? [{ code: 'VALIDATION_ERROR' as const, message: 'subdomain is required', field: 'subdomain' }] : []),
        ...(!admin_name ? [{ code: 'VALIDATION_ERROR' as const, message: 'admin_name is required', field: 'admin_name' }] : []),
        ...(!admin_email ? [{ code: 'VALIDATION_ERROR' as const, message: 'admin_email is required', field: 'admin_email' }] : []),
        ...(!password ? [{ code: 'VALIDATION_ERROR' as const, message: 'password is required', field: 'password' }] : []),
      ], 400);
    }

    if (password.length < 8) {
      return validationError('password', 'Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email: admin_email } });
    if (existingUser) {
      return apiError({ code: 'CONFLICT', message: 'Email already registered', field: 'admin_email' }, 409);
    }

    // Check if subdomain/slug already exists
    const existingTenant = await db.tenant.findUnique({ where: { slug: subdomain } });
    if (existingTenant) {
      return apiError({ code: 'CONFLICT', message: 'Subdomain already taken', field: 'subdomain' }, 409);
    }

    // Create tenant + admin user in transaction
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: company_name,
          slug: subdomain,
          plan: subscription_tier || 'starter',
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: admin_email,
          name: admin_name,
          role: 'warehouse_manager',
          tenantId: tenant.id,
          isActive: true,
        },
      });

      // Create default forecast settings
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

    // Generate token
    const token = generateToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
    });

    // Audit
    await createAuditLog({
      tenantId: result.tenant.id,
      userId: result.user.id,
      action: 'create',
      entity: 'tenant',
      entityId: result.tenant.id,
      metadata: { company_name, subdomain, subscription_tier },
    });

    return apiSuccess({
      tenant_id: result.tenant.id,
      user_id: result.user.id,
      token,
      user: { id: result.user.id, name: result.user.name, role: result.user.role, email: result.user.email },
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug, plan: result.tenant.plan },
    }, undefined, 201);
  } catch (error) {
    console.error('[Auth/Register]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Registration failed' }, 500);
  }
}
