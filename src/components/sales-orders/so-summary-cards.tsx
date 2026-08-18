'use client';

// ============================================
// TrimedCast — Sales Order Summary Cards
// Session 23: Sales Order Management
// ============================================

import { ShoppingBag, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesOrderStore } from '@/stores/sales-order-store';
import { formatBDT } from './types';

export function SOSummaryCards() {
  const orders = useSalesOrderStore((s) => s.orders);
  const totalRevenue = useSalesOrderStore((s) => s.totalRevenue);
  const pendingCount = useSalesOrderStore((s) => s.pendingCount);
  const deliveredCount = useSalesOrderStore((s) => s.deliveredCount);

  const totalOrders = orders.length;
  const delivered = deliveredCount();
  const deliveredPct = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;
  const revenue = totalRevenue();

  const cards = [
    {
      title: 'Total Orders',
      titleBn: 'মোট আদেশ',
      value: totalOrders.toString(),
      icon: ShoppingBag,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Revenue',
      titleBn: 'আয়',
      value: formatBDT(revenue),
      icon: DollarSign,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Pending Fulfillment',
      titleBn: 'অপেক্ষমাণ পূরণ',
      value: pendingCount().toString(),
      icon: Clock,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-500',
    },
    {
      title: 'Delivered',
      titleBn: 'বিতরণ',
      value: `${delivered} (${deliveredPct}%)`,
      icon: CheckCircle2,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <span>{card.title}</span>
              <span className="block text-xs opacity-60">{card.titleBn}</span>
            </CardTitle>
            <div className={`h-9 w-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
