'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Upload, Brain, CheckCircle, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  time: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload',
    subtitle: 'Upload your Excel sheets',
    description:
      'Import your sales history, product list, and supplier data. CSV or Excel — TrimedCast handles both.',
    time: '5 min',
  },
  {
    number: 2,
    icon: Brain,
    title: 'Forecast',
    subtitle: 'AI + Prophet predicts 2026',
    description:
      'Our engine analyzes seasonal patterns, CNY impact, and promo history. Forecasts ready in minutes, not days.',
    time: '2 min',
  },
  {
    number: 3,
    icon: CheckCircle,
    title: 'Order',
    subtitle: 'Get smart reorder alerts',
    description:
      'Automatic order triggers tell you exactly what to order, when, and how much. One click to create a purchase order.',
    time: 'Instant',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
} as const;

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
} as const;

const connectorVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.8, ease: 'easeOut' as const, delay: 0.4 },
  },
} as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 scroll-mt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/5 via-emerald-950/8 to-emerald-950/5 pointer-events-none" />

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
            From Excel to Order in 3 Steps
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No training needed. No complex setup. Just upload and go.
          </p>
        </motion.div>

        {/* Desktop: horizontal layout with connectors */}
        <div className="hidden lg:block">
          <motion.div
            className="flex items-start justify-center gap-0"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Fragment key={step.title}>
                  {/* Step Card */}
                  <motion.div
                    className="flex flex-col items-center text-center w-[280px]"
                    variants={stepVariants}
                  >
                    {/* Number Circle */}
                    <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white font-bold text-xl shadow-lg shadow-emerald-500/25">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10">
                      <Icon className="w-6 h-6 text-emerald-500" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-emerald-400 font-semibold text-sm mb-3">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed text-sm mb-4">
                      {step.description}
                    </p>

                    {/* Time Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <svg
                        className="w-3.5 h-3.5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" d="M12 6v6l4 2" />
                      </svg>
                      <span className="text-emerald-400 text-sm font-semibold">
                        {step.time}
                      </span>
                    </div>
                  </motion.div>

                  {/* Connector Arrow (between steps, not after last) */}
                  {index < steps.length - 1 && (
                    <motion.div
                      className="flex items-center px-3 pt-16"
                      variants={connectorVariants}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-[2px] border-t border-dashed border-emerald-500/40" />
                        <ArrowRight className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
                      </div>
                    </motion.div>
                  )}
                </Fragment>
              );
            })}
          </motion.div>
        </div>

        {/* Mobile/Tablet: vertical stack with vertical connectors */}
        <div className="lg:hidden">
          <motion.div
            className="space-y-0"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title}>
                  <motion.div className="flex gap-5" variants={stepVariants}>
                    {/* Left: Number + vertical line */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-base shadow-md shadow-emerald-500/25 flex-shrink-0">
                        {step.number}
                      </div>
                      {/* Vertical connector line */}
                      {index < steps.length - 1 && (
                        <motion.div
                          className="w-[2px] flex-1 min-h-[40px] mt-2"
                          variants={connectorVariants}
                        >
                          <div className="w-full h-full border-l border-dashed border-emerald-500/30" />
                        </motion.div>
                      )}
                    </div>

                    {/* Right: Content */}
                    <div className="pb-10 flex-1">
                      {/* Icon + Title row */}
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                          <Icon className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                          {step.title}
                        </h3>
                      </div>

                      {/* Subtitle */}
                      <p className="text-emerald-400 font-semibold text-sm mb-2">
                        {step.subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                        {step.description}
                      </p>

                      {/* Time Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <svg
                          className="w-3 h-3 text-emerald-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" d="M12 6v6l4 2" />
                        </svg>
                        <span className="text-emerald-400 text-xs font-semibold">
                          {step.time}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
