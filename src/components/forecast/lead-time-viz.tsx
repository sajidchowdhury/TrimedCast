'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { LeadTimeResultClient } from '@/lib/forecasting/store';
import { Ship, Plane, Factory, FileCheck, Warehouse } from 'lucide-react';

interface LeadTimeVizProps {
  leadTime: LeadTimeResultClient;
  cnyDelayDays?: number;
}

export function LeadTimeViz({ leadTime, cnyDelayDays = 0 }: LeadTimeVizProps) {
  const [isAir, setIsAir] = useState(leadTime.shippingMethod === 'air');

  const segments = [
    {
      label: 'Manufacturing',
      sublabel: 'China factory',
      value: leadTime.breakdown.manufacturing,
      color: 'bg-slate-500',
      icon: <Factory className="h-3.5 w-3.5" />,
    },
    {
      label: 'Shipping',
      sublabel: isAir ? 'Air freight' : 'Sea freight',
      value: leadTime.breakdown.shipping,
      color: 'bg-blue-500',
      icon: isAir ? <Plane className="h-3.5 w-3.5" /> : <Ship className="h-3.5 w-3.5" />,
    },
    {
      label: 'Customs',
      sublabel: 'BD clearance',
      value: leadTime.breakdown.customs,
      color: 'bg-amber-500',
      icon: <FileCheck className="h-3.5 w-3.5" />,
    },
    {
      label: 'Internal',
      sublabel: 'QC & process',
      value: leadTime.breakdown.internal,
      color: 'bg-emerald-500',
      icon: <Warehouse className="h-3.5 w-3.5" />,
    },
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const totalWithCny = total + cnyDelayDays;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isAir ? <Plane className="h-4 w-4 text-blue-500" /> : <Ship className="h-4 w-4 text-blue-500" />}
            Lead Time Breakdown
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="shipping-toggle" className="text-xs text-gray-500 cursor-pointer">
              Sea
            </Label>
            <Switch
              id="shipping-toggle"
              checked={isAir}
              onCheckedChange={setIsAir}
            />
            <Label htmlFor="shipping-toggle" className="text-xs text-gray-500 cursor-pointer">
              Air
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total lead time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Lead Time</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-slate-800">{total}</span>
            <span className="text-sm text-gray-500">days</span>
            {cnyDelayDays > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                +{cnyDelayDays}d CNY
              </Badge>
            )}
          </div>
        </div>

        {/* Stacked bar */}
        <div className="space-y-2">
          <div className="flex h-8 rounded-lg overflow-hidden bg-gray-100">
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`${seg.color} flex items-center justify-center text-white text-xs font-medium transition-all relative group`}
                style={{ width: `${(seg.value / total) * 100}%` }}
                title={`${seg.label}: ${seg.value} days`}
              >
                {seg.value >= 8 && `${seg.value}d`}
              </div>
            ))}
          </div>

          {/* CNY overlay */}
          {cnyDelayDays > 0 && (
            <div className="flex h-4 rounded overflow-hidden">
              <div
                className="bg-red-400 flex items-center justify-center text-white text-[10px] font-medium"
                style={{ width: '100%' }}
              >
                +{cnyDelayDays}d CNY Delay → Total: {totalWithCny}d
              </div>
            </div>
          )}
        </div>

        {/* Segment details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-gray-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-gray-600">{seg.icon}</span>
                <span className="text-xs font-medium text-gray-700">{seg.label}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{seg.value}</p>
              <p className="text-[10px] text-gray-500">{seg.sublabel}</p>
            </div>
          ))}
        </div>

        {/* Route info */}
        <div className="text-xs text-gray-500 bg-slate-50 rounded p-2">
          <span className="font-medium">Route:</span>{' '}
          {isAir
            ? 'China factory → Air freight (≈8d) → Dhaka airport → Customs (3d) → Warehouse'
            : 'China factory → Sea freight Shanghai→Chittagong (≈52d) → Benapole port → Customs (10d) → Warehouse'
          }
        </div>
      </CardContent>
    </Card>
  );
}
