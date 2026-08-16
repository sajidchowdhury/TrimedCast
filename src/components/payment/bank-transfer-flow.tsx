'use client';

// ============================================
// Bank Transfer Payment Flow Component
// Shows bank details + receipt upload
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Copy,
  Check,
  Upload,
  Clock,
  Shield,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface BankDetails {
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
}

interface BankTransferFlowProps {
  amount: number;
  paymentId: string;
  banks: BankDetails[];
  onReceiptUpload: (data: {
    bankName: string;
    transactionRef: string;
    transferDate: string;
    receiptUrl?: string;
  }) => void;
  isDemo?: boolean;
}

export function BankTransferFlow({
  amount,
  paymentId,
  banks,
  onReceiptUpload,
  isDemo = true,
}: BankTransferFlowProps) {
  const [selectedBank, setSelectedBank] = useState(0);
  const [step, setStep] = useState<'details' | 'upload' | 'submitted'>('details');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    transactionRef: '',
    transferDate: '',
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const bank = banks[selectedBank] || banks[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-500/10">
          <Building2 className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Bank Transfer</h3>
          <p className="text-sm text-muted-foreground">ব্যাংক ট্রান্সফার</p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 ml-auto">
          <Clock className="h-3 w-3 mr-1" />
          24hr verification
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {step === 'details' && (
          <motion.div
            key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Amount */}
            <Card className="mb-4 border-slate-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Transfer Amount</p>
                <p className="text-3xl font-bold text-slate-700">
                  ৳{amount.toLocaleString('en-BD')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">BDT (exact amount required)</p>
              </CardContent>
            </Card>

            {/* Bank Selector */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {banks.map((b, i) => (
                <Button
                  key={i}
                  variant={selectedBank === i ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBank(i)}
                  className={selectedBank === i ? 'bg-slate-700 hover:bg-slate-800 text-white' : ''}
                >
                  {b.bankName}
                </Button>
              ))}
            </div>

            {/* Bank Details Card */}
            <Card className="border-slate-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bank.bankName}</CardTitle>
                <CardDescription>{bank.branchName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Account Name */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                      {bank.accountName}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(bank.accountName, 'name')} className="h-9">
                      {copiedField === 'name' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Account Number */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono font-bold">
                      {bank.accountNumber}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(bank.accountNumber, 'number')} className="h-9">
                      {copiedField === 'number' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Routing Number */}
                {bank.routingNumber && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Routing Number</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono">
                        {bank.routingNumber}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(bank.routingNumber!, 'routing')} className="h-9">
                        {copiedField === 'routing' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                  </div>
                  </div>
                )}

                <Separator />

                <Button
                  onClick={() => setStep('upload')}
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white min-h-[44px]"
                >
                  I&apos;ve Made the Transfer — Upload Receipt
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'upload' && (
          <motion.div
            key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-slate-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Payment Receipt
                </CardTitle>
                <CardDescription>
                  Upload your bank transfer receipt for verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g., Dutch-Bangla Bank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Transaction Reference / Slip No.</Label>
                  <Input
                    placeholder="e.g., TXN20250115001"
                    value={formData.transactionRef}
                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                    className="font-mono min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Transfer Date</Label>
                  <Input
                    type="date"
                    value={formData.transferDate}
                    onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>

                {/* File upload area */}
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center hover:border-muted-foreground/40 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drop receipt image/PDF here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, PDF up to 5MB
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Receipt will be verified by our team within 24 hours
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('details')}
                    className="min-h-[44px]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      setStep('submitted');
                      onReceiptUpload(formData);
                    }}
                    disabled={!formData.bankName || !formData.transactionRef}
                    className="flex-1 bg-slate-700 hover:bg-slate-800 text-white min-h-[44px]"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'submitted' && (
          <motion.div
            key="submitted" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-amber-500/20">
              <CardContent className="p-5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-amber-500" />
                  </div>
                </motion.div>
                <h4 className="font-semibold text-lg mb-1">Receipt Submitted!</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  রসিদ জমা দেওয়া হয়েছে! আমাদের টিম ২৪ ঘন্টার মধ্যে যাচাই করবে।
                </p>
                <p className="text-lg font-bold text-amber-600">
                  ৳{amount.toLocaleString('en-BD')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Payment ID: {paymentId}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
