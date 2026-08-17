'use client';

// ============================================
// SSLCommerz Payment Flow Component
// Hosted checkout redirect
// Session 13: BD Payment Integration
// ============================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  ExternalLink,
  Check,
  Loader2,
  Shield,
  Globe,
} from 'lucide-react';

interface SSLCommerzFlowProps {
  amount: number;
  paymentId: string;
  redirectUrl?: string;
  onSuccess: (tranId: string) => void;
  isDemo?: boolean;
}

export function SSLCommerzFlow({
  amount,
  paymentId,
  redirectUrl,
  onSuccess,
  isDemo = true,
}: SSLCommerzFlowProps) {
  const [step, setStep] = useState<'initiate' | 'redirecting' | 'success'>('initiate');

  const handleRedirect = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
    setStep('redirecting');
  };

  const handleDemoSuccess = () => {
    setStep('success');
    onSuccess(paymentId);
  };

  // SSLCommerz supported methods
  const supportedMethods = [
    'Visa', 'Mastercard', 'DBBL Nexus',
    'bKash (via SSL)', 'Nagad (via SSL)',
    'City Bank', 'BRAC Bank', 'EBL',
    'Mobile Banking', 'Internet Banking',
  ];

  return (
    <div className="space-y-4">
      {/* SSLCommerz Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/10">
          <CreditCard className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">SSLCommerz Checkout</h3>
          <p className="text-sm text-muted-foreground">এসএলকমার্জ চেকআউট</p>
        </div>
        <Badge variant="outline" className="text-teal-600 border-teal-500/30 bg-teal-500/10 ml-auto">
          <Globe className="h-3 w-3 mr-1" />
          Hosted
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {step === 'initiate' && (
          <motion.div
            key="initiate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-teal-500/20">
              <CardContent className="p-5 space-y-4">
                {/* Amount display */}
                <div className="text-center p-4 bg-teal-500/5 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
                  <p className="text-3xl font-bold text-teal-600">
                    ৳{amount.toLocaleString('en-BD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">BDT</p>
                </div>

                {/* Supported Methods */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Supported Payment Methods:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supportedMethods.map(method => (
                      <Badge
                        key={method}
                        variant="outline"
                        className="text-xs bg-muted/50"
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>

                {isDemo ? (
                  <Button
                    onClick={handleDemoSuccess}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white min-h-[44px]"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Simulate SSLCommerz Payment (Demo)
                  </Button>
                ) : (
                  <Button
                    onClick={handleRedirect}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open SSLCommerz Checkout
                  </Button>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  PCI DSS Level 1 certified — 256-bit SSL encryption
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'redirecting' && (
          <motion.div
            key="redirecting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-teal-500/20">
              <CardContent className="p-5 text-center">
                <Loader2 className="h-8 w-8 text-teal-500 animate-spin mx-auto mb-3" />
                <h4 className="font-semibold mb-1">Redirecting to SSLCommerz...</h4>
                <p className="text-sm text-muted-foreground">
                  Complete your payment on the SSLCommerz page. You&apos;ll be redirected back automatically.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-emerald-500/20">
              <CardContent className="p-5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                </motion.div>
                <h4 className="font-semibold text-lg mb-1">Payment Successful!</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  পেমেন্ট সফল হয়েছে!
                </p>
                <p className="text-2xl font-bold text-emerald-500">
                  ৳{amount.toLocaleString('en-BD')}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
