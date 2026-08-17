// ============================================
// TrimedCast — SSLCommerz Payment Gateway Client
// SSLCommerz API v4 (Hosted Checkout)
// Session 13: BD Payment Integration
// ============================================

import {
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type VerifyPaymentRequest,
  type VerifyPaymentResponse,
  type PaymentStatus,
  type SSLCommerzIPNPayload,
  type SSLCommerzValidationResponse,
  generateMerchantTrxId,
} from './types';

// --- SSLCommerz Configuration ---

interface SSLCommerzConfig {
  storeId: string;
  storePassword: string;
  isSandbox: boolean;
  baseUrl: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

function getSSLCommerzConfig(): SSLCommerzConfig {
  const isSandbox = process.env.SSLCOMMERZ_SANDBOX !== 'false'; // Default sandbox
  return {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    isSandbox,
    baseUrl: isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
    successUrl: process.env.SSLCOMMERZ_SUCCESS_URL || '',
    failUrl: process.env.SSLCOMMERZ_FAIL_URL || '',
    cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL || '',
    ipnUrl: process.env.SSLCOMMERZ_IPN_URL || '',
  };
}

// --- Initiate Payment (Hosted Checkout) ---

export async function createSSLCommerzPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  try {
    const config = getSSLCommerzConfig();
    const tranId = generateMerchantTrxId('SSL');

    if (!config.storeId || !config.storePassword) {
      return {
        success: false,
        paymentId: '',
        status: 'failed' as PaymentStatus,
        message: 'SSLCommerz credentials not configured',
      };
    }

    const successUrl = config.successUrl || (request.metadata?.successUrl as string) || '';
    const failUrl = config.failUrl || (request.metadata?.failUrl as string) || '';
    const cancelUrl = config.cancelUrl || (request.metadata?.cancelUrl as string) || '';
    const ipnUrl = config.ipnUrl || (request.metadata?.ipnUrl as string) || '';

    // Build the form data for SSLCommerz
    const formData = new URLSearchParams();
    formData.append('store_id', config.storeId);
    formData.append('store_passwd', config.storePassword);
    formData.append('total_amount', String(request.amount));
    formData.append('currency', 'BDT');
    formData.append('tran_id', tranId);
    formData.append('success_url', successUrl);
    formData.append('fail_url', failUrl);
    formData.append('cancel_url', cancelUrl);
    formData.append('ipn_url', ipnUrl);

    // Customer info
    formData.append('cus_name', request.customerInfo.name);
    formData.append('cus_email', request.customerInfo.email);
    formData.append('cus_add1', request.customerInfo.address || 'Dhaka');
    formData.append('cus_add2', '');
    formData.append('cus_city', 'Dhaka');
    formData.append('cus_state', 'Dhaka');
    formData.append('cus_postcode', '1205');
    formData.append('cus_country', 'Bangladesh');
    formData.append('cus_phone', request.customerInfo.phone);

    // Product info
    formData.append('shipping_method', 'NO');
    formData.append('product_name', `TrimedCast ${request.tier} Plan`);
    formData.append('product_category', 'SaaS Subscription');
    formData.append('product_profile', 'non-physical-goods');

    // Additional
    formData.append('value_a', request.tier);
    formData.append('value_b', request.billingCycle);
    formData.append('value_c', request.tenantId);
    formData.append('value_d', '');

    // EMI options
    formData.append('emi_option', '0');

    // Response from SSLCommerz
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SSLCommerz] Initiate payment failed:', error);
      return {
        success: false,
        paymentId: tranId,
        status: 'failed',
        message: `SSLCommerz initiation failed: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === 'SUCCESS' && data.GatewayPageURL) {
      return {
        success: true,
        paymentId: tranId,
        gatewayPaymentId: tranId,
        redirectUrl: data.GatewayPageURL,
        status: 'initiated',
        message: 'SSLCommerz payment initiated. Redirect user to GatewayPageURL.',
      };
    }

    return {
      success: false,
      paymentId: tranId,
      gatewayPaymentId: tranId,
      status: 'failed',
      message: data.failedreason || 'SSLCommerz initiation failed',
    };
  } catch (error) {
    console.error('[SSLCommerz] Create payment error:', error);
    return {
      success: false,
      paymentId: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// --- Validate Payment (Server-side validation after redirect) ---

export async function validateSSLCommerzPayment(
  tranId: string,
  amount: number
): Promise<SSLCommerzValidationResponse> {
  try {
    const config = getSSLCommerzConfig();
    const validationUrl = config.isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

    const params = new URLSearchParams({
      val_id: tranId,
      store_id: config.storeId,
      store_passwd: config.storePassword,
      format: 'json',
    });

    const response = await fetch(`${validationUrl}?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return {
        status: 'FAILED',
        tran_id: tranId,
        message: `Validation request failed: ${response.status}`,
      };
    }

