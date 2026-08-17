// ============================================
// POST /api/v1/payment/bank-transfer/receipt
// Upload bank transfer receipt
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { paymentId, receiptUrl, bankName, transactionRef, transferDate } = body as {
      paymentId?: string;
      receiptUrl?: string;
      bankName?: string;
      transactionRef?: string;
      transferDate?: string;
    };

    if (!paymentId) {
      return validationError('paymentId', 'Payment ID is required');
    }

    // 3. Verify payment belongs to tenant
    const payment = await db.subscriptionPayment.findFirst({
      where: { id: paymentId, tenantId: context.tenantId },
    });

    if (!payment) {
      return validationError('paymentId', 'Payment not found');
    }

    if (payment.method !== 'bank_transfer') {
      return validationError('paymentId', 'Not a bank transfer payment');
    }

    // 4. Update payment with receipt info
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    await db.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        receiptUrl: receiptUrl || null,
        status: 'submitted', // Now submitted for admin review
        metadata: JSON.stringify({
          ...metadata,
          bankName: bankName || metadata.bankName,
          transactionRef: transactionRef || metadata.transactionRef,
          transferDate: transferDate || metadata.transferDate,
          receiptUploadedAt: new Date().toISOString(),
        }),
      },
    });

    return apiSuccess({
      receipt: {
        payment_id: paymentId,
        status: 'submitted',
        message: 'Receipt uploaded. Payment is pending admin verification.',
      },
    });
  } catch (error) {
    console.error('[Payment/BankTransfer/Receipt]', error);
    return internalError('Failed to upload receipt');
  }
}
