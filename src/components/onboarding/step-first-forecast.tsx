'use client';

// ============================================
// TrimedCast - Onboarding Step 4: First Forecast
// Animated forecast preview showing
// seasonal demand pattern with BD context
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Sparkles, TrendingUp, Thermometer } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding/store';

// Sample monthly forecast data for animation — BD seasonal pattern
const FORECAST_MONTHS = [
  { month: 'Jan', value: 65, label: 'January',   labelBn: 'জানুয়ারি' },
  { month: 'Feb', value: 58, label: 'February',  labelBn: 'ফেব্রুয়ারি' },
  { month: 'Mar', value: 72, label: 'March',     labelBn: 'মার্চ' },
  { month: 'Apr', value: 80, label: 'April',     labelBn: 'এপ্রিল' },
  { month: 'May', value: 68, label: 'May',       labelBn: 'মে' },
  { month: 'Jun', value: 42, label: 'June',      labelBn: 'জুন' },
  { month: 'Jul', value: 35, label: 'July',      labelBn: 'জুলাই' },
  { month: 'Aug', value: 38, label: 'August',    labelBn: 'আগস্ট' },
  { month: 'Sep', value: 45, label: 'September', labelBn: 'সেপ্টেম্বর' },
  { month: 'Oct', value: 70, label: 'October',   labelBn: 'অক্টোবর' },
  { month: 'Nov', value: 95, label: 'November',  labelBn: 'নভেম্বর' },
  { month: 'Dec', value: 88, label: 'December',  labelBn: 'ডিসেম্বর' },
];

const MAX_VALUE = Math.max(...FORECAST_MONTHS.map(m => m.value));

export function StepFirstForecast() {
  const { nextStep, prevStep, setHasSeenForecast } = useOnboardingStore();
  const [animatedBars, setAnimatedBars] = useState<boolean[]>(new Array(12).fill(false));
  const [showInsight, setShowInsight] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

  // Animate bars sequentially
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    FORECAST_MONTHS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setAnimatedBars(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 300 + i * 120));
    });

    // Show insight after all bars animate
    timers.push(setTimeout(() => {
      setShowInsight(true);
      setIsRunning(false);
    }, 300 + 12 * 120 + 400));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleFinish = () => {
    setHasSeenForecast();
    nextStep();
  };

  // Get bar color based on value — BD seasonal context
  const getBarColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500'; // High demand — winter/Eid peak
    if (value >= 60) return 'bg-emerald-400'; // Good demand
    if (value >= 45) return 'bg-amber-400';   // Moderate
    return 'bg-rose-400';                     // Low — monsoon dip
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Your first forecast
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          আপনার প্রথম ঋতুভিত্তিক পূর্বাভাসন — see the pattern!
        </p>
      </motion.div>

      {/* Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-muted/30 p-3 sm:p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Seasonal Demand — 2025
          </p>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Analyzing...
            </span>
          )}
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-1 sm:gap-1.5 h-32 sm:h-44 md:h-48">
          {FORECAST_MONTHS.map((m, i) => {
            const height = animatedBars[i] ? (m.value / MAX_VALUE) * 100 : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                {/* Value label */}
                <span className={`text-[9px] sm:text-[10px] font-medium transition-opacity duration-300 tabular-nums ${
                  animatedBars[i] ? 'text-foreground opacity-100' : 'opacity-0'
                }`}>
                  {m.value}
                </span>
                {/* Bar */}
                <div className="w-full relative" style={{ height: '100%' }}>
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-sm ${getBarColor(m.value)}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                {/* Month label */}
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">{m.month}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 justify-center">
          {[
            { color: 'bg-emerald-500', label: 'High Demand' },
            { color: 'bg-emerald-400', label: 'Good' },
            { color: 'bg-amber-400', label: 'Moderate' },
            { color: 'bg-rose-400', label: 'Low (Monsoon)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insight */}
      <AnimatePresence>
        {showInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex gap-3">
                <Thermometer className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                    Winter demand peaks in November! ❄️
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your seasonal forecast shows demand jumps <strong>2.7×</strong> from monsoon (July) to winter peak (November).
                    TrimedCast will send you order triggers 90 days before — so you&apos;re never caught short.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    CNY Risk: January–February ⚠️
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Chinese suppliers shut down for Lunar New Year. Orders placed after Dec 15 won&apos;t ship until March.
                    We&apos;ll flag CNY-affected SKUs and recommend pre-stocking.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="ml-auto" />
        <Button
          onClick={handleFinish}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 min-h-[44px]"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
