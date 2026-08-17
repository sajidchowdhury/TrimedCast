'use client';

// ============================================
// BD Payment Page — Unified payment interface
// Integrates bKash, Nagad, SSLCommerz, Bank Transfer
// Session 13: BD Payment Integration
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Check,
  Sparkles,
  ArrowLeft,
  Clock,
  TrendingUp,
  Smartphone,
  Building2,
  Globe,
  Receipt,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Shield,
} from 'lucide-react';

import { BDPaymentSelector, type PaymentMethod } from './bd-payment-selector';
import { BkashPaymentFlow } from './bkash-flow';
import { NagadPaymentFlow } from './nagad-flow';
import { SSLCommerzFlow } from './sslcommerz-flow';
import { BankTransferFlow } from './bank-transfer-flow';

// --- Types ---

interface TierPricing {
  slug: string;
  name: string;
  nameBn: string;
  monthlyBDT: number;
  yearlyBDT: number;
  yearlyMonthlyBDT: number;
  discountPct: number;
  popular?: boolean;
}

interface BankInfo {
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transaction_id?: string;
  created_at: string;
  verified_at?: string;
}

// --- Demo Data ---

const DEMO_TIERS: TierPricing[] = [
  {
    slug: 'starter',
    name: 'Starter',
    nameBn: 'স্টার্টার',
    monthlyBDT: 2400,
    yearlyBDT: 24000,
    yearlyMonthlyBDT: 2000,
    discountPct: 17,
  },
  {
    slug: 'professional',
    name: 'Professional',
    nameBn: 'প্রফেশনাল',
    monthlyBDT: 6900,
    yearlyBDT: 69000,
    yearlyMonthlyBDT: 5750,
    discountPct: 17,
    popular: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    nameBn: 'এন্টারপ্রাইজ',
    monthlyBDT: 17400,
    yearlyBDT: 174000,
    yearlyMonthlyBDT: 14500,
    discountPct: 17,
  },
];

const DEMO_BANKS: BankInfo[] = [
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
];

const DEMO_HISTORY: PaymentRecord[] = [
  {
    id: 'pay_demo_1',
    amount: 69000,
    currency: 'BDT',
    method: 'bkash',
    status: 'completed',
    transaction_id: '8K72AH5Z6L',
    created_at: '2025-01-15T10:30:00Z',
    verified_at: '2025-01-15T10:31:00Z',
  },
  {
    id: 'pay_demo_2',
    amount: 69000,
    currency: 'BDT',
    method: 'bank_transfer',
    status: 'submitted',
    transaction_id: 'TXN20250201001',
    created_at: '2025-02-01T09:00:00Z',
  },
];

// --- Main Component ---

