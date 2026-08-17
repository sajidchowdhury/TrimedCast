// ============================================
// TrimedCast — BD Payment Gateway (Unified)
// Routes payments to bKash / Nagad / SSLCommerz / Bank Transfer
// Session 13: BD Payment Integration
// ============================================

import { db } from '@/lib/db';
import {
  type BDPaymentMethod,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type VerifyPaymentRequest,
  type VerifyPaymentResponse,
  type PaymentStatus,
  type BankTransferDetails,
  BD_TIER_PRICING,
  BD_BANKS,
  generateInvoiceNumber,
  generateMerchantTrxId,
  formatBDT,
} from './types';
import {
  createBkashPayment,
  verifyBkashPayment,
  createBkashDemoPayment,
  verifyBkashDemoPayment,
} from './bkash';
import {
  createNagadPayment,
  verifyNagadPayment,
  createNagadDemoPayment,
  verifyNagadDemoPayment,
} from './nagad';
import {
  createSSLCommerzPayment,
  verifySSLCommerzPayment,
  createSSLCommerzDemoPayment,
  verifySSLCommerzDemoPayment,
  handleSSLCommerzIPN,
} from './sslcommerz';

// --- Demo/Sandbox Mode ---

function isDemoMode(): boolean {
  return process.env.BD_PAYMENT_SANDBOX !== 'false'; // Default to demo mode
}

// --- Create Payment (unified) ---

export async function createPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse & { subscriptionPaymentId: string }> {
  // 1. Create SubscriptionPayment record in DB
  const invoiceNumber = generateInvoiceNumber();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = request.billingCycle === 'yearly'
    ? new Date(now.getFullYear() + 1, now.getMonth(), 0)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const subscriptionPayment = await db.subscriptionPayment.create({
    data: {
      tenantId: request.tenantId,
      amount: request.amount,
      currency: 'BDT',
      method: request.method,
      status: 'pending',
      periodStart,
      periodEnd,
      metadata: JSON.stringify({
        tier: request.tier,
        billingCycle: request.billingCycle,
        invoiceNumber,
        customerInfo: request.customerInfo,
        ...(request.metadata || {}),
      }),
    },
  });

  // 2. Route to appropriate gateway
  let gatewayResponse: CreatePaymentResponse;

  if (request.method === 'bank_transfer') {
    // Bank transfer doesn't need a gateway - just return bank details
    gatewayResponse = {
      success: true,
      paymentId: subscriptionPayment.id,
      status: 'pending',
      message: 'Please transfer to one of our bank accounts and upload the receipt.',
    };
  } else if (isDemoMode()) {
    // Demo/sandbox mode
    switch (request.method) {
      case 'bkash':
        gatewayResponse = createBkashDemoPayment(request);
        break;
      case 'nagad':
        gatewayResponse = createNagadDemoPayment(request);
        break;
      case 'sslcommerz':
        gatewayResponse = createSSLCommerzDemoPayment(request);
        break;
      default:
        gatewayResponse = {
          success: false,
          paymentId: '',
          status: 'failed',
          message: `Unsupported payment method: ${request.method}`,
        };
    }
  } else {
    // Production mode
    switch (request.method) {
      case 'bkash':
        gatewayResponse = await createBkashPayment(request);
        break;
      case 'nagad':
        gatewayResponse = await createNagadPayment(request);
        break;
      case 'sslcommerz':
        gatewayResponse = await createSSLCommerzPayment(request);
        break;
      default:
        gatewayResponse = {
          success: false,
          paymentId: '',
          status: 'failed',
          message: `Unsupported payment method: ${request.method}`,
        };
    }
  }

  // 3. Update SubscriptionPayment with gateway ID
  if (gatewayResponse.success && gatewayResponse.gatewayPaymentId) {
    await db.subscriptionPayment.update({
      where: { id: subscriptionPayment.id },
      data: {
        transactionId: gatewayResponse.gatewayPaymentId,
        status: gatewayResponse.status === 'initiated' ? 'submitted' : 'pending',
        metadata: JSON.stringify({
          tier: request.tier,
          billingCycle: request.billingCycle,
          invoiceNumber,
          customerInfo: request.customerInfo,
          gatewayPaymentId: gatewayResponse.gatewayPaymentId,
          redirectUrl: gatewayResponse.redirectUrl,
          ...(request.metadata || {}),
        }),
      },
    });
  } else if (!gatewayResponse.success) {
    await db.subscriptionPayment.update({
      where: { id: subscriptionPayment.id },
      data: {
        status: 'failed',
        notes: gatewayResponse.message,
      },
    });
  }

  return {
    ...gatewayResponse,
    paymentId: subscriptionPayment.id,
    subscriptionPaymentId: subscriptionPayment.id,
  };
}

// --- Verify Payment (unified) ---

