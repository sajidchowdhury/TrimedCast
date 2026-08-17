// ============================================
// GET /api/v1/payment/pricing
// Get BD pricing tiers in BDT
// ============================================

import { apiSuccess } from '@/lib/api/response';
import { BD_TIER_PRICING, BD_BANKS, formatBDT } from '@/lib/payment/types';

export async function GET() {
  try {
    return apiSuccess({
      tiers: BD_TIER_PRICING.map(tier => ({
        slug: tier.slug,
        name: tier.name,
        name_bn: tier.nameBn,
        monthly_bdt: tier.monthlyBDT,
        monthly_display: formatBDT(tier.monthlyBDT),
        yearly_bdt: tier.yearlyBDT,
        yearly_display: formatBDT(tier.yearlyBDT),
        yearly_monthly_bdt: tier.yearlyMonthlyBDT,
        yearly_monthly_display: formatBDT(tier.yearlyMonthlyBDT),
        discount_pct: tier.discountPct,
        popular: tier.popular || false,
      })),
      banks: BD_BANKS.map(bank => ({
        bank_name: bank.bankName,
        branch_name: bank.branchName,
        account_name: bank.accountName,
        account_number: bank.accountNumber,
        routing_number: bank.routingNumber,
      })),
      currency: 'BDT',
      sandbox: process.env.BD_PAYMENT_SANDBOX !== 'false',
    });
  } catch (error) {
    console.error('[Payment/Pricing]', error);
    return apiSuccess({
      tiers: BD_TIER_PRICING,
      banks: BD_BANKS,
      currency: 'BDT',
    });
  }
}
