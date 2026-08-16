// ============================================
// POST /api/v1/payment/create
// Create a new payment (bKash / Nagad / SSLCommerz / Bank Transfer)
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { createPayment, getBDTierPricing } from '@/lib/payment/gateway';
import { type BDPaymentMethod, BD_TIER_PRICING } from '@/lib/payment/types';

const VALID_METHODS: BDPaymentMethod[] = ['bkash', 'nagad', 'sslcommerz', 'bank_transfer'];
const VALID_TIERS = ['starter', 'professional', 'enterprise'];

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { method, tier, billingCycle, customerInfo } = body as {
      method?: string;
      tier?: string;
      billingCycle?: string;
      customerInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
      };
    };

    if (!method || !VALID_METHODS.includes(method as BDPaymentMethod)) {
      return validationError('method', `Payment method must be one of: ${VALID_METHODS.join(', ')}`);
    }

    if (!tier || !VALID_TIERS.includes(tier)) {
      return validationError('tier', `Tier must be one of: ${VALID_TIERS.join(', ')}`);
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return validationError('billingCycle', 'billingCycle must be monthly or yearly');
    }

    if (!customerInfo?.name) {
      return validationError('customerInfo.name', 'Customer name is required');
    }

    if (!customerInfo?.phone) {
      return validationError('customerInfo.phone', 'Customer phone is required');
    }

    // 3. Calculate amount in BDT
    const tierPricing = getBDTierPricing(tier);
    const amount = billingCycle === 'yearly' ? tierPricing.yearlyBDT : tierPricing.monthlyBDT;

    // 4. Create payment
    const result = await createPayment({
      tenantId: context.tenantId,
      amount,
      method: method as BDPaymentMethod,
      tier,
      billingCycle: billingCycle as 'monthly' | 'yearly',
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email || '',
        phone: customerInfo.phone,
        address: customerInfo.address,
      },
    });

    if (!result.success) {
      return internalError(result.message || 'Payment creation failed');
    }

    // 5. Return payment details
    return apiSuccess({
      payment: {
        id: result.subscriptionPaymentId,
        method,
        amount,
        currency: 'BDT',
        tier,
        billing_cycle: billingCycle,
        status: result.status,
        gateway_payment_id: result.gatewayPaymentId,
        redirect_url: result.redirectUrl,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('[Payment/Create]', error);
    return internalError('Failed to create payment');
  }
}
