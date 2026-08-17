'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingDown, Ship, Target, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Stat {
  icon: LucideIcon;
  value: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  {
    icon: TrendingDown,
    value: 42,
    suffix: '%',
    label: 'average stock reduction',
  },
  {
    icon: Ship,
    value: 90,
    suffix: ' days',
    label: 'sea freight from China',
  },
  {
    icon: Target,
    value: 15,
    suffix: '%',
    label: 'avg stock reduction with forecast',
  },
  {
    icon: Wallet,
    value: 12,
    suffix: 'K',
    label: 'BDT/yr full access',
  },
];

const COUNTER_DURATION_MS = 2000;

function useCounter(target: number, shouldStart: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number | null = null;
    let animationFrameId: number;
    let currentCount = 0;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / COUNTER_DURATION_MS, 1);

      // Ease-out cubic for a satisfying deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      currentCount = Math.round(easedProgress * target);

      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [target, shouldStart]);

  // Reset to 0 when not started (using derived value instead of setState in effect)
  return shouldStart ? count : 0;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
} as const;

const statVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
} as const;

function StatCard({ stat, shouldAnimate }: { stat: Stat; shouldAnimate: boolean }) {
  const Icon = stat.icon;
  const count = useCounter(stat.value, shouldAnimate);

  return (
    <motion.div
      className="flex flex-col items-center text-center p-8 rounded-xl border border-border/40 bg-card/30"
      variants={statVariants}
    >
      {/* Icon */}
      <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10">
        <Icon className="w-6 h-6 text-emerald-500" />
      </div>

      {/* Animated Number */}
      <div className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2 tabular-nums">
        {stat.suffix === 'K' ? (
          <>
            ৳{count}
            {stat.suffix}
          </>
        ) : (
          <>
            {count}
            {stat.suffix}
          </>
        )}
      </div>

      {/* Label */}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {stat.label}
      </p>
    </motion.div>
  );
}

export function Statistics() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="statistics" className="relative py-20 sm:py-28">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-950/8 to-background" />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            The Numbers Don&apos;t Lie
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Real impact from real motorcycle parts dealers in Bangladesh.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              stat={stat}
              shouldAnimate={isInView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
