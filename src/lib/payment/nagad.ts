// ============================================
// TrimedCast — Nagad Payment Gateway Client
// Nagad Merchant Payment API v2
// Session 13: BD Payment Integration
// ============================================

import {
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type VerifyPaymentRequest,
  type VerifyPaymentResponse,
  type PaymentStatus,
  generateMerchantTrxId,
} from './types';

// --- Nagad Configuration ---

interface NagadConfig {
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
  baseUrl: string;  // https://api.mynagad.com (sandbox: https://api.mynagad.com:9201)
  callbackUrl: string;
}

function getNagadConfig(): NagadConfig {
  const isSandbox = process.env.NAGAD_SANDBOX === 'true';
  return {
    merchantId: process.env.NAGAD_MERCHANT_ID || '',
    merchantNumber: process.env.NAGAD_MERCHANT_NUMBER || '',
    publicKey: process.env.NAGAD_PUBLIC_KEY || '',
    privateKey: process.env.NAGAD_PRIVATE_KEY || '',
    baseUrl: isSandbox
      ? 'https://api.mynagad.com:9201'
      : 'https://api.mynagad.com',
    callbackUrl: process.env.NAGAD_CALLBACK_URL || '',
  };
}

// --- Encryption Helpers ---

// Simplified RSA encryption for Nagad payload signing
// In production, use proper RSA-SHA256 with the Nagad public key
function encryptPayload(payload: string, _publicKey: string): string {
  // In a real implementation, this would use Node.js crypto module
  // to RSA encrypt the payload with Nagad's public key
  // For now, base64 encode (production must use proper encryption)
  return Buffer.from(payload).toString('base64');
}

function generateSignature(payload: string, _privateKey: string): string {
  // In a real implementation, this would use RSA-SHA256 signing
  // For now, use Node.js crypto with a proper import
  try {
    const crypto = globalThis.process?.versions?.node
      ? /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        require('crypto')
      : null;
    if (crypto) {
      return crypto
        .createHmac('sha256', _privateKey || 'nagad-secret')
        .update(payload)
        .digest('hex');
    }
  } catch {
    // Fallback for environments without crypto
  }
  // Simple hash fallback
  const str = payload + (_privateKey || 'nagad-secret');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

// --- Initialize Payment ---

export async function createNagadPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  try {
    const config = getNagadConfig();
    const orderId = generateMerchantTrxId('NG');

    if (!config.merchantId || !config.merchantNumber) {
      return {
        success: false,
        paymentId: '',
        status: 'failed' as PaymentStatus,
        message: 'Nagad credentials not configured',
      };
    }

    const merchantCallbackUrl = config.callbackUrl || (request.metadata?.callbackUrl as string) || '';

    // Step 1: Initialize payment
    const initPayload = {
      merchantId: config.merchantId,
      orderId,
      amount: request.amount,
      currencyCode: '050',  // BDT ISO 4217 numeric code
      challenge: Date.now().toString(),
    };

    const encryptedPayload = encryptPayload(
      JSON.stringify(initPayload),
      config.publicKey
    );

    const signature = generateSignature(
      JSON.stringify(initPayload),
      config.privateKey
    );

    const response = await fetch(
      `${config.baseUrl}/api/public/digital-payment/initialize/${config.merchantId}/${orderId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KM-ApiClient': config.merchantId,
        },
        body: JSON.stringify({
          sensitiveData: encryptedPayload,
          signature,
          merchantCallbackUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Nagad] Initialize payment failed:', error);
      return {
        success: false,
        paymentId: orderId,
        status: 'failed',
        message: `Nagad payment initialization failed: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === '6' || data.callBackUrl) {
      // Status 6 = INITIALIZED in Nagad
      return {
        success: true,
        paymentId: orderId,
        gatewayPaymentId: data.paymentReferenceId || data.orderId || orderId,
        redirectUrl: data.callBackUrl,
        callbackUrl: merchantCallbackUrl,
        status: 'initiated',
        message: 'Nagad payment initialized. Redirect user to callBackUrl.',
      };
    }

    return {
      success: false,
      paymentId: orderId,
      gatewayPaymentId: data.orderId,
      status: 'failed',
      message: data.message || 'Unknown Nagad initialization status',
    };
  } catch (error) {
    console.error('[Nagad] Create payment error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// --- Verify Payment ---

export async function verifyNagadPayment(
  request: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const config = getNagadConfig();
    const orderId = request.gatewayPaymentId;

    const response = await fetch(
      `${config.baseUrl}/api/public/digital-payment/verify/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-KM-ApiClient': config.merchantId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Nagad] Verify payment failed:', error);
      return {
        success: false,
        status: 'failed',
        message: `Nagad verification failed: ${response.status}`,
      };
    }

    const data = await response.json();

    // Nagad status codes:
    // 0 = Cancelled, 2 = Expired, 5 = Completed, 6 = Initiated
    const statusMap: Record<string, PaymentStatus> = {
      '5': 'completed',
      '6': 'initiated',
      '0': 'cancelled',
      '2': 'expired',
      '4': 'processing',
    };

    const mappedStatus = statusMap[data.orderStatus] || 'failed';

    return {
      success: mappedStatus === 'completed',
      status: mappedStatus,
      transactionId: data.paymentReferenceId || data.trxId,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      currency: 'BDT',
      paidAt: data.orderStatus === '5' ? new Date() : undefined,
      message: `Nagad payment status: ${data.orderStatus}`,
      rawData: data as Record<string, unknown>,
    };
  } catch (error) {
    console.error('[Nagad] Verify payment error:', error);
    return {
      success: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// --- Nagad Demo/Simulation (for sandbox mode) ---

export function createNagadDemoPayment(
  request: CreatePaymentRequest
): CreatePaymentResponse {
  const demoOrderId = `NG_DEMO_${Date.now()}`;
  const callbackUrl = (request.metadata?.callbackUrl as string) || '/api/v1/payment/nagad/callback';

  return {
    success: true,
    paymentId: demoOrderId,
    gatewayPaymentId: demoOrderId,
    redirectUrl: `${callbackUrl}?orderId=${demoOrderId}&status=5&amount=${request.amount}`,
    status: 'initiated',
    message: 'Demo Nagad payment initiated (sandbox mode)',
  };
}

export function verifyNagadDemoPayment(
  _request: VerifyPaymentRequest
): VerifyPaymentResponse {
  return {
    success: true,
    status: 'completed',
    transactionId: `TRX_NG_DEMO_${Date.now()}`,
    amount: 100,
    currency: 'BDT',
    paidAt: new Date(),
    message: 'Demo Nagad payment verified successfully',
  };
}
