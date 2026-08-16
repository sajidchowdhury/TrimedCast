'use client';

// ============================================
// bKash Payment Flow Component
// Handles bKash tokenized checkout flow
// Session 13: BD Payment Integration
// ============================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Shield,
} from 'lucide-react';

interface BkashPaymentFlowProps {
  amount: number;
  paymentId: string;
  redirectUrl?: string;
  onTrxIdSubmit: (trxId: string) => void;
  onRedirect?: () => void;
  isDemo?: boolean;
}

export function BkashPaymentFlow({
  amount,
  paymentId,
  redirectUrl,
  onTrxIdSubmit,
  onRedirect,
  isDemo = true,
}: BkashPaymentFlowProps) {
  const [step, setStep] = useState<'initiate' | 'paying' | 'verify'>('initiate');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 min timeout

  useEffect(() => {
    if (step === 'paying') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText(paymentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenBkash = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank', 'width=480,height=720');
    }
    setStep('paying');
    onRedirect?.();
  };

  const handleDemoComplete = () => {
    setStep('verify');
    onTrxIdSubmit(`DEMO_TRX_${Date.now()}`);
  };

  return (
    <div className="space-y-4">
      {/* bKash Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-pink-500/10">
          <Smartphone className="h-6 w-6 text-pink-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">bKash Payment</h3>
          <p className="text-sm text-muted-foreground">বিকাশ পেমেন্ট</p>
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
            <Card className="border-pink-500/20">
              <CardContent className="p-5 space-y-4">
                {/* Amount display */}
                <div className="text-center p-4 bg-pink-500/5 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
                  <p className="text-3xl font-bold text-pink-600">
                    ৳{amount.toLocaleString('en-BD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">BDT</p>
                </div>

                {/* Payment ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Payment Reference</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono">
                      {paymentId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPaymentId}
                      className="h-9"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {isDemo ? (
                  <Button
                    onClick={handleDemoComplete}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white min-h-[44px]"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Simulate bKash Payment (Demo)
                  </Button>
                ) : (
                  <Button
                    onClick={handleOpenBkash}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open bKash Checkout
                  </Button>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Tokenized checkout — your bKash PIN is never shared
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
            <Card className="border-pink-500/20">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-pink-500 animate-spin mx-auto mb-3" />
                  <h4 className="font-semibold mb-1">Waiting for Payment</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete your bKash payment in the popup window
                  </p>
                </div>

                {/* Countdown */}
                {countdown > 0 && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-muted-foreground">
                      Time remaining: {formatCountdown(countdown)}
                    </Badge>
                  </div>
                )}

                {countdown === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Payment session expired. Please try again.
                  </div>
                )}

                {/* Manual TrxID entry */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    After completing payment, enter the Transaction ID (TrxID) from bKash:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 8K72AH5Z6L"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="font-mono min-h-[44px]"
                    />
                    <Button
                      onClick={() => {
                        setStep('verify');
                        onTrxIdSubmit(trxId);
                      }}
                      disabled={!trxId.trim()}
                      className="bg-pink-500 hover:bg-pink-600 text-white min-h-[44px]"
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
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
                  পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!
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
