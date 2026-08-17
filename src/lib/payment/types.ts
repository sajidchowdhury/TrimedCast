// ============================================
// TrimedCast — BD Payment Gateway Types
// bKash, Nagad, SSLCommerz + Bank Transfer
// Session 13: BD Payment Integration
// ============================================

// --- Payment Method Types ---

export type BDPaymentMethod = 'bkash' | 'nagad' | 'sslcommerz' | 'bank_transfer';

export const BD_PAYMENT_METHOD_LABELS: Record<BDPaymentMethod, { en: string; bn: string }> = {
  bkash: { en: 'bKash', bn: 'বিকাশ' },
  nagad: { en: 'Nagad', bn: 'নগদ' },
  sslcommerz: { en: 'SSLCommerz', bn: 'এসএলকমার্জ' },
  bank_transfer: { en: 'Bank Transfer', bn: 'ব্যাংক ট্রান্সফার' },
};

export const BD_PAYMENT_METHOD_COLORS: Record<BDPaymentMethod, { bg: string; text: string; border: string }> = {
  bkash: { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' },
  nagad: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  sslcommerz: { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/30' },
  bank_transfer: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/30' },
};

// --- Payment Creation ---

export interface CreatePaymentRequest {
  tenantId: string;
  amount: number;         // Amount in BDT
  method: BDPaymentMethod;
  tier: string;           // starter, professional, enterprise
  billingCycle: 'monthly' | 'yearly';
  customerInfo: {
    name: string;
    email: string;
    phone: string;        // BD phone: +880 1XXX-XXXXXX
    address?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentId: string;      // Our internal payment ID
  gatewayPaymentId?: string;  // Gateway-specific ID (bKash paymentID, Nagad orderId, SSLCommerz tranId)
  redirectUrl?: string;   // URL to redirect user for payment completion
  callbackUrl?: string;   // URL for gateway to call back
  status: PaymentStatus;
  message?: string;
}

// --- Payment Verification ---

export interface VerifyPaymentRequest {
  paymentId: string;           // Our internal payment ID
  gatewayPaymentId: string;    // Gateway-specific ID
  method: BDPaymentMethod;
  additionalData?: Record<string, unknown>; // Method-specific data (e.g., bKash TrxID)
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: PaymentStatus;
  transactionId?: string;       // Gateway transaction reference
  amount?: number;             // Verified amount in BDT
  currency?: string;
  paidAt?: Date;
  message?: string;
  rawData?: Record<string, unknown>;  // Raw gateway response for audit
}

// --- Payment Status ---

export type PaymentStatus =
  | 'initiated'    // Payment created, awaiting user action
  | 'pending'      // User submitted, awaiting verification
  | 'processing'   // Being processed by gateway
  | 'completed'    // Successfully completed
  | 'failed'       // Payment failed
  | 'cancelled'    // User cancelled
  | 'expired'      // Payment session expired
  | 'refunded';    // Payment refunded

// --- bKash Specific Types ---

export interface BkashTokenResponse {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface BkashCreatePaymentResponse {
  paymentID: string;
  createTime: string;
  orgLogo: string;
  orgName: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  bKashURL?: string;  // URL to redirect user
}

export interface BkashExecutePaymentResponse {
  paymentID: string;
  createTime: string;
  updateTime: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

export interface BkashQueryPaymentResponse {
  paymentID: string;
  createTime: string;
  updateTime: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

// --- Nagad Specific Types ---

export interface NagadInitializeResponse {
  orderId: string;
  paymentRefId?: string;
  callBackUrl?: string;
  merchantCallbackUrl?: string;
  status?: string;
}

export interface NagadVerifyResponse {
  orderStatus: string;
  paymentRefId?: string;
  trxId?: string;
  amount?: string;
  bankTrxId?: string;
  issuerPaymentRef?: string;
  mobileNo?: string;
  message?: string;
}

// --- SSLCommerz Specific Types ---

export interface SSLCommerzInitResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;  // Redirect URL for hosted checkout
  storeBanner?: string;
  emitCustom?: string;
}

export interface SSLCommerzIPNPayload {
  status: string;
  tran_id: string;
  val_id: string;
  amount: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  bank_tran_id: string;
  card_type: string;
  card_no: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  store_id: string;
  verify_sign: string;
  verify_key: string;
  tran_date: string;
  currency: string;
  pay_status: string;
  emi_instrement?: string;
  emi_issuer?: string;
  emi_month?: string;
}

export interface SSLCommerzValidationResponse {
  status: 'VALID' | 'VALIDATED' | 'INVALID' | 'FAILED' | 'CANCELLED';
  tran_id?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
}

// --- Bank Transfer Specific ---

export interface BankTransferDetails {
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
}

// Supported banks in BD
export const BD_BANKS: BankTransferDetails[] = [
  {
    bankName: 'Dutch-Bangla Bank Ltd',
    branchName: 'Dhanmondi Branch',
    accountName: 'TrimedCast Technologies Ltd',
    accountNumber: '123.456.789',
    routingNumber: '015260152',
  },
  {
    bankName: 'BRAC Bank Ltd',
    branchName: 'Gulshan Branch',
    accountName: 'TrimedCast Technologies Ltd',
    accountNumber: '987.654.321',
    routingNumber: '040110401',
  },
  {
    bankName: 'City Bank Ltd',
    branchName: 'Motijheel Branch',
    accountName: 'TrimedCast Technologies Ltd',
    accountNumber: '456.789.012',
    routingNumber: '025260252',
  },
];

// --- BD Pricing (BDT) ---

export interface BDTierPricing {
  slug: string;
  name: string;
  nameBn: string;
  monthlyBDT: number;
  yearlyBDT: number;
  yearlyMonthlyBDT: number;  // Monthly equivalent when paying yearly
  discountPct: number;       // Discount for yearly vs monthly
  popular?: boolean;
}

export const BD_TIER_PRICING: BDTierPricing[] = [
  {
    slug: 'starter',
    name: 'Starter',
    nameBn: 'স্টার্টার',
    monthlyBDT: 2400,      // ~$29/mo
    yearlyBDT: 24000,       // ~$290/yr
    yearlyMonthlyBDT: 2000, // ৳2,000/mo when yearly
    discountPct: 17,
  },
  {
    slug: 'professional',
    name: 'Professional',
    nameBn: 'প্রফেশনাল',
    monthlyBDT: 6900,       // ~$79/mo
    yearlyBDT: 69000,       // ~$690/yr
    yearlyMonthlyBDT: 5750, // ৳5,750/mo when yearly
    discountPct: 17,
    popular: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    nameBn: 'এন্টারপ্রাইজ',
    monthlyBDT: 17400,      // ~$199/mo
    yearlyBDT: 174000,      // ~$1,740/yr
    yearlyMonthlyBDT: 14500, // ৳14,500/mo when yearly
    discountPct: 17,
  },
];

// Format BDT amount with ৳ symbol
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

// Validate BD phone number (+880 1XXX-XXXXXX)
export function validateBDPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  // +8801XXXXXXXXX (13 digits with +880) or 01XXXXXXXXX (11 digits)
  return /^(\+880|880)?1[3-9]\d{8}$/.test(cleaned);
}

// Generate unique invoice number
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

// Generate unique merchant transaction ID
export function generateMerchantTrxId(prefix: string = 'TC'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
