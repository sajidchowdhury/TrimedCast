'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
} as const;

const trustBadges = [
  'No credit card required',
  'See predictions in 5 minutes',
  'Built for Bangladesh motorcycle parts market',
] as const;

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-emerald-950/10 pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/3 blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-24 w-full">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Bengali Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-foreground mb-4"
          >
            মোটরসাইকেল পার্টস ডিলারের ঋতুভিত্তিক চাহিদা পূর্বাভাসন এখন{' '}
            <span className="text-emerald-500">ডাটা-ড্রিভেন</span>
          </motion.h1>

          {/* English Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-400 mb-6"
          >
            Stop guessing. Start forecasting.
          </motion.p>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            TrimedCast predicts seasonal demand, warns about CNY delays, and tells
            you exactly <strong className="text-foreground">WHEN</strong> and{' '}
            <strong className="text-foreground">HOW MUCH</strong> to order — for
            just <strong className="text-emerald-400">৳12,000/year</strong>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button
              asChild
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base px-8 h-12 shadow-xl shadow-emerald-500/25 rounded-lg"
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 h-12 rounded-lg border-border/60 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/40"
              onClick={() => {
                document
                  .getElementById('how-it-works')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              See How It Works
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6"
          >
            {trustBadges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                <span>{badge}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
