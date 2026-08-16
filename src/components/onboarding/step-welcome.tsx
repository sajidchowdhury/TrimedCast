'use client';

// ============================================
// TrimedCast - Onboarding Step: Welcome
// Shows AC-ID, congratulates user,
// explains what's next
// ============================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useOnboardingStore } from '@/lib/onboarding/store';

export function StepWelcome() {
  const { acId, nextStep } = useOnboardingStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(acId);
    } catch {
      // fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-4xl">
          🎉
        </div>
      </motion.div>

      {/* Welcome text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-foreground">
          Welcome to TrimedCast!
        </h2>
        <p className="text-muted-foreground">
          ট্রিমডকাস্টে স্বাগতম!
        </p>
      </motion.div>

      {/* AC-ID Card */}
      {acId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3"
        >
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-center">
            Your Account ID
          </p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-2xl font-bold tracking-widest text-foreground font-mono">
              {acId}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-500/10"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Save this ID — all team members use it to login
          </p>
        </motion.div>
      )}

      {/* What's next */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-3"
      >
        <p className="text-sm font-medium text-foreground text-center">
          Let&apos;s get you set up in 4 quick steps:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: '🏪', text: 'Business Profile' },
            { icon: '📥', text: 'Download Templates' },
            { icon: '📊', text: 'Upload Your Data' },
            { icon: '🔮', text: 'See First Forecast' },
          ].map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-sm"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-muted-foreground">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <Button
          onClick={nextStep}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25"
          size="lg"
        >
          Let&apos;s Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
