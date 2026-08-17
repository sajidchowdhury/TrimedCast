'use client';

// ============================================
// Nagad Payment Flow Component
// Session 13: BD Payment Integration
// ============================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  ExternalLink,
  Check,
  Loader2,
  Shield,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface NagadPaymentFlowProps {
  amount: number;
  paymentId: string;
  redirectUrl?: string;
  onVerify: (orderId: string) => void;
  isDemo?: boolean;
}

export function NagadPaymentFlow({
  amount,
  paymentId,
  redirectUrl,
  onVerify,
  isDemo = true,
}: NagadPaymentFlowProps) {
  const [step, setStep] = useState<'initiate' | 'paying' | 'verified'>('initiate');
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(300);

  const handleOpenNagad = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank', 'width=480,height=720');
    }
    setStep('paying');
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDemoComplete = () => {
    setStep('verified');
    onVerify(paymentId);
  };

  return (
    <div className="space-y-4">
      {/* Nagad Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-orange-500/10">
          <Smartphone className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Nagad Payment</h3>
          <p className="text-sm text-muted-foreground">নগদ পেমেন্ট</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'initiate' && (
          <motion.div
            key="initiate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-orange-500/20">
              <CardContent className="p-5 space-y-4">
                {/* Amount display */}
                <div className="text-center p-4 bg-orange-500/5 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ৳{amount.toLocaleString('en-BD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">BDT</p>
                </div>

                {/* Order ID */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Order Reference</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono">
                      {paymentId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="h-9"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {isDemo ? (
                  <Button
                    onClick={handleDemoComplete}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white min-h-[44px]"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Simulate Nagad Payment (Demo)
                  </Button>
                ) : (
                  <Button
                    onClick={handleOpenNagad}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Nagad Checkout
                  </Button>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Nagad digital payment — secure and instant
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'paying' && (
          <motion.div
            key="paying"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-orange-500/20">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">Waiting for Payment</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete your Nagad payment in the popup window
                  </p>
                </div>

                {countdown > 0 ? (
                  <div className="text-center">
                    <Badge variant="outline" className="text-muted-foreground">
                      Time remaining: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Payment session expired. Please try again.
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('verified');
                    onVerify(paymentId);
                  }}
                  className="w-full min-h-[44px]"
                >
                  I&apos;ve Completed Payment — Verify Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'verified' && (
          <motion.div
            key="verified"
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
                <h4 className="font-semibold text-lg mb-1">Payment Verified!</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  পেমেন্ট সফলভাবে যাচাই করা হয়েছে!
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
