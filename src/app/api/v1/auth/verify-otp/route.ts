// ============================================
// POST /api/v1/auth/verify-otp
// Verify OTP and create account
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { verifyOtp } from '@/lib/auth/otp';
import { hashPassword } from '@/lib/auth/password';
import { generateAcId } from '@/lib/auth/ac-id';
import { createAuthSession } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, shop_name, phone, division, password } = body;

    // Validate
    if (!email || !otp) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Email and OTP are required' }, 400);
    }

    // Verify OTP
    const result = await verifyOtp(email, otp, 'signup');
    if (!result.success) {
      return apiError({ code: 'INVALID_OTP', message: result.message }, 400);
    }

    // Check if email already registered
    const existingUser = await db.user.findFirst({ where: { email } });
    if (existingUser) {
      return apiError({ code: 'CONFLICT', message: 'Email already registered. Please login.' }, 409);
    }

    // Validate required fields for account creation
    if (!shop_name || !division || !password) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Shop name, division, and password are required' }, 400);
    }

    // Generate AC-ID
    const acId = await generateAcId(division);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create tenant + admin user in transaction
    const created = await db.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          acId,
          name: shop_name,
          shopName: shop_name,
          slug: acId.toLowerCase().replace(/-/g, ''), // Use AC-ID as slug
          division,
          phone: phone || null,
          plan: 'starter',
          status: 'trial',
          isActive: true,
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: shop_name, // Default name = shop name (can update later)
          phone: phone || null,
          role: 'admin',
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

      // Create default subscription (trial)
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          tier: 'starter',
          status: 'trial',
          trialEndsAt: tenant.trialEndsAt,
          unitAmount: 0,
          currency: 'BDT',
          currentPeriodStart: new Date(),
          currentPeriodEnd: tenant.trialEndsAt,
        },
      });

      // Seed default seasonality types for this tenant
      const defaultSeasonalities = [
        { name: 'winter_peak', label: 'Winter Peak', labelBn: 'শীতকালীন চাহিদা বৃদ্ধি', multiplier: 1.35, months: '[11,12,1,2]', color: '#ef4444' },
        { name: 'pre_winter_peak', label: 'Pre-Winter Peak', labelBn: 'শীতের পূর্বে চাহিদা', multiplier: 1.20, months: '[10]', color: '#f97316' },
        { name: 'summer_peak', label: 'Summer Peak', labelBn: 'গ্রীষ্মকালীন চাহিদা', multiplier: 1.10, months: '[3,4,5]', color: '#22c55e' },
        { name: 'monsoon_dip', label: 'Monsoon Dip', labelBn: 'মৌসুমী চাহিদা হ্রাস', multiplier: 0.70, months: '[6,7,8,9]', color: '#3b82f6' },
      ];

      for (const s of defaultSeasonalities) {
        await tx.seasonalityType.create({
          data: {
            tenantId: tenant.id,
            name: s.name,
            label: s.label,
            labelBn: s.labelBn,
            multiplier: s.multiplier,
            months: s.months,
            color: s.color,
            isDefault: true,
            isActive: true,
          },
        });
      }

      return { tenant, user };
    });

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const token = await createAuthSession(created.user.id, created.tenant.id, ipAddress, userAgent);

    // Send welcome email (fire and forget — don't block account creation)
    sendWelcomeEmail(
      email,
      shop_name,
      acId,
      shop_name,
      division
    ).catch(err => console.error('[Auth/VerifyOtp] Welcome email failed:', err));

    // Audit
    await createAuditLog({
      tenantId: created.tenant.id,
      userId: created.user.id,
      action: 'create',
      entity: 'tenant',
      entityId: created.tenant.id,
      metadata: { shop_name, division, ac_id: acId },
    });

    return apiSuccess({
      message: 'Account created successfully!',
      ac_id: acId,
      token,
      user: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        role: created.user.role,
      },
      tenant: {
        id: created.tenant.id,
        ac_id: created.tenant.acId,
        name: created.tenant.name,
        shop_name: created.tenant.shopName,
        division: created.tenant.division,
        plan: created.tenant.plan,
        trial_ends_at: created.tenant.trialEndsAt,
      },
    }, undefined, 201);
  } catch (error) {
    console.error('[Auth/VerifyOtp]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Account creation failed' }, 500);
  }
}
