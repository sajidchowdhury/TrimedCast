'use client';

// ============================================
// TrimedCast - PO Stats Cards
// Session 19: Purchase Order Management Dashboard
// Top-level summary cards with key PO metrics
// ============================================

import React from 'react';
import {
  ShoppingCart,
  Clock,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { PurchaseOrder } from './types';

// --- Props ---
interface POStatsCardsProps {
  orders: PurchaseOrder[];
}

// --- Helper ---
function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return '৳0';
  if (amount >= 1000000) return `৳${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `৳${(amount / 1000).toFixed(0)}K`;
  return `৳${amount.toLocaleString()}`;
}

// --- Main Component ---
export function POStatsCards({ orders }: POStatsCardsProps) {
  const totalPOs = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const draftCount = orders.filter((o) => o.status === 'draft').length;
  const submittedCount = orders.filter((o) => o.status === 'submitted').length;
  const pendingAction = draftCount + submittedCount;

  const inTransitCount = orders.filter((o) => o.status === 'in_transit').length;
  const inTransitDeliveriesThisWeek = orders.filter((o) => {
    if (o.status !== 'in_transit' || !o.expected_delivery) return false;
    const deliveryDate = new Date(o.expected_delivery);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return deliveryDate <= weekFromNow;
  }).length;

  const cnyAtRisk = orders.filter((o) => o.cny_risk).length;

  const cards = [
    {
      icon: ShoppingCart,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Total POs',
      titleBn: 'মোট ক্রয় আদেশ',
      value: totalPOs,
      subtitle: formatBDT(totalValue),
      subtitleLabel: 'total value',
    },
    {
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Pending Action',
      titleBn: 'অপেক্ষমান',
      value: pendingAction,
      subtitle: `${draftCount} draft, ${submittedCount} submitted`,
      subtitleLabel: '',
    },
    {
      icon: Truck,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-600 dark:text-sky-400',
      title: 'In Transit',
      titleBn: 'পরিবহনে',
      value: inTransitCount,
      subtitle: inTransitDeliveriesThisWeek > 0
        ? `${inTransitDeliveriesThisWeek} arriving this week`
        : 'No arrivals this week',
      subtitleLabel: '',
    },
    {
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      title: 'CNY At Risk',
      titleBn: 'CNY ঝুঁকিতে',
      value: cnyAtRisk,
      subtitle: cnyAtRisk > 0 ? 'Chinese New Year affected' : 'No CNY risk',
      subtitleLabel: '',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