export function BDPaymentPage() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [selectedTier, setSelectedTier] = useState<string>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [paymentPhase, setPaymentPhase] = useState<'select' | 'pay'>('select');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'pending' | null>(null);

  const selectedTierData = DEMO_TIERS.find(t => t.slug === selectedTier) || DEMO_TIERS[1];
  const amount = billingCycle === 'yearly' ? selectedTierData.yearlyBDT : selectedTierData.monthlyBDT;

  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentPhase('pay');
  }, []);

  const handlePaymentComplete = useCallback(() => {
    setPaymentProcessing(false);
    setPaymentResult('success');
  }, []);

  const methodIcon = (method: string) => {
    switch (method) {
      case 'bkash': return <Smartphone className="h-4 w-4 text-pink-600" />;
      case 'nagad': return <Smartphone className="h-4 w-4 text-orange-600" />;
      case 'sslcommerz': return <Globe className="h-4 w-4 text-teal-600" />;
      case 'bank_transfer': return <Building2 className="h-4 w-4 text-slate-600" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const methodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bkash: 'bKash',
      nagad: 'Nagad',
      sslcommerz: 'SSLCommerz',
      bank_transfer: 'Bank Transfer',
    };
    return labels[method] || method;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'submitted':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Payment & Subscription
          </h2>
          <p className="text-sm text-muted-foreground">
            পেমেন্ট ও সাবস্ক্রিপশন — Pay securely via bKash, Nagad, SSLCommerz, or Bank Transfer
          </p>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
          <Shield className="h-3 w-3 mr-1" />
          BDT Pricing
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="pay">Pay Now</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ---- Pricing Tab ---- */}
        <TabsContent value="pricing" className="mt-5">
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors
                ${billingCycle === 'yearly' ? 'bg-emerald-500' : 'bg-muted'}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform
                  ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'}`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                Save 17%
              </Badge>
            )}
          </div>

          {/* Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEMO_TIERS.map((tier, index) => {
              const isSelected = selectedTier === tier.slug;
              const price = billingCycle === 'yearly' ? tier.yearlyBDT : tier.monthlyBDT;

              return (
                <motion.div
                  key={tier.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Card
                    className={`relative cursor-pointer transition-all duration-200
                      ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-muted-foreground/30'}
                      ${tier.popular ? 'border-t-4 border-t-emerald-500' : ''}
                    `}
                    onClick={() => setSelectedTier(tier.slug)}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                      </div>
                    )}

                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{tier.name}</h3>
                          <p className="text-xs text-muted-foreground">{tier.nameBn}</p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>

                      <div>
                        <span className="text-2xl font-bold">
                          ৳{price.toLocaleString('en-BD')}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>

                      {billingCycle === 'yearly' && (
                        <p className="text-xs text-emerald-600">
                          ৳{tier.yearlyMonthlyBDT.toLocaleString('en-BD')}/mo equivalent
                        </p>
                      )}

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTier(tier.slug);
                          setActiveTab('pay');
                        }}
                        className={`w-full min-h-[44px] ${
                          isSelected
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}
                      >
                        Select Plan
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ---- Pay Now Tab ---- */}
        <TabsContent value="pay" className="mt-5">
          <AnimatePresence mode="wait">
            {paymentResult === 'success' ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
                <p className="text-muted-foreground mb-4">
                  পেমেন্ট সফল! আপনার সাবস্ক্রিপশন এখন সক্রিয়।
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentResult(null);
                    setPaymentPhase('select');
                    setSelectedMethod(null);
                    setActiveTab('history');
                  }}
                >
                  View Payment History
                </Button>
              </motion.div>
            ) : (
              <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Selected plan summary */}
                <Card className="mb-5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Selected Plan</p>
                        <p className="font-semibold">{selectedTierData.name} — {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold text-emerald-500">
                          ৳{amount.toLocaleString('en-BD')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {paymentPhase === 'select' && (
                  <BDPaymentSelector
                    amount={amount}
                    tier={selectedTier}
                    billingCycle={billingCycle}
                    onSelect={handleMethodSelect}
                    onBack={() => setActiveTab('pricing')}
                  />
                )}

                {paymentPhase === 'pay' && selectedMethod && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPaymentPhase('select');
                        setSelectedMethod(null);
                      }}
                      className="text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Change payment method
                    </Button>

                    {selectedMethod === 'bkash' && (
                      <BkashPaymentFlow
                        amount={amount}
                        paymentId={`BK_${Date.now()}`}
                        onTrxIdSubmit={handlePaymentComplete}
                        isDemo
                      />
                    )}

                    {selectedMethod === 'nagad' && (
                      <NagadPaymentFlow
                        amount={amount}
                        paymentId={`NG_${Date.now()}`}
                        onVerify={handlePaymentComplete}
                        isDemo
                      />
                    )}

                    {selectedMethod === 'sslcommerz' && (
                      <SSLCommerzFlow
                        amount={amount}
                        paymentId={`SSL_${Date.now()}`}
                        onSuccess={handlePaymentComplete}
                        isDemo
                      />
                    )}

                    {selectedMethod === 'bank_transfer' && (
                      <BankTransferFlow
                        amount={amount}
                        paymentId={`BT_${Date.now()}`}
                        banks={DEMO_BANKS}
                        onReceiptUpload={() => {
                          setPaymentResult('pending');
                        }}
                        isDemo
                      />
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ---- History Tab ---- */}
        <TabsContent value="history" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Payment History
              </CardTitle>
              <CardDescription>পেমেন্ট ইতিহাস</CardDescription>
            </CardHeader>
            <CardContent>
              {DEMO_HISTORY.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payments yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEMO_HISTORY.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {new Date(payment.created_at).toLocaleDateString('en-BD', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {methodIcon(payment.method)}
                              <span className="text-sm">{methodLabel(payment.method)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            ৳{payment.amount.toLocaleString('en-BD')}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {payment.transaction_id || '—'}
                          </TableCell>
                          <TableCell>
                            {statusBadge(payment.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
