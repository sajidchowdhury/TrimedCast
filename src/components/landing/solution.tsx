'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const solutions = [
  {
    icon: TrendingUp,
    title: 'Know What Peaks When',
    description:
      'Upload your Excel sheets. TrimedCast learns your seasonal patterns — which products peak in winter, dip in monsoon. No more guessing.',
    tag: 'Seasonal Forecasting',
  },
  {
    icon: ShoppingCart,
    title: 'Order the Right Amount at the Right Time',
    description:
      'Get automatic reorder alerts: WHEN to order (before CNY shutdown), HOW MUCH (based on forecast + safety stock), and from WHICH supplier.',
    tag: 'Smart Order Triggers',
  },
  {
    icon: Shield,
    title: 'Never Get Caught by CNY Again',
    description:
      'Automatic alerts 90 days before Chinese New Year. Order deadlines calculated with sea freight lead time. Your stock arrives BEFORE factories close.',
    tag: 'CNY Risk Engine',
  },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
} as const;

export function Solution() {
  return (
    <section id="solution" className="relative py-20 sm:py-28">
      {/* Subtle emerald gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/5 via-emerald-950/10 to-emerald-950/5 pointer-events-none" />

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
            TrimedCast Solves All Three
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            One system. Three problems solved.{' '}
            <span className="text-emerald-400 font-semibold">৳12,000/year.</span>
          </p>
        </motion.div>

        {/* Solution Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {solutions.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <motion.div key={solution.title} variants={cardVariants}>
                <Card className="border-l-4 border-l-emerald-500 bg-card/50 hover:bg-card/80 transition-all duration-300 h-full group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                        <Icon className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        {solution.tag}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground leading-snug">
                      {solution.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed">
                      {solution.description}
                    </p>
                    {/* Visual arrow connecting problem → solution */}
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Problem solved</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom connector: Problem → Solution visual */}
        <motion.div
          className="mt-12 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-rose-400 text-sm font-medium">Problem</span>
            <ArrowRight className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-400 text-sm font-medium">
              TrimedCast
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-400 text-sm font-medium">
              Solution
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
