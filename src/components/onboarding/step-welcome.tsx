'use client';

// ============================================
// TrimedCast - Onboarding Step: Welcome
// Shows AC-ID, congratulates user,
// explains what's next with confetti-like
// celebration animation
// ============================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useOnboardingStore } from '@/lib/onboarding/store';

// Floating confetti particles
function ConfettiParticle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [-20, -80, -140],
        x: [0, x * 20, x * 40],
        rotate: [0, x * 180, x * 360],
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
      className="absolute rounded-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: '50%',
        top: '40%',
      }}
    />
  );
}

const CONFETTI_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#fbbf24'];
const CONFETTI_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  delay: 0.2 + i * 0.08,
  x: (i % 2 === 0 ? 1 : -1) * (1 + (i % 4)),
  size: 4 + (i % 3) * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

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
      {/* Celebration with confetti */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="flex justify-center relative"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-4xl sm:text-5xl">
          🎉
        </div>
        {/* Confetti particles */}
        {CONFETTI_ITEMS.map((item, i) => (
          <ConfettiParticle key={i} {...item} />
        ))}
      </motion.div>

      {/* Welcome text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome to TrimedCast!
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          ট্রিমডকাস্টে স্বাগতম!
        </p>
      </motion.div>

      {/* AC-ID Card */}
      {acId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-3"
        >
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-center">
            Your Account ID
          </p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-xl sm:text-2xl font-bold tracking-widest text-foreground font-mono">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: '🏪', text: 'Business Profile', textBn: 'ব্যবসার তথ্য' },
            { icon: '📥', text: 'Download Templates', textBn: 'টেমপ্লেট ডাউনলোড' },
            { icon: '📊', text: 'Upload Your Data', textBn: 'ডাটা আপলোড' },
            { icon: '🔮', text: 'See First Forecast', textBn: 'প্রথম পূর্বাভাসন' },
          ].map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 text-sm"
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <span className="text-foreground block">{item.text}</span>
                <span className="text-muted-foreground text-xs block">{item.textBn}</span>
              </div>
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
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-12 shadow-lg shadow-emerald-500/25 text-base"
          size="lg"
        >
          Let&apos;s Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
