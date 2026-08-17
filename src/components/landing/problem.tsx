'use client';

import { motion } from 'framer-motion';
import { Package, CloudRain, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const problems = [
  {
    icon: Package,
    iconColor: 'text-rose-400',
    borderColor: 'border-l-rose-500',
    bgAccent: 'bg-rose-500/10',
    title: 'Winter Overstock',
    quote:
      'Winter comes, you order 2x stock. Half sits unsold till next year. Your capital is trapped.',
    bangla: 'শীতকালে দ্বিগুণ অর্ডার দেন, অর্ধেক অবিক্রীত থাকে',
  },
  {
    icon: CloudRain,
    iconColor: 'text-amber-400',
    borderColor: 'border-l-amber-500',
    bgAccent: 'bg-amber-500/10',
    title: 'Monsoon Dead Stock',
    quote:
      'Monsoon comes, nobody buys chain pads or brake shoes. Your capital is locked in products nobody wants for 4 months.',
    bangla: 'বর্ষায় চেইন প্যাড বিক্রী হয় না',
  },
  {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    borderColor: 'border-l-red-500',
    bgAccent: 'bg-red-500/10',
    title: 'Chinese New Year Delays',
    quote:
      'CNY shuts factories for 30 days. You always order late. Every year. By the time stock arrives, peak season is over.',
    bangla: 'চাইনিজ নিউ ইয়ারে ৩০ দিন কারখানা বন্ধ',
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

export function Problem() {
  return (
    <section id="problem" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            The 3 Killers of Your Motorcycle Parts Business
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            If you&apos;re a parts dealer in Bangladesh, you know these pains all
            too well.
          </p>
        </motion.div>

        {/* Problem Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <motion.div key={problem.title} variants={cardVariants}>
                <Card
                  className={`border-l-4 ${problem.borderColor} bg-card/50 hover:bg-card/80 transition-colors duration-300 h-full`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg ${problem.bgAccent}`}
                      >
                        <Icon className={`w-5 h-5 ${problem.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground">
                        {problem.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      &ldquo;{problem.quote}&rdquo;
                    </p>
                    <p className="text-sm font-medium text-foreground/70 italic">
                      {problem.bangla}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
