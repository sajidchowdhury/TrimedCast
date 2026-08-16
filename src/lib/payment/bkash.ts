// ============================================
// TrimedCast — bKash Payment Gateway Client
// bKash Payment API v1.2 (Tokenized Checkout)
// Session 13: BD Payment Integration
// ============================================

import {
  type BDPaymentMethod,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type VerifyPaymentRequest,
  type VerifyPaymentResponse,
  type PaymentStatus,
  type BkashCreatePaymentResponse,
  type BkashExecutePaymentResponse,
  type BkashQueryPaymentResponse,
  generateMerchantTrxId,
} from './types';

// --- bKash Configuration ---

interface BkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  baseUrl: string;  // https://checkout.pay.bka.sh/v1.2 (sandbox: sandbox)
  callbackUrl: string;
}

function getBkashConfig(): BkashConfig {
  const isSandbox = process.env.BKASH_SANDBOX === 'true';
  return {
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
    baseUrl: isSandbox
      ? 'https://checkout.sandbox.bka.sh/v1.2'
      : 'https://checkout.pay.bka.sh/v1.2',
    callbackUrl: process.env.BKASH_CALLBACK_URL || '',
  };
}

// --- Token Management ---

let cachedToken: { token: string; expiresAt: number } | null = null;

async function grantToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const config = getBkashConfig();

  if (!config.appKey || !config.appSecret) {
    throw new Error('bKash credentials not configured');
  }

  const response = await fetch(`${config.baseUrl}/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[bKash] Token grant failed:', error);
    throw new Error(`bKash token grant failed: ${response.status}`);
  }

  const data = await response.json();

  cachedToken = {
    token: data.id_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return data.id_token;
}

// --- Create Payment ---

export async function createBkashPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  try {
    const token = await grantToken();
    const config = getBkashConfig();
    const merchantInvoiceNumber = generateMerchantTrxId('BK');

    const payload = {
      mode: '0011',  // Checkout (both pay & auth & capture)
      payerReference: request.customerInfo.phone,
      callbackURL: config.callbackUrl || request.metadata?.callbackUrl as string || '',
      amount: String(request.amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber,
    };

    const response = await fetch(`${config.baseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-App-Key': config.appKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[bKash] Create payment failed:', error);
      return {
        success: false,
        paymentId: '',
        status: 'failed' as PaymentStatus,
        message: `bKash payment creation failed: ${response.status}`,
      };
    }

    const data: BkashCreatePaymentResponse = await response.json();

    if (data.transactionStatus === 'Initiated' && data.bKashURL) {
      return {
        success: true,
        paymentId: data.paymentID,
        gatewayPaymentId: data.paymentID,
        redirectUrl: data.bKashURL,
        status: 'initiated',
        message: 'bKash payment initiated. Redirect user to bKashURL.',
      };
    }

    return {
      success: false,
      paymentId: data.paymentID || '',
      gatewayPaymentId: data.paymentID,
      status: 'failed',
      message: data.transactionStatus || 'Unknown bKash status',
    };
  } catch (error) {
    console.error('[bKash] Create payment error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// --- Execute Payment (after user returns from bKash) ---

export async function executeBkashPayment(
  paymentID: string
): Promise<BkashExecutePaymentResponse | null> {
  try {
    const token = await grantToken();
    const config = getBkashConfig();

    const response = await fetch(`${config.baseUrl}/payment/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-App-Key': config.appKey,
      },
      body: JSON.stringify({ paymentID }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[bKash] Execute payment failed:', error);
      return null;
    }

    const data: BkashExecutePaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[bKash] Execute payment error:', error);
    return null;
  }
}

// --- Query Payment Status ---

export async function queryBkashPayment(
  paymentID: string
): Promise<BkashQueryPaymentResponse | null> {
  try {
    const token = await grantToken();
    const config = getBkashConfig();

    const response = await fetch(`${config.baseUrl}/payment/query/${paymentID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: token,
        'X-App-Key': config.appKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[bKash] Query payment failed:', error);
      return null;
    }

    const data: BkashQueryPaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[bKash] Query payment error:', error);
    return null;
  }
}

// --- Verify Payment (unified interface) ---

export async function verifyBkashPayment(
  request: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const paymentID = request.gatewayPaymentId;

    // First try to execute (if not already executed)
    const executeResult = await executeBkashPayment(paymentID);

    if (executeResult && executeResult.transactionStatus === 'Completed') {
      return {
        success: true,
        status: 'completed',
        transactionId: executeResult.trxID,
        amount: parseFloat(executeResult.amount),
        currency: executeResult.currency,
        paidAt: new Date(executeResult.updateTime),
        message: 'Payment completed successfully',
        rawData: executeResult as unknown as Record<string, unknown>,
      };
    }

    // If execute didn't complete, query the status
    const queryResult = await queryBkashPayment(paymentID);

    if (!queryResult) {
      return {
        success: false,
        status: 'failed',
        message: 'Could not query payment status',
      };
    }

    const statusMap: Record<string, PaymentStatus> = {
      Completed: 'completed',
      Pending: 'pending',
      Processing: 'processing',
      Failed: 'failed',
      Cancelled: 'cancelled',
      Expired: 'expired',
      Initiated: 'initiated',
    };

    const mappedStatus = statusMap[queryResult.transactionStatus] || 'failed';

    return {
      success: mappedStatus === 'completed',
      status: mappedStatus,
      transactionId: queryResult.trxID,
      amount: parseFloat(queryResult.amount),
      currency: queryResult.currency,
      message: `Payment status: ${queryResult.transactionStatus}`,
      rawData: queryResult as unknown as Record<string, unknown>,
    };
  } catch (error) {
    console.error('[bKash] Verify payment error:', error);
    return {
      success: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// --- bKash Demo/Simulation (for sandbox mode) ---

export function createBkashDemoPayment(
  request: CreatePaymentRequest
): CreatePaymentResponse {
  const demoPaymentId = `BK_DEMO_${Date.now()}`;
  const callbackUrl = (request.metadata?.callbackUrl as string) || '/api/v1/payment/bkash/callback';

  return {
    success: true,
    paymentId: demoPaymentId,
    gatewayPaymentId: demoPaymentId,
    redirectUrl: `${callbackUrl}?paymentID=${demoPaymentId}&status=success&amount=${request.amount}`,
    status: 'initiated',
    message: 'Demo bKash payment initiated (sandbox mode)',
  };
}

export function verifyBkashDemoPayment(
  request: VerifyPaymentRequest
): VerifyPaymentResponse {
  // In demo mode, always return success
  return {
    success: true,
    status: 'completed',
    transactionId: `TRX_DEMO_${Date.now()}`,
    amount: 100, // Demo amount
    currency: 'BDT',
    paidAt: new Date(),
    message: 'Demo payment verified successfully',
  };
}