export async function verifyPayment(
  request: VerifyPaymentRequest & { subscriptionPaymentId: string }
): Promise<VerifyPaymentResponse> {
  let verifyResult: VerifyPaymentResponse;

  if (isDemoMode()) {
    switch (request.method) {
      case 'bkash':
        verifyResult = verifyBkashDemoPayment(request);
        break;
      case 'nagad':
        verifyResult = verifyNagadDemoPayment(request);
        break;
      case 'sslcommerz':
        verifyResult = verifySSLCommerzDemoPayment(request);
        break;
      case 'bank_transfer':
        verifyResult = {
          success: true,
          status: 'completed',
          transactionId: request.gatewayPaymentId,
          amount: 0,
          currency: 'BDT',
          paidAt: new Date(),
          message: 'Bank transfer verified (demo mode)',
        };
        break;
      default:
        verifyResult = {
          success: false,
          status: 'failed',
          message: `Unsupported method: ${request.method}`,
        };
    }
  } else {
    switch (request.method) {
      case 'bkash':
        verifyResult = await verifyBkashPayment(request);
        break;
      case 'nagad':
        verifyResult = await verifyNagadPayment(request);
        break;
      case 'sslcommerz':
        verifyResult = await verifySSLCommerzPayment(request);
        break;
      case 'bank_transfer':
        // Bank transfer requires manual admin verification
        verifyResult = {
          success: false,
          status: 'pending',
          message: 'Bank transfer requires manual admin verification',
        };
        break;
      default:
        verifyResult = {
          success: false,
          status: 'failed',
          message: `Unsupported method: ${request.method}`,
        };
    }
  }

  // Update DB record
  const updateData: Record<string, unknown> = {
    status: mapPaymentStatus(verifyResult.status),
  };

  if (verifyResult.success) {
    updateData.verifiedAt = new Date();
  }

  if (verifyResult.rawData) {
    updateData.metadata = JSON.stringify(verifyResult.rawData);
  }

  await db.subscriptionPayment.update({
    where: { id: request.subscriptionPaymentId },
    data: updateData,
  });

  // If payment completed, activate subscription
  if (verifyResult.success && verifyResult.status === 'completed') {
    await activateSubscriptionAfterPayment(request.subscriptionPaymentId);
  }

  return verifyResult;
}

// --- Activate Subscription After Successful Payment ---

async function activateSubscriptionAfterPayment(paymentId: string): Promise<void> {
  try {
    const payment = await db.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) return;

    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    const tier = metadata.tier || 'professional';

    // Update or create subscription
    const existingSubscription = await db.subscription.findUnique({
      where: { tenantId: payment.tenantId },
    });

    if (existingSubscription) {
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          tier,
          status: 'active',
          currentPeriodStart: payment.periodStart,
          currentPeriodEnd: payment.periodEnd,
          lastPaymentAt: new Date(),
          nextPaymentAt: payment.periodEnd,
          paymentFailCount: 0,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          tenantId: payment.tenantId,
          tier,
          status: 'active',
          currentPeriodStart: payment.periodStart,
          currentPeriodEnd: payment.periodEnd,
          trialEndsAt: null,
          unitAmount: Math.round(payment.amount),
          currency: 'BDT',
          lastPaymentAt: new Date(),
          nextPaymentAt: payment.periodEnd,
        },
      });
    }

    // Update tenant status
    await db.tenant.update({
      where: { id: payment.tenantId },
      data: {
        status: 'active',
        plan: tier,
        pmType: payment.method,
      },
    });

    // Create invoice
    await db.invoice.create({
      data: {
        tenantId: payment.tenantId,
        number: metadata.invoiceNumber || generateInvoiceNumber(),
        status: 'paid',
        dueDate: payment.periodStart,
        paidAt: new Date(),
        subtotal: Math.round(payment.amount),
        total: Math.round(payment.amount),
        currency: 'BDT',
        lineItems: JSON.stringify([{
          description: `TrimedCast ${tier} Plan (${metadata.billingCycle || 'yearly'})`,
          amount: Math.round(payment.amount),
          quantity: 1,
          unit_amount: Math.round(payment.amount),
        }]),
        periodStart: payment.periodStart,
        periodEnd: payment.periodEnd,
        paymentMethod: payment.method,
        paymentRef: payment.transactionId,
      },
    });
  } catch (error) {
    console.error('[Payment] Subscription activation error:', error);
  }
}

// --- Map PaymentStatus to SubscriptionPayment status ---

function mapPaymentStatus(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    initiated: 'pending',
    pending: 'pending',
    processing: 'submitted',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
    expired: 'failed',
    refunded: 'refunded',
  };
  return map[status] || 'pending';
}

// --- Get Payment History ---

export async function getPaymentHistory(
  tenantId: string,
  page: number = 1,
  perPage: number = 20
) {
  const skip = (page - 1) * perPage;

  const [payments, total] = await Promise.all([
    db.subscriptionPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    db.subscriptionPayment.count({
      where: { tenantId },
    }),
  ]);

  return {
    payments,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// --- Get Tier Pricing in BDT ---

export function getBDTierPricing(tierSlug: string) {
  return BD_TIER_PRICING.find(t => t.slug === tierSlug) || BD_TIER_PRICING[1]; // Default to professional
}

// --- Get Bank Transfer Details ---

export function getBankTransferDetails(): BankTransferDetails[] {
  return BD_BANKS;
}

// --- Admin: Verify Bank Transfer ---

export async function adminVerifyBankTransfer(
  paymentId: string,
  adminUserId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const payment = await db.subscriptionPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  if (payment.method !== 'bank_transfer') {
    return { success: false, message: 'Not a bank transfer payment' };
  }

  if (payment.status === 'completed') {
    return { success: false, message: 'Payment already verified' };
  }

  // Update payment
  await db.subscriptionPayment.update({
    where: { id: paymentId },
    data: {
      status: 'completed',
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      notes: notes || 'Verified by admin',
    },
  });

  // Activate subscription
  await activateSubscriptionAfterPayment(paymentId);

  return { success: true, message: 'Bank transfer verified and subscription activated' };
}

// --- Admin: Mark Payment as Failed ---

export async function adminMarkPaymentFailed(
  paymentId: string,
  adminUserId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  await db.subscriptionPayment.update({
    where: { id: paymentId },
    data: {
      status: 'failed',
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      notes: reason || 'Marked as failed by admin',
    },
  });

  return { success: true, message: 'Payment marked as failed' };
}

// --- Export for IPN handling ---

export { handleSSLCommerzIPN };
