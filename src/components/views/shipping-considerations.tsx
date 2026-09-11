'use client';

// ============================================
// TrimedCast LEAN — Shipping Considerations panel
// Shows the lead-time logic + holiday calendar + weekend differences
// + importer recommendations. Explains WHY the 155d/104d estimate.
// ============================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, Ship, Calendar, Clock, AlertTriangle, Info, Globe } from 'lucide-react';

interface HolidayEvent {
  name: string;
  country: 'china' | 'bangladesh';
  type: string;
  startISO: string;
  endISO: string;
  durationDays: number;
  impact: string;
  affects: string;
}

interface ShippingCalendarData {
  leadTime: {
    manufacturing: number; shipmentSea: number; shipmentAir: number;
    customsSea: number; customsAir: number; internal: number;
    totalSea: number; totalAir: number;
  };
  weekend: {
    chinaWorkingDays: string; chinaOffDay: string;
    bdWorkingDays: string; bdOffDays: string;
    weeklyAdminDelayDays: number; overlap: string;
  };
  recommendations: string[];
  chinaHolidays: HolidayEvent[];
  bdHolidays: HolidayEvent[];
}

const COUNTRY_FLAGS: Record<string, string> = { china: '🇨🇳', bangladesh: '🇧🇩' };
const TYPE_COLORS: Record<string, string> = {
  factory_shutdown: 'bg-red-100 text-red-700 border-red-200',
  customs_closure: 'bg-orange-100 text-orange-700 border-orange-200',
  port_closure: 'bg-purple-100 text-purple-700 border-purple-200',
  bank_holiday: 'bg-blue-100 text-blue-700 border-blue-200',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ShippingConsiderations() {
  const [data, setData] = useState<ShippingCalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/shipping-calendar');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { leadTime: lt, weekend: w, recommendations: recs, chinaHolidays, bdHolidays } = data;
  const sea = { manufacturing: lt.manufacturing, shipment: lt.shipmentSea, customs: lt.customsSea, internal: lt.internal, total: lt.totalSea };
  const air = { manufacturing: lt.manufacturing, shipment: lt.shipmentAir, customs: lt.customsAir, internal: lt.internal, total: lt.totalAir };

  return (
    <div className="space-y-4">
      {/* Lead-time logic explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            How We Estimate Shipping Time — The Logic
          </CardTitle>
          <CardDescription>
            The lead time is the sum of 4 stages. Here's exactly how each is calculated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sea breakdown */}
          <div className="rounded-lg border bg-blue-50/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Ship className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold">Sea Route — {sea.total} days total</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <BreakdownItem label="Manufacturing" value={`${sea.manufacturing}d`} sub="Supplier production time" />
              <BreakdownItem label="Ocean Shipment" value={`${sea.shipment}d`} sub="China port → Chattogram port" />
              <BreakdownItem label="Customs Clearance" value={`${sea.customs}d`} sub="Chattogram port customs" />
              <BreakdownItem label="Internal Processing" value={`${sea.internal}d`} sub="PO, QC, warehousing" />
            </div>
          </div>

          {/* Air breakdown */}
          <div className="rounded-lg border bg-orange-50/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold">Air Route — {air.total} days total</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <BreakdownItem label="Manufacturing" value={`${air.manufacturing}d`} sub="Same as sea" />
              <BreakdownItem label="Air Shipment" value={`${air.shipment}d`} sub="China → Dhaka airport" />
              <BreakdownItem label="Customs Clearance" value={`${air.customs}d`} sub="Airport customs" />
              <BreakdownItem label="Internal Processing" value={`${air.internal}d`} sub="PO, QC, warehousing" />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-amber-900">
              <strong>Why these numbers?</strong> Manufacturing (90d) is the supplier's typical production
              cycle for motorcycle parts. Ocean shipment (52d) = vessel transit + port handling at both ends.
              Customs (10d sea / 3d air) = BD customs documentation + inspection. Internal (3d) = PO processing,
              quality check, warehouse put-away. <strong>These are baseline estimates</strong> — actual times
              may be longer due to holidays (see below).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holiday calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Holiday Calendar — Delays Beyond Baseline
          </CardTitle>
          <CardDescription>
            These holidays extend the actual shipping time. The system accounts for them automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* China holidays */}
          <div>
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> {COUNTRY_FLAGS.china} China Holidays (affect manufacturing)
            </h4>
            <div className="space-y-2">
              {chinaHolidays.map((h, i) => (
                <HolidayRow key={i} h={h} />
              ))}
            </div>
          </div>

          {/* BD holidays */}
          <div>
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> {COUNTRY_FLAGS.bangladesh} Bangladesh Holidays (affect customs + delivery)
            </h4>
            <div className="space-y-2">
              {bdHolidays.map((h, i) => (
                <HolidayRow key={i} h={h} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekend differences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Weekend Differences — China vs Bangladesh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl mb-1">🇨🇳</div>
              <div className="text-xs font-medium">China</div>
              <div className="text-xs text-muted-foreground">Works {w.chinaWorkingDays}</div>
              <div className="text-xs text-red-600">Off: {w.chinaOffDay}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl mb-1">🇧🇩</div>
              <div className="text-xs font-medium">Bangladesh</div>
              <div className="text-xs text-muted-foreground">Works {w.bdWorkingDays}</div>
              <div className="text-xs text-red-600">Off: {w.bdOffDays}</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-xs font-medium">Overlap</div>
              <div className="text-xs text-muted-foreground">{w.overlap}</div>
              <div className="text-xs text-amber-600">+{w.weeklyAdminDelayDays}d/week admin delay</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Banking (L/C opening), customs paperwork, and supplier communication can only happen on
            overlapping working days. This adds ~{w.weeklyAdminDelayDays} days per week of transit
            for admin tasks.
          </p>
        </CardContent>
      </Card>

      {/* Importer recommendations */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            What an Importer Should Watch For
          </CardTitle>
          <CardDescription>Practical measures to avoid shipping delays</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recs.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownItem({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded border bg-background p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[9px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function HolidayRow({ h }: { h: HolidayEvent }) {
  const typeColor = TYPE_COLORS[h.type] || 'bg-muted text-muted-foreground border-border';
  return (
    <div className="flex items-start gap-2 rounded-lg border p-2.5 text-xs">
      <Badge variant="outline" className={`text-[9px] shrink-0 ${typeColor}`}>
        {h.type.replace(/_/g, ' ')}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{h.name}</div>
        <div className="text-muted-foreground mt-0.5">
          {formatDate(h.startISO)} – {formatDate(h.endISO)} · {h.durationDays} days
        </div>
        <div className="text-muted-foreground mt-0.5">{h.impact}</div>
      </div>
    </div>
  );
}
