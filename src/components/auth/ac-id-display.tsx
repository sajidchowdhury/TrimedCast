'use client';

// ============================================
// TrimedCast - AC-ID Display Component
// Shows the generated AC-ID after account
// creation with copy-to-clipboard
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowRight } from 'lucide-react';

interface AcIdDisplayProps {
  acId: string;
  shopName: string;
  division: string;
  onContinue: () => void;
}

const DIVISION_NAMES: Record<string, string> = {
  dhaka: 'Dhaka',
  chittagong: 'Chittagong',
  sylhet: 'Sylhet',
  rajshahi: 'Rajshahi',
  khulna: 'Khulna',
  barishal: 'Barishal',
  rangpur: 'Rangpur',
  mymensingh: 'Mymensingh',
};

export function AcIdDisplay({
  acId,
  shopName,
  division,
  onContinue,
}: AcIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(acId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = acId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Success icon */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-8 h-8 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          </motion.svg>
        </motion.div>
      </div>

      {/* Welcome text */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-foreground">
          Welcome to TrimedCast! 🎉
        </h3>
        <p className="text-muted-foreground">
          আপনার অ্যাকাউন্ট তৈরি হয়েছে
        </p>
      </div>

      {/* AC-ID Card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4"
      >
        <div className="text-center">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
            Your Account ID
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            আপনার অ্যাকাউন্ট আইডি
          </p>

          {/* The AC-ID */}
          <div className="flex items-center justify-center gap-2">
            <code className="text-3xl font-bold tracking-widest text-foreground font-mono">
              {acId}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Account details */}
        <div className="border-t border-emerald-500/20 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shop</span>
            <span className="font-medium text-foreground">{shopName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Division</span>
            <span className="font-medium text-foreground">{DIVISION_NAMES[division] || division}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trial</span>
            <span className="font-medium text-emerald-500">14 days full access</span>
          </div>
        </div>
      </motion.div>

      {/* Important note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4"
      >
        <div className="flex gap-3">
          <div className="text-amber-500 text-lg">⚠️</div>
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">
              Save your Account ID!
            </p>
            <p className="text-muted-foreground">
              All team members will use <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{acId}</code> to login. 
              Write it down or take a screenshot.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button
          onClick={onContinue}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25"
          size="lg"
        >
          Continue to Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
