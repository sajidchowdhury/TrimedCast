'use client';

// ============================================
// Consensus Pipeline Panel
// Visual 5-step consensus forecast pipeline:
//   Step 1: Prophet Baseline
//   Step 2: Seasonal Weights
//   Step 3: Marketing Adj
//   Step 4: Sales Override
//   Step 5: Consensus
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend,
} from 'recharts';
import {
  GitMerge, Brain, Sun, Megaphone,
  Users, CheckCircle2, ChevronRight, Plus,
  TrendingUp, Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  calculateConsensusForecast,
  BD_SEASONAL_WEIGHTS,
  type SKUCategory,
  type ManualOverride,
  type OverrideConfidence,
  type OverrideReasonCode,
  type ConsensusResult,
} from '@/lib/forecasting/consensus-engine';

// =============================================
// Demo Data
// =============================================

const MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

function generateDemoProphetForecast(): Record<string, number> {
  const forecast: Record<string, number> = {};
  const bases = [620, 590, 530, 510, 480, 420];
  MONTHS.forEach((m, i) => {
    forecast[m] = bases[i] + Math.round(Math.random() * 30);
  });
  return forecast;
}

// =============================================
// Pipeline Step Configuration
// =============================================

const PIPELINE_STEPS = [
  { key: 1, label: 'Prophet Baseline', icon: Brain, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { key: 2, label: 'Seasonal Weights', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 3, label: 'Marketing Adj', icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { key: 4, label: 'Sales Override', icon: Users, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { key: 5, label: 'Consensus', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
] as const;

// =============================================
// Override Form State
// =============================================

interface OverrideFormState {
  month: string;
  overrideQty: string;
  reasonCode: OverrideReasonCode;
  reasonText: string;
  confidenceLevel: OverrideConfidence;
}

const EMPTY_OVERRIDE: OverrideFormState = {
  month: '2025-01',
  overrideQty: '',
  reasonCode: 'EVENT',
  reasonText: '',
  confidenceLevel: 'medium',
};

const REASON_LABELS: Record<OverrideReasonCode, string> = {
  COMPETITOR_OOS: 'Competitor Out-of-Stock',
  NEW_DEALER: 'New Dealer Onboarding',
  REGULATION: 'Regulatory Change',
  EVENT: 'Special Event',
  OTHER: 'Other',
};

const CONFIDENCE_LABELS: Record<OverrideConfidence, string> = {
  low: 'Low (20% weight)',
  medium: 'Medium (40% weight)',
  high: 'High (70% weight)',
};

// =============================================
// Component
// =============================================

export function ConsensusPipelinePanel() {
  const [selectedStep, setSelectedStep] = useState(1);
  const [skuCategory, setSkuCategory] = useState<SKUCategory>('general');
  const [promoIndex, setPromoIndex] = useState(1.2);
  const [baselinePromoIndex] = useState(1.0);
  const [beta2] = useState(0.5);
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([
    {
      skuId: 'SKU-001',
      month: '2025-04',
      overrideQty: 700,
      reasonCode: 'COMPETITOR_OOS',
      reasonText: 'Key competitor facing supply chain issues, expect demand shift',
      submittedBy: 'Sales Team BD',
      submittedAt: '2025-01-15T10:00:00Z',
      confidenceLevel: 'medium',
    },
    {
      skuId: 'SKU-001',
      month: '2025-06',
      overrideQty: 300,
      reasonCode: 'EVENT',
      reasonText: 'Monsoon arriving early this year per met department',
      submittedBy: 'Field Rep Dhaka',
      submittedAt: '2025-01-14T08:30:00Z',
      confidenceLevel: 'high',
    },
  ]);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(EMPTY_OVERRIDE);
  const [showForm, setShowForm] = useState(false);

  // Prophet forecast (demo)
  const prophetForecast = useMemo(() => generateDemoProphetForecast(), []);

  // Run consensus engine
  const consensusResult: ConsensusResult = useMemo(() => {
    return calculateConsensusForecast({
      prophetForecast,
      skuCategory,
      promoCoefficientBeta2: beta2,
      plannedPromoIndex: promoIndex,
      baselinePromoIndex,
      manualOverrides,
    });
  }, [prophetForecast, skuCategory, beta2, promoIndex, baselinePromoIndex, manualOverrides]);

  // Build baseline vs consensus chart data
  const chartData = useMemo(() => {
    return consensusResult.breakdown.map((step) => ({
      month: step.month,
      baseline: step.step1Prophet,
      consensus: step.consensusForecast,
      afterSeasonal: step.step2AfterSeasonal,
      afterMarketing: step.step3AfterMarketing,
      afterOverride: step.step4AfterOverride,
    }));
  }, [consensusResult]);

  // Pipeline step values (for the flow diagram)
  const stepValues = useMemo(() => {
    if (!consensusResult.breakdown.length) return [];
    const first = consensusResult.breakdown[0];
    return [
      { before: 0, after: Math.round(first.step1Prophet) },
      { before: Math.round(first.step1Prophet), after: Math.round(first.step2AfterSeasonal) },
      { before: Math.round(first.step2AfterSeasonal), after: Math.round(first.step3AfterMarketing) },
      { before: Math.round(first.step3AfterMarketing), after: Math.round(first.step4AfterOverride) },
      { before: Math.round(first.step4AfterOverride), after: Math.round(first.consensusForecast) },
    ];
  }, [consensusResult]);

  const handleAddOverride = () => {
    const qty = parseInt(overrideForm.overrideQty);
    if (isNaN(qty) || qty <= 0) return;
    const newOverride: ManualOverride = {
      skuId: 'SKU-001',
      month: overrideForm.month,
      overrideQty: qty,
      reasonCode: overrideForm.reasonCode,
      reasonText: overrideForm.reasonText,
      submittedBy: 'Current User',
      submittedAt: new Date().toISOString(),
      confidenceLevel: overrideForm.confidenceLevel,
    };
    setManualOverrides((prev) => [...prev, newOverride]);
    setOverrideForm(EMPTY_OVERRIDE);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Consensus Forecast Pipeline</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              5-Step Pipeline
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Prophet baseline adjusted through seasonal weights, marketing, and sales intelligence
          </p>
        </CardHeader>
      </Card>

      {/* Pipeline Flow Diagram */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {PIPELINE_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center shrink-0">
                <button
                  onClick={() => setSelectedStep(step.key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all min-w-[100px]',
                    selectedStep === step.key
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  )}
                >
                  <div className={cn('p-1.5 rounded-md', step.bg)}>
                    <step.icon className={cn('h-4 w-4', step.color)} />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">{step.label}</span>
                  {stepValues[idx] && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {stepValues[idx].after}
                    </span>
                  )}
                </button>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-0.5" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Detail Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {(() => { const s = PIPELINE_STEPS[selectedStep - 1]; return (
              <>
                <s.icon className={cn('h-4 w-4', s.color)} />
                Step {selectedStep}: {s.label}
              </>
            ); })()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Quantitative baseline from Prophet engine (yhat values)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {consensusResult.breakdown.map((step) => (
                  <div key={step.month} className="p-2 rounded-md bg-muted/50 text-xs">
                    <p className="text-muted-foreground">{step.month}</p>
                    <p className="font-mono font-semibold">{Math.round(step.step1Prophet)}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <p>Model: Prophet (Fourier order 2, Changepoint range 0.8)</p>
                <p>Category: <Badge variant="outline" className="text-[10px]">{skuCategory}</Badge></p>
              </div>
            </div>
          )}

          {selectedStep === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">BD seasonal weight multipliers by month and SKU category</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium">Category:</span>
                {(['general', 'cold_weather', 'off_road', 'street'] as SKUCategory[]).map((cat) => (
                  <Button
                    key={cat}
                    variant={skuCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => setSkuCategory(cat)}
                  >
                    {cat.replace('_', ' ')}
                  </Button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 px-2 text-left font-medium">Month</th>
                      <th className="py-1.5 px-2 text-right font-medium">General</th>
                      <th className="py-1.5 px-2 text-right font-medium">Cold-W</th>
                      <th className="py-1.5 px-2 text-right font-medium">Off-R</th>
                      <th className="py-1.5 px-2 text-right font-medium">Street</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BD_SEASONAL_WEIGHTS.map((w) => (
                      <tr key={w.month} className="border-b border-border/50">
                        <td className="py-1.5 px-2">{w.monthName}</td>
                        <td className={cn('py-1.5 px-2 text-right font-mono', skuCategory === 'general' && w.general !== 1.0 && 'font-semibold text-amber-600')}>{w.general.toFixed(1)}</td>
                        <td className={cn('py-1.5 px-2 text-right font-mono', skuCategory === 'cold_weather' && w.cold_weather !== 1.0 && 'font-semibold text-amber-600')}>{w.cold_weather.toFixed(1)}</td>
                        <td className={cn('py-1.5 px-2 text-right font-mono', skuCategory === 'off_road' && w.off_road !== 1.0 && 'font-semibold text-amber-600')}>{w.off_road.toFixed(1)}</td>
                        <td className={cn('py-1.5 px-2 text-right font-mono', skuCategory === 'street' && w.street !== 1.0 && 'font-semibold text-amber-600')}>{w.street.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {consensusResult.breakdown.map((step) => (
                  <div key={step.month} className="p-2 rounded-md bg-amber-500/5 border border-amber-500/10 text-xs">
                    <p className="text-muted-foreground">{step.month}</p>
                    <p className="font-mono">{Math.round(step.step1Prophet)} x {step.seasonalWeightUsed.toFixed(2)} = <span className="font-semibold">{Math.round(step.step2AfterSeasonal)}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Marketing adjustment: promo_adjustment = beta_2 * (planned_promo - baseline_promo)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Beta-2 (promo coeff)</p>
                  <p className="text-lg font-mono font-semibold">{beta2}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Promo Index (planned)</p>
                  <p className="text-lg font-mono font-semibold">{promoIndex.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Baseline Promo Index</p>
                  <p className="text-lg font-mono font-semibold">{baselinePromoIndex.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-md bg-rose-500/5 border border-rose-500/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Promo Adjustment</p>
                  <p className="text-lg font-mono font-semibold text-rose-600">
                    {consensusResult.breakdown[0]?.promoAdjustment > 0 ? '+' : ''}
                    {consensusResult.breakdown[0]?.promoAdjustment.toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium">Planned Promo Index:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={promoIndex}
                  onChange={(e) => setPromoIndex(parseFloat(e.target.value))}
                  className="flex-1 h-2 accent-rose-500"
                />
                <span className="text-xs font-mono w-8">{promoIndex.toFixed(1)}</span>
              </div>
            </div>
          )}

          {selectedStep === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Manual overrides blended by confidence level</p>
              {manualOverrides.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No overrides applied</p>
              ) : (
                <div className="space-y-2">
                  {manualOverrides.map((ovr, idx) => (
                    <div key={idx} className="p-2.5 rounded-md bg-sky-500/5 border border-sky-500/10 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ovr.month}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{ovr.confidenceLevel}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{REASON_LABELS[ovr.reasonCode]}</Badge>
                        </div>
                      </div>
                      <p className="font-mono mt-1">Override qty: <span className="font-semibold">{ovr.overrideQty}</span></p>
                      {ovr.reasonText && <p className="text-muted-foreground mt-0.5">{ovr.reasonText}</p>}
                      <p className="text-muted-foreground mt-0.5">By: {ovr.submittedBy}</p>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {consensusResult.breakdown.map((step) => (
                  <div key={step.month} className={cn(
                    'p-2 rounded-md text-xs',
                    step.overrideApplied ? 'bg-sky-500/5 border border-sky-500/10' : 'bg-muted/50'
                  )}>
                    <p className="text-muted-foreground">{step.month} {step.overrideApplied && '(override)'}</p>
                    <p className="font-mono font-semibold">{Math.round(step.step4AfterOverride)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStep === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Final consensus forecast - the &quot;Single Set of Numbers&quot;</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {consensusResult.breakdown.map((step) => (
                  <div key={step.month} className="p-3 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-xs text-muted-foreground">{step.month}</p>
                    <p className="text-lg font-mono font-semibold text-emerald-600">{step.consensusForecast}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Baseline: {Math.round(step.step1Prophet)} ({step.consensusForecast > step.step1Prophet ? '+' : ''}
                      {Math.round(step.consensusForecast - step.step1Prophet)})
                    </p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 rounded-md bg-muted/50 text-center">
                  <p className="text-muted-foreground">Overrides</p>
                  <p className="font-mono font-semibold">{consensusResult.totalOverrideCount}</p>
                </div>
                <div className="p-2 rounded-md bg-muted/50 text-center">
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-mono font-semibold">{consensusResult.skuCategory}</p>
                </div>
                <div className="p-2 rounded-md bg-muted/50 text-center">
                  <p className="text-muted-foreground">Beta-2</p>
                  <p className="font-mono font-semibold">{consensusResult.promoBeta2}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consensus vs Baseline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            Consensus vs Baseline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as typeof chartData[0] | undefined;
                  if (!d) return null;
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs space-y-1">
                      <p className="font-medium">{label}</p>
                      <p>Baseline: <span className="font-mono font-semibold">{d.baseline}</span></p>
                      <p>Consensus: <span className="font-mono font-semibold text-emerald-600">{d.consensus}</span></p>
                      <p className="text-muted-foreground">
                        Gap: {d.consensus - d.baseline > 0 ? '+' : ''}{d.consensus - d.baseline}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {/* Adjustment gap area */}
              <Area type="monotone" dataKey="baseline" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.05} strokeWidth={2} name="Baseline (Prophet)" />
              <Line type="monotone" dataKey="consensus" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Consensus" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Override Form */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-sky-500" />
              Add Manual Override
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'New Override'}
            </Button>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Month</label>
                <Select value={overrideForm.month} onValueChange={(v) => setOverrideForm({ ...overrideForm, month: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Override Quantity</label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="e.g. 700"
                  value={overrideForm.overrideQty}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideQty: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Reason Code</label>
                <Select value={overrideForm.reasonCode} onValueChange={(v) => setOverrideForm({ ...overrideForm, reasonCode: v as OverrideReasonCode })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REASON_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Confidence Level</label>
                <Select value={overrideForm.confidenceLevel} onValueChange={(v) => setOverrideForm({ ...overrideForm, confidenceLevel: v as OverrideConfidence })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONFIDENCE_LABELS).map(([level, label]) => (
                      <SelectItem key={level} value={level}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Reason Text</label>
              <Textarea
                className="text-xs min-h-[60px]"
                placeholder="Explain the override reason..."
                value={overrideForm.reasonText}
                onChange={(e) => setOverrideForm({ ...overrideForm, reasonText: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs" onClick={handleAddOverride} disabled={!overrideForm.overrideQty || !overrideForm.reasonText}>
                <Sliders className="h-3 w-3 mr-1" />
                Submit Override
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
