'use client';

// ============================================
// CNY Risk Warning Banner
// Alerts about Chinese New Year supply chain disruption
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CNYRiskBannerProps {
  cnyAtRiskCount?: number;
  className?: string;
}

// CNY 2026 dates (approximate)
const CNY_2026 = {
  lunarNewYear: new Date('2026-02-17'),
  shutdownStart: new Date('2026-01-20'),
  shutdownEnd: new Date('2026-03-10'),
  rushDeadline: new Date('2026-01-05'),
};

function computeCNYStatus() {
  const now = new Date();
  if (now >= CNY_2026.shutdownStart && now <= CNY_2026.shutdownEnd) {
    return { status: 'active' as const, daysUntil: 0 };
  }
  if (now < CNY_2026.rushDeadline) {
    const days = Math.ceil((CNY_2026.rushDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { status: 'approaching' as const, daysUntil: days };
  }
  const days = Math.ceil((CNY_2026.shutdownStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { status: days < 90 ? 'approaching' as const : 'safe' as const, daysUntil: Math.max(0, days) };
}

export function CNYRiskBanner({ cnyAtRiskCount = 0, className }: CNYRiskBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { cnyStatus, daysUntil } = useMemo(() => {
    const { status, daysUntil } = computeCNYStatus();
    return { cnyStatus: status, daysUntil };
  }, []);

  // Don't show if dismissed or no risk
  if (dismissed) return null;
  if (cnyStatus === 'safe' && cnyAtRiskCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={className}
      >
        <Card className={cn(
          'border-2',
          cnyStatus === 'active' ? 'border-red-500 bg-red-500/5' : 'border-amber-500 bg-amber-500/5',
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                cnyStatus === 'active' ? 'bg-red-500/15' : 'bg-amber-500/15',
              )}>
                {cnyStatus === 'active' ? (
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    'text-sm font-semibold',
                    cnyStatus === 'active' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400',
                  )}>
                    {cnyStatus === 'active' ? 'CNY Shutdown Active!' : 'CNY Approaching'}
                  </span>
                  {cnyAtRiskCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 h-4">
                      {cnyAtRiskCount} orders at risk
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cnyStatus === 'active'
                    ? `Chinese factories closed until ${format(CNY_2026.shutdownEnd, 'MMM d, yyyy')}. Orders will be delayed.`
                    : `${daysUntil} days until CNY rush deadline (${format(CNY_2026.rushDeadline, 'MMM d')}). Place orders before to avoid delays.`
                  }
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  View CNY Calendar
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
