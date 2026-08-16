'use client';

// ============================================
// Landing Page Pricing — BDT Pricing + BD Payment Methods
// Session 13: BD Payment Integration
// ============================================

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles, Smartphone, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  'Full 12-month forecasts',
  'CNY risk alerts',
  'Smart order triggers',
  'Auto recalibration',
  'S&OE Control Tower',
  'Up to 10 team members',
  'Priority support (WhatsApp)',
] as const;

const paymentMethods = [
  { name: 'bKash', nameBn: 'বিকাশ', icon: <Smartphone className="h-3.5 w-3.5" />, className: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { name: 'Nagad', nameBn: 'নগদ', icon: <Smartphone className="h-3.5 w-3.5" />, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { name: 'SSLCommerz', nameBn: 'এসএলকমার্জ', icon: <CreditCard className="h-3.5 w-3.5" />, className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  { name: 'Bank Transfer', nameBn: 'ব্যাংক', icon: <Building2 className="h-3.5 w-3.5" />, className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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

export function Pricing() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-950/5 to-background pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Simple Pricing.{' '}
            <span className="text-emerald-500">No surprises.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            One plan. Full power. Built for motorcycle parts dealers in
            Bangladesh. Pay in ৳BDT.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          className="max-w-lg mx-auto"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Glow behind the card */}
          <div className="absolute inset-0 -z-10 translate-y-4">
            <div className="mx-auto max-w-md h-full rounded-3xl bg-emerald-500/8 blur-2xl" />
          </div>

          <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm border-t-4 border-t-emerald-500 shadow-xl shadow-emerald-500/5">
            {/* Best value tag */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Best value
              </span>
            </div>

            <motion.div
              className="p-8 sm:p-10"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              {/* Plan title */}
              <motion.h3
                variants={itemVariants}
                className="text-xl font-semibold text-foreground mb-2"
              >
                Pro Plan
              </motion.h3>

              {/* Price */}
              <motion.div variants={itemVariants} className="mb-1">
                <span className="text-4xl sm:text-5xl font-bold text-emerald-500 tabular-nums">
                  ৳69,000
                </span>
                <span className="text-lg text-muted-foreground ml-1">
                  / year
                </span>
              </motion.div>
              <motion.p
                variants={itemVariants}
                className="text-sm text-muted-foreground mb-1"
              >
                (that&apos;s just ৳5,750/month)
              </motion.p>
              <motion.p
                variants={itemVariants}
                className="text-xs text-emerald-600 font-medium mb-6"
              >
                Save 17% with yearly billing
              </motion.p>

              {/* Monthly price option */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 mb-6 p-2.5 rounded-lg bg-muted/50 text-sm"
              >
                <span className="text-muted-foreground">Or monthly:</span>
                <span className="font-semibold">৳6,900/mo</span>
              </motion.div>

              {/* Features */}
              <motion.ul
                variants={containerVariants}
                className="space-y-3 mb-8"
              >
                {features.map((feature) => (
                  <motion.li
                    key={feature}
                    variants={itemVariants}
                    className="flex items-start gap-3"
                  >
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-foreground">{feature}</span>
                  </motion.li>
                ))}
              </motion.ul>

              {/* CTA */}
              <motion.div variants={itemVariants}>
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base h-12 shadow-lg shadow-emerald-500/25 rounded-lg"
                >
                  <Link href="/signup">Start 14-Day Free Trial</Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  No payment required for trial
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* All Tiers Quick View */}
        <motion.div
          className="mt-12 grid grid-cols-3 gap-4 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {[
            { name: 'Starter', nameBn: 'স্টার্টার', monthly: 2400, yearly: 24000 },
            { name: 'Professional', nameBn: 'প্রফেশনাল', monthly: 6900, yearly: 69000, popular: true },
            { name: 'Enterprise', nameBn: 'এন্টারপ্রাইজ', monthly: 17400, yearly: 174000 },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`text-center p-3 rounded-xl border ${
                tier.popular
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border/50 bg-muted/30'
              }`}
            >
              <p className="text-xs font-medium">{tier.name}</p>
              <p className="text-[10px] text-muted-foreground">{tier.nameBn}</p>
              <p className="text-sm font-bold mt-1">৳{(tier.yearly / 12).toLocaleString('en-BD')}/mo</p>
              <p className="text-[10px] text-muted-foreground">or ৳{tier.monthly.toLocaleString('en-BD')}/mo</p>
            </div>
          ))}
        </motion.div>

        {/* Payment Methods Bar */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          <span className="text-sm text-muted-foreground font-medium">
            Pay via:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${method.className}`}
              >
                {method.icon}
                {method.name}
                <span className="text-[9px] opacity-60">{method.nameBn}</span>
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
