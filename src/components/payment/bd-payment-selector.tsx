'use client';

// ============================================
// BD Payment Method Selector
// bKash / Nagad / SSLCommerz / Bank Transfer
// Session 13: BD Payment Integration
// ============================================

import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Smartphone,
  CreditCard,
  Building2,
  Shield,
  Check,
  ArrowRight,
  Phone,
  User,
  MapPin,
} from 'lucide-react';

// --- Types ---

export type PaymentMethod = 'bkash' | 'nagad' | 'sslcommerz' | 'bank_transfer';

interface PaymentMethodInfo {
  method: PaymentMethod;
  name: string;
  nameBn: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  descriptionBn: string;
}

const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    method: 'bkash',
    name: 'bKash',
    nameBn: 'বিকাশ',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    description: 'Pay with your bKash mobile wallet',
    descriptionBn: 'বিকাশ মোবাইল ওয়ালেট থেকে পরিশোধ করুন',
  },
  {
    method: 'nagad',
    name: 'Nagad',
    nameBn: 'নগদ',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: 'Pay with your Nagad digital wallet',
    descriptionBn: 'নগদ ডিজিটাল ওয়ালেট থেকে পরিশোধ করুন',
  },
  {
    method: 'sslcommerz',
    name: 'SSLCommerz',
    nameBn: 'এসএলকমার্জ',
    icon: <CreditCard className="h-5 w-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    description: 'Card, mobile banking & net banking',
    descriptionBn: 'কার্ড, মোবাইল ব্যাংকিং ও নেট ব্যাংকিং',
  },
  {
    method: 'bank_transfer',
    name: 'Bank Transfer',
    nameBn: 'ব্যাংক ট্রান্সফার',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    description: 'Transfer to our bank account & upload receipt',
    descriptionBn: 'আমাদের ব্যাংক অ্যাকাউন্টে ট্রান্সফার করুন',
  },
];

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

interface BDPaymentSelectorProps {
  amount: number;
  currency?: string;
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  onSelect?: (method: PaymentMethod, customerInfo: CustomerInfo) => void;
  onBack?: () => void;
}

export function BDPaymentSelector({
  amount,
  currency = 'BDT',
  tier,
  billingCycle,
  onSelect,
  onBack,
}: BDPaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [step, setStep] = useState<'info' | 'method'>('info');

  const handleInfoNext = () => {
    if (customerInfo.name && customerInfo.phone) {
      setStep('method');
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (onSelect) {
      onSelect(method, customerInfo);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Payment Details
          </h3>
          <p className="text-sm text-muted-foreground">
            ৳{amount.toLocaleString('en-BD')} {currency} — {tier} ({billingCycle})
          </p>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
          <Shield className="h-3 w-3 mr-1" />
          Secure
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {step === 'info' ? (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Customer Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer Information</CardTitle>
                <CardDescription>Required for payment processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">
                    <User className="h-3.5 w-3.5 inline mr-1" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm">
                    <Phone className="h-3.5 w-3.5 inline mr-1" />
                    Phone Number <span className="text-red-500">*</span>
                    <span className="text-muted-foreground ml-1">(+880 1XXX-XXXXXX)</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+880 1XXX-XXXXXX"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm">
                    <MapPin className="h-3.5 w-3.5 inline mr-1" />
                    Address (optional)
                  </Label>
                  <Input
                    id="address"
                    placeholder="Dhaka, Bangladesh"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {onBack && (
                    <Button variant="outline" onClick={onBack} className="min-h-[44px]">
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleInfoNext}
                    disabled={!customerInfo.name || !customerInfo.phone}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]"
                  >
                    Continue to Payment
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('info')}
              className="text-muted-foreground"
            >
              ← Back to info
            </Button>

            {/* Payment Method Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((methodInfo, index) => (
                <motion.div
                  key={methodInfo.method}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                >
                  <button
                    onClick={() => handleMethodSelect(methodInfo.method)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 min-h-[44px]
                      ${selectedMethod === methodInfo.method
                        ? `${methodInfo.borderColor} ${methodInfo.bgColor} ring-2 ring-offset-2 ring-offset-background`
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${methodInfo.bgColor} ${methodInfo.color}`}>
                        {methodInfo.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{methodInfo.name}</span>
                          <span className="text-xs text-muted-foreground">{methodInfo.nameBn}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {methodInfo.description}
                        </p>
                      </div>
                      {selectedMethod === methodInfo.method && (
                        <Check className={`h-5 w-5 ${methodInfo.color} flex-shrink-0`} />
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Shield className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                All payments are processed securely. bKash & Nagad use tokenized checkout.
                SSLCommerz is PCI DSS compliant. Bank transfers verified by our team within 24 hours.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
