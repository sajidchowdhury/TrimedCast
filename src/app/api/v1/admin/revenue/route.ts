// ============================================
// GET /api/v1/admin/revenue
// Revenue metrics for SaaS dashboard
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { calculateRevenueMetrics } from '@/lib/api/billing';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for revenue metrics');
    }

    const revenueMetrics = await calculateRevenueMetrics();

    // Get additional revenue details
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [paidInvoices, pendingInvoices, totalInvoiceAmount] = await Promise.all([
      db.invoice.count({ where: { status: 'paid', paidAt: { gte: startOfMonth } } }),
      db.invoice.count({ where: { status: 'open' } }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: 'paid', paidAt: { gte: startOfMonth } },
      }),
    ]);

    return apiSuccess({
      mrr: revenueMetrics.mrr,
      arr: revenueMetrics.arr,
      churnRate: revenueMetrics.churnRate,
      avgRevenuePerTenant: revenueMetrics.avgRevenuePerTenant,
      activeTenants: revenueMetrics.activeTenants,
      trialTenants: revenueMetrics.trialTenants,
      suspendedTenants: revenueMetrics.suspendedTenants,
      cancelledTenants: revenueMetrics.cancelledTenants,
      tierDistribution: revenueMetrics.tierDistribution,
      thisMonth: {
        paidInvoices,
        pendingInvoices,
        totalRevenueCents: totalInvoiceAmount._sum.totalCents || 0,
        totalRevenueUsd: ((totalInvoiceAmount._sum.totalCents || 0) / 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error('[Admin/Revenue/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue metrics' },
      500
    );
  }
}
