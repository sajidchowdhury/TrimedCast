'use client';

// ============================================
// Billing Page — SaaS billing portal + BD Payment
// Session 13: BD Payment Integration
// ============================================

import { BillingPortal } from '@/components/billing/billing-portal';
import { BDPaymentPage } from '@/components/payment/bd-payment-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Crown, Receipt, Smartphone } from 'lucide-react';

export function BillingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-500" />
          Billing & Subscription
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, pay via bKash/Nagad/SSLCommerz, and track usage
        </p>
      </div>

      <Tabs defaultValue="bd-payment">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bd-payment" className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            BD Payment
          </TabsTrigger>
          <TabsTrigger value="saas-billing" className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            SaaS Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bd-payment" className="mt-4">
          <BDPaymentPage />
        </TabsContent>

        <TabsContent value="saas-billing" className="mt-4">
          <BillingPortal />
        </TabsContent>
      </Tabs>
    </div>
  );
}
