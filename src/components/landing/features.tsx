'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  AlertTriangle,
  ShoppingCart,
  RefreshCw,
  LayoutDashboard,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: BarChart3,
    title: 'Seasonal Forecasting',
    description:
      'Know which products peak in winter, dip in monsoon. Plan stock levels with 12-month forecasts updated every month.',
  },
  {
    icon: AlertTriangle,
    title: 'CNY Risk Engine',
    description:
      'Never get caught by Chinese New Year shutdowns again. Automatic alerts 90 days before factory closures.',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Order Triggers',
    description:
      'Get told WHEN and HOW MUCH to order, automatically. Based on forecast + safety stock + lead time.',
  },
  {
    icon: RefreshCw,
    title: 'Auto Recalibration',
    description:
      'Forecasts improve every month with your actual sales data. The longer you use TrimedCast, the smarter it gets.',
  },
  {
    icon: LayoutDashboard,
    title: 'S&OE Control Tower',
    description:
      'See demand vs supply gaps before they become problems. Visual pipeline from forecast → order → delivery.',
  },
  {
    icon: Zap,
    title: 'Promo Impact Simulator',
    description:
      'Know if your Eid discount will actually increase profit. Simulate promo impact on demand before you commit.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
} as const;

export function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-950/5 to-background pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Everything You Need to Stop Guessing
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Six powerful features. One simple system.{' '}
            <span className="text-emerald-400 font-semibold">৳12,000/year.</span>
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={cardVariants}>
                <div className="group relative h-full rounded-xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 hover:bg-card/80">
                  {/* Icon */}
                  <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-emerald-500" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </p>

                  {/* Subtle emerald glow on hover */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-emerald-500/[0.02] to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