    const data = await response.json();

    // Verify amount matches
    if (data.status === 'VALID' || data.status === 'VALIDATED') {
      const verifiedAmount = parseFloat(data.amount || data.currency_amount || '0');
      if (Math.abs(verifiedAmount - amount) > 0.01) {
        return {
          status: 'INVALID',
          tran_id: tranId,
          amount: String(verifiedAmount),
          message: `Amount mismatch: expected ${amount}, got ${verifiedAmount}`,
        };
      }
    }

    return {
      status: data.status,
      tran_id: data.tran_id || tranId,
      amount: data.amount || data.currency_amount,
      currency: data.currency_type || 'BDT',
      bank_tran_id: data.bank_tran_id,
      card_type: data.card_type,
    };
  } catch (error) {
    console.error('[SSLCommerz] Validate payment error:', error);
    return {
      status: 'FAILED',
      tran_id: tranId,
      message: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

// --- Handle IPN (Instant Payment Notification) ---

export function handleSSLCommerzIPN(
  payload: SSLCommerzIPNPayload
): VerifyPaymentResponse {
  const statusMap: Record<string, PaymentStatus> = {
    VALID: 'completed',
    VALIDATED: 'completed',
    INVALID: 'failed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    UNATTEMPTED: 'initiated',
    EXPIRED: 'expired',
  };

  const mappedStatus = statusMap[payload.status] || 'failed';

  return {
    success: mappedStatus === 'completed',
    status: mappedStatus,
    transactionId: payload.bank_tran_id || payload.tran_id,
    amount: parseFloat(payload.amount),
    currency: payload.currency_type || 'BDT',
    paidAt: mappedStatus === 'completed' ? new Date(payload.tran_date) : undefined,
    message: `SSLCommerz IPN: ${payload.status}`,
    rawData: payload as unknown as Record<string, unknown>,
  };
}

// --- Verify Payment (unified interface) ---

export async function verifySSLCommerzPayment(
  request: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  try {
    const amount = (request.additionalData?.amount as number) || 0;
    const validation = await validateSSLCommerzPayment(
      request.gatewayPaymentId,
      amount
    );

    const statusMap: Record<string, PaymentStatus> = {
      VALID: 'completed',
      VALIDATED: 'completed',
      INVALID: 'failed',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };

    const mappedStatus = statusMap[validation.status] || 'failed';

    return {
      success: mappedStatus === 'completed',
      status: mappedStatus,
      transactionId: validation.bank_tran_id || validation.tran_id,
      amount: validation.amount ? parseFloat(validation.amount) : undefined,
      currency: validation.currency,
      paidAt: mappedStatus === 'completed' ? new Date() : undefined,
      message: `SSLCommerz validation: ${validation.status}`,
      rawData: validation as unknown as Record<string, unknown>,
    };
  } catch (error) {
    console.error('[SSLCommerz] Verify payment error:', error);
    return {
      success: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// --- SSLCommerz Demo/Simulation ---

export function createSSLCommerzDemoPayment(
  request: CreatePaymentRequest
): CreatePaymentResponse {
  const demoTranId = `SSL_DEMO_${Date.now()}`;
  const successUrl = (request.metadata?.successUrl as string) || '/api/v1/payment/sslcommerz/success';

  return {
    success: true,
    paymentId: demoTranId,
    gatewayPaymentId: demoTranId,
    redirectUrl: `${successUrl}?tran_id=${demoTranId}&status=VALID&amount=${request.amount}&val_id=demo_val`,
    status: 'initiated',
    message: 'Demo SSLCommerz payment initiated (sandbox mode)',
  };
}

export function verifySSLCommerzDemoPayment(
  _request: VerifyPaymentRequest
): VerifyPaymentResponse {
  return {
    success: true,
    status: 'completed',
    transactionId: `BANK_DEMO_${Date.now()}`,
    amount: 100,
    currency: 'BDT',
    paidAt: new Date(),
    message: 'Demo SSLCommerz payment verified successfully',
  };
}
