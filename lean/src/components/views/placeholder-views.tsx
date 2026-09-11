'use client';

import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, ShoppingCart, Plane, Calculator, type LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  phase: string;
  description: string;
  bullets: string[];
  pct: number;
}

export function ComingSoon({ icon: Icon, title, phase, description, bullets, pct }: Props) {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-1">{phase}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">{description}</p>

          <div className="max-w-sm mx-auto mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Implementation progress</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>

          <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-left">
            <p className="text-xs font-medium mb-2">What this will deliver</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setView('dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ForecastView() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Session-wise Forecast"
      phase="Phase 2"
      pct={0}
      description="Prophet-inspired forecasting engine that predicts demand per SKU for the next Eid, Durga Puja, Summer, Winter, and the CNY supply disruption."
      bullets={[
        'Hijri-calendar fix for accurate Eid dates (day-precise)',
        'Festival demand-effect multipliers applied per session',
        'MAPE accuracy tracking with 5-tier rating',
        '6-month rolling horizon with confidence intervals',
      ]}
    />
  );
}

export function OrdersView() {
  return (
    <ComingSoon
      icon={ShoppingCart}
      title="Order Recommendations"
      phase="Phase 3"
      pct={0}
      description="EOQ + Safety Stock + the 9-step order-trigger algorithm — the system's core IP that tells you exactly how much to order and the date to place the PO."
      bullets={[
        'Economic Order Quantity with MOQ & warehouse-capacity constraints',
        'Safety stock sized by forecast error (MAE) + lead-time variance',
        'Order-trigger date back-computed from the session peak',
        '4 Chinese New Year strategies (before / after / partial / air-escape)',
      ]}
    />
  );
}

export function FreightView() {
  return (
    <ComingSoon
      icon={Plane}
      title="Air vs Sea Freight Decision"
      phase="Phase 4"
      pct={0}
      description="Side-by-side comparison of the 8× cost premium vs the 51-day lead-time saving, with a per-SKU recommended shipping mode."
      bullets={[
        'Lead-time decomposition (mfg + shipment + customs + internal)',
        'Cost-per-unit comparison sea (~৳5) vs air (~৳35)',
        'Auto-recommend air when stockout ≤ 30 days & margin ≥ 30%',
        'CNY air-escape strategy for critical SKUs',
      ]}
    />
  );
}

export function LineCostView() {
  return (
    <ComingSoon
      icon={Calculator}
      title="Line Cost Analysis"
      phase="Phase 4"
      pct={0}
      description="BD customs calculator (HS 8512: 25% Duty + 15% VAT-on-tax + 5% AIT) computing landed cost per unit and margin, for both sea and air."
      bullets={[
        'Full landed cost: CIF + Customs Duty + SD + VAT + AIT',
        'BD VAT computed as tax-on-tax (on CIF + CD + SD)',
        'Margin % for sea vs air side by side',
        'Per-SKU breakdown donut chart',
      ]}
    />
  );
}
