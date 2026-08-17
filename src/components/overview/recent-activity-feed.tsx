'use client';

// ============================================
// TrimedCast — Recent Activity Feed
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  ShoppingCart,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  CreditCard,
  Sun,
  Package,
  Wallet,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActivityItem } from './types';
import { MOCK_ACTIVITY_ITEMS } from './types';

interface RecentActivityFeedProps {
  activities?: ActivityItem[];
}

const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  CreditCard,
  Sun,
  Package,
  Wallet,
};

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600',
  violet: 'bg-violet-500/10 text-violet-600',
  sky: 'bg-sky-500/10 text-sky-600',
  rose: 'bg-rose-500/10 text-rose-600',
  amber: 'bg-amber-500/10 text-amber-600',
  indigo: 'bg-indigo-500/10 text-indigo-600',
  pink: 'bg-pink-500/10 text-pink-600',
};

const badgeColorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  sky: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const items = activities || MOCK_ACTIVITY_ITEMS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-500/10">
              <History className="h-3.5 w-3.5 text-sky-600" />
            </div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {items.map((item, i) => {
                const Icon = iconMap[item.icon] || Package;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.04, duration: 0.3 }}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${colorMap[item.moduleColor] || colorMap.sky}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1 ${badgeColorMap[item.moduleColor] || badgeColorMap.sky}`}
                        >
                          {item.module}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
