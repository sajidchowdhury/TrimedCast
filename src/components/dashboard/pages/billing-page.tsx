'use client';

// ============================================
// Billing Page — SaaS billing portal
// ============================================

import { BillingPortal } from '@/components/billing/billing-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Crown, Receipt, TrendingUp } from 'lucide-react';

export function BillingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-violet-500" />
          Billing & Subscription
        </h2>
        <p className="text-sm text-muted-foreground">Manage your subscription, view invoices, and track usage</p>
      </div>

      <BillingPortal />
    </div>
  );
}
