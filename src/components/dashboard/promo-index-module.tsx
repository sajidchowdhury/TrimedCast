'use client';

// ============================================
// Promo Index Module — Marketing Input Module
// Implements UI/UX Spec Section 4:
// Promo Index & Qualitative Adjustment
// ============================================

import * as React from 'react';
import { format, addMonths, startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Calendar,
  TrendingUp,
  Plus,
  Zap,
  BarChart3,
  Edit2,
  ChevronDown,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================

type PromoEventType = 'eid_discount' | 'seasonal_sale' | 'clearance' | 'flash_sale';

interface PromoEvent {
  id: string;
  name: string;
  type: PromoEventType;
  startDate: string;
  endDate: string;
  discountPct: number;
  expectedUplift: number;
  isActive: boolean;
  affectedCategories?: string[];
}

interface BDSeason {
  season: string;
  bengali: string;
  color: string;
}

// ============================================
// Constants & Sample Data
// ============================================

const SAMPLE_PROMO_EVENTS: PromoEvent[] = [
  {
    id: '1',
    name: 'Eid ul-Fitr Sale 2025',
    type: 'eid_discount',
    startDate: '2025-03-28',
    endDate: '2025-04-05',
    discountPct: 15,
    expectedUplift: 0.35,
    isActive: true,
    affectedCategories: ['Brake Pads', 'Chain Kits', 'Filters'],
  },
  {
    id: '2',
    name: 'Winter Season Launch',
    type: 'seasonal_sale',
    startDate: '2025-10-01',
    endDate: '2025-11-15',
    discountPct: 10,
    expectedUplift: 0.25,
    isActive: true,
    affectedCategories: ['Engine Oil', 'Spark Plugs', 'Batteries'],
  },
  {
    id: '3',
    name: 'Durga Puja Promo',
    type: 'seasonal_sale',
    startDate: '2025-10-08',
    endDate: '2025-10-15',
    discountPct: 12,
    expectedUplift: 0.30,
    isActive: true,
    affectedCategories: ['Brake Pads', 'Tires', 'Bearings'],
  },
  {
    id: '4',
    name: 'Year-End Clearance',
    type: 'clearance',
    startDate: '2025-12-20',
    endDate: '2025-12-31',
    discountPct: 25,
    expectedUplift: 0.40,
    isActive: false,
    affectedCategories: ['All Categories'],
  },
];

const PROMO_TYPE_LABELS: Record<PromoEventType, string> = {
  eid_discount: 'Eid Discount',
  seasonal_sale: 'Seasonal Sale',
  clearance: 'Clearance',
  flash_sale: 'Flash Sale',
};

const PROMO_TYPE_COLORS: Record<PromoEventType, string> = {
  eid_discount: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  seasonal_sale: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  clearance: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20',
  flash_sale: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
};

const AFFECTED_CATEGORIES = [
  'Brake Pads',
  'Chain Kits',
  'Filters',
  'Engine Oil',
  'Spark Plugs',
  'Batteries',
  'Tires',
  'Bearings',
  'Clutch Plates',
  'Cables',
  'All Categories',
];

// Beta defaults for the regression model
const BETA_0 = 120; // base demand (units)
const BETA_1 = -0.35; // price elasticity coefficient
const DEFAULT_PRICE = 100; // assumed price unit for demo

// ============================================
// Utility Functions
// ============================================

function detectBDSeason(month: number): BDSeason {
  if (month >= 10 || month <= 1) return { season: 'Winter', bengali: '\u09B6\u09C0\u09A4', color: '#3B82F6' };
  if (month >= 8 && month <= 9) return { season: 'Pre-Winter', bengali: '\u09B6\u09B0\u09CE', color: '#F59E0B' };
  if (month >= 6 && month <= 7) return { season: 'Monsoon', bengali: '\u09AC\u09B0\u09CD\u09B7\u09BE', color: '#10B981' };
  return { season: 'Summer', bengali: '\u0997\u09CD\u09B0\u09C0\u09B7\u09CD\u09AE', color: '#EF4444' };
}

function detectSeasonFromRange(start: Date, end: Date): BDSeason {
  const midMonth = new Date((start.getTime() + end.getTime()) / 2).getMonth() + 1;
  return detectBDSeason(midMonth);
}

function getPromoIntensityColor(value: number): string {
  if (value <= 0.3) return 'text-emerald-500';
  if (value <= 0.6) return 'text-amber-500';
  return 'text-rose-500';
}

function getPromoIntensityBg(value: number): string {
  if (value <= 0.3) return 'bg-emerald-500';
  if (value <= 0.6) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getPromoIntensityLabel(value: number): string {
  if (value === 0) return 'No Promo';
  if (value <= 0.15) return 'Minimal';
  if (value <= 0.3) return 'Low';
  if (value <= 0.45) return 'Moderate';
  if (value <= 0.6) return 'High';
  if (value <= 0.8) return 'Very High';
  return 'Maximum';
}

function getRiskLevel(value: number): { label: string; color: string } {
  if (value <= 0.3) return { label: 'Low Risk', color: 'text-emerald-600 dark:text-emerald-400' };
  if (value <= 0.6) return { label: 'Medium Risk', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'High Risk', color: 'text-rose-600 dark:text-rose-400' };
}

function generateForecastData(promoIndex: number): Array<{
  month: string;
  baseline: number;
  adjusted: number;
}> {
  const now = new Date();
  const data: Array<{ month: string; baseline: number; adjusted: number }> = [];

  // Monthly seasonal multipliers for BD motorcycle parts demand
  const seasonalFactors = [0.85, 0.80, 0.90, 0.95, 1.00, 0.70, 0.65, 0.75, 0.90, 1.10, 1.20, 1.15];

  for (let i = 0; i < 6; i++) {
    const monthDate = addMonths(startOfMonth(now), i);
    const monthIdx = monthDate.getMonth();
    const baseDemand = BETA_0 * seasonalFactors[monthIdx];
    const promoBoost = baseDemand * promoIndex * 0.45;
    const adjusted = baseDemand + promoBoost;

    data.push({
      month: format(monthDate, 'MMM'),
      baseline: Math.round(baseDemand),
      adjusted: Math.round(adjusted),
    });
  }
  return data;
}

function formatBDT(value: number): string {
  return `\u09F3${value.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================
// Sub-Components
// ============================================

/** Gradient bar behind the promo index slider */
function PromoGradientBar({ value }: { value: number }) {
  return (
    <div className="relative h-3 w-full rounded-full overflow-hidden mb-2">
      <div className="absolute inset-0 flex">
        <div className="bg-emerald-500/70" style={{ width: '30%' }} />
        <div className="bg-amber-500/70" style={{ width: '30%' }} />
        <div className="bg-rose-500/70" style={{ width: '40%' }} />
      </div>
      <motion.div
        className="absolute top-0 left-0 h-full bg-white/20 dark:bg-white/10"
        initial={{ width: '0%' }}
        animate={{ width: `${value * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-white dark:bg-gray-200 shadow-sm"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  );
}

/** Season badge component */
function SeasonBadge({ season }: { season: BDSeason }) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium"
      style={{ borderColor: season.color, color: season.color }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: season.color }}
      />
      {season.season}
      <span className="text-muted-foreground font-normal">({season.bengali})</span>
    </Badge>
  );
}

/** Date picker popover with Calendar */
function DatePickerField({
  label,
  date,
  onDateChange,
  id,
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  id: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal text-sm',
              !date && 'text-muted-foreground'
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {date ? format(date, 'dd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Mini forecast chart */
function ForecastPreviewChart({ promoIndex }: { promoIndex: number }) {
  const data = React.useMemo(() => generateForecastData(promoIndex), [promoIndex]);

  const upliftPct =
    data.length > 0
      ? ((data[data.length - 1].adjusted - data[data.length - 1].baseline) /
          data[data.length - 1].baseline) *
        100
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">6-Month Forecast Preview</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={upliftPct.toFixed(1)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1"
          >
            <TrendingUp
              className={cn(
                'h-3.5 w-3.5',
                upliftPct > 0 ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                upliftPct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {upliftPct > 0 ? `+${upliftPct.toFixed(1)}%` : '0%'} uplift
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <RechartsTooltip
              contentStyle={{
                fontSize: 12,
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--muted-foreground))' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="adjusted"
              name="Adjusted"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Beta coefficient formula display */
function BetaFormulaDisplay({ promoIndex }: { promoIndex: number }) {
  const beta2 = promoIndex * 0.45;
  const adjustedDemand = BETA_0 + BETA_1 * DEFAULT_PRICE + beta2 * 100;
  const risk = getRiskLevel(promoIndex);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Regression Model</span>
      </div>

      {/* Formula */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-mono text-muted-foreground">
          D(F) = {'\u03B2'}<sub>0</sub> + {'\u03B2'}<sub>1</sub>(Price) + {'\u03B2'}<sub>2</sub>(Promo)
        </p>

        <Separator />

        {/* Coefficients */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {'\u03B2'}<sub>0</sub> Intercept
            </p>
            <p className="text-lg font-bold tabular-nums">{BETA_0}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {'\u03B2'}<sub>1</sub> Price Elast.
            </p>
            <p className="text-lg font-bold tabular-nums text-rose-500">{BETA_1}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {'\u03B2'}<sub>2</sub> Promo Impact
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={beta2.toFixed(3)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'text-lg font-bold tabular-nums',
                  promoIndex > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                )}
              >
                {beta2.toFixed(3)}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Adjusted demand result */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Adjusted Demand (units)</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={adjustedDemand.toFixed(1)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="text-xl font-bold tabular-nums"
            >
              {adjustedDemand.toFixed(1)}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-xs text-muted-foreground">Risk Level</p>
          <p className={cn('text-sm font-semibold', risk.color)}>{risk.label}</p>
        </div>
      </div>
    </div>
  );
}

/** Active promo events table */
function PromoEventsTable({
  events,
  onToggleActive,
  onDelete,
}: {
  events: PromoEvent[];
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const now = new Date();

  function getEventStatus(event: PromoEvent): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
    if (!event.isActive) return { label: 'Inactive', variant: 'outline' };
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    if (isWithinInterval(now, { start, end })) return { label: 'Active', variant: 'default' };
    if (start > now) return { label: 'Upcoming', variant: 'secondary' };
    return { label: 'Expired', variant: 'destructive' };
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Megaphone className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No promo events configured</p>
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto custom-scrollbar">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Uplift</TableHead>
            <TableHead className="w-8">Active</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const status = getEventStatus(event);
            return (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge variant={status.variant} className="text-[10px] px-1.5">
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm max-w-[160px] truncate">
                  {event.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5', PROMO_TYPE_COLORS[event.type])}
                  >
                    {PROMO_TYPE_LABELS[event.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(parseISO(event.startDate), 'dd MMM')} - {format(parseISO(event.endDate), 'dd MMM')}
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums">
                  {event.discountPct}%
                </TableCell>
                <TableCell className="text-right text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{(event.expectedUplift * 100).toFixed(0)}%
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onToggleActive(event.id)}
                          className="inline-flex items-center justify-center"
                          aria-label={event.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {event.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {event.isActive ? 'Click to deactivate' : 'Click to activate'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onDelete(event.id)}
                          className="inline-flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Remove event
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** Add promo event dialog form */
function AddPromoEventDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: Omit<PromoEvent, 'id'>) => void;
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<PromoEventType>('seasonal_sale');
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [discountPct, setDiscountPct] = React.useState('10');
  const [expectedUplift, setExpectedUplift] = React.useState('0.20');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Detected season from date range
  const detectedSeason = React.useMemo(() => {
    if (startDate && endDate) {
      return detectSeasonFromRange(startDate, endDate);
    }
    return null;
  }, [startDate, endDate]);

  function resetForm() {
    setName('');
    setType('seasonal_sale');
    setStartDate(undefined);
    setEndDate(undefined);
    setDiscountPct('10');
    setExpectedUplift('0.20');
    setSelectedCategories([]);
  }

  function handleCategoryToggle(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit() {
    if (!name || !startDate || !endDate) return;

    setIsSubmitting(true);

    const newEvent: Omit<PromoEvent, 'id'> = {
      name,
      type,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      discountPct: parseFloat(discountPct) || 0,
      expectedUplift: parseFloat(expectedUplift) || 0,
      isActive: true,
      affectedCategories: selectedCategories,
    };

    try {
      // POST to API
      const res = await fetch('/api/v1/promo-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      if (res.ok) {
        const created = await res.json();
        onSubmit({ ...newEvent, id: created.id || crypto.randomUUID() });
      } else {
        // Fallback: still add locally even if API fails
        onSubmit({ ...newEvent });
      }
    } catch {
      // Fallback: still add locally
      onSubmit({ ...newEvent });
    }

    setIsSubmitting(false);
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Promo Event
          </DialogTitle>
          <DialogDescription>
            Create a new promotional event for demand forecasting adjustments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="promo-name" className="text-sm font-medium">
              Event Name
            </Label>
            <Input
              id="promo-name"
              placeholder="e.g., Eid ul-Adha Sale 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Promo Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PromoEventType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eid_discount">Eid Discount</SelectItem>
                <SelectItem value="seasonal_sale">Seasonal Sale</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
                <SelectItem value="flash_sale">Flash Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <DatePickerField
              label="Start Date"
              date={startDate}
              onDateChange={setStartDate}
              id="promo-start"
            />
            <DatePickerField
              label="End Date"
              date={endDate}
              onDateChange={setEndDate}
              id="promo-end"
            />
          </div>

          {/* Detected Season */}
          {detectedSeason && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Detected Season:</span>
              <SeasonBadge season={detectedSeason} />
            </motion.div>
          )}

          {/* Discount % & Expected Uplift */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount-pct" className="text-sm font-medium">
                Discount %
              </Label>
              <Input
                id="discount-pct"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected-uplift" className="text-sm font-medium">
                Expected Uplift
              </Label>
              <Input
                id="expected-uplift"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={expectedUplift}
                onChange={(e) => setExpectedUplift(e.target.value)}
              />
            </div>
          </div>

          {/* Affected Categories */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Affected Categories</Label>
            <div className="flex flex-wrap gap-1.5">
              {AFFECTED_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !startDate || !endDate || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component: PromoIndexModule
// ============================================

interface PromoIndexModuleProps {
  className?: string;
}

export function PromoIndexModule({ className }: PromoIndexModuleProps) {
  // --- Promo Index State ---
  const [promoIndex, setPromoIndex] = React.useState(0);
  const [promoInputValue, setPromoInputValue] = React.useState('0.00');

  // --- Campaign Date State ---
  const [campaignStart, setCampaignStart] = React.useState<Date | undefined>(undefined);
  const [campaignEnd, setCampaignEnd] = React.useState<Date | undefined>(undefined);

  // --- Promo Events State ---
  const [promoEvents, setPromoEvents] = React.useState<PromoEvent[]>(SAMPLE_PROMO_EVENTS);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  // --- Derived State ---
  const beta2 = promoIndex * 0.45;
  const intensityLabel = getPromoIntensityLabel(promoIndex);
  const riskLevel = getRiskLevel(promoIndex);

  // Detect season from campaign date range
  const campaignSeason = React.useMemo(() => {
    if (campaignStart && campaignEnd) {
      return detectSeasonFromRange(campaignStart, campaignEnd);
    }
    // Default: detect from current month
    return detectBDSeason(new Date().getMonth() + 1);
  }, [campaignStart, campaignEnd]);

  // Handle slider change
  function handleSliderChange(value: number[]) {
    const v = value[0];
    setPromoIndex(v);
    setPromoInputValue(v.toFixed(2));
  }

  // Handle numeric input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setPromoInputValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      // Snap to nearest 0.05
      const snapped = Math.round(parsed * 20) / 20;
      setPromoIndex(snapped);
    }
  }

  // Handle input blur — snap displayed value
  function handleInputBlur() {
    const snapped = Math.round(promoIndex * 20) / 20;
    setPromoIndex(snapped);
    setPromoInputValue(snapped.toFixed(2));
  }

  // Toggle promo event active state
  function handleToggleActive(id: string) {
    setPromoEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, isActive: !ev.isActive } : ev))
    );
  }

  // Delete promo event
  function handleDeleteEvent(id: string) {
    setPromoEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  // Add new promo event
  function handleAddEvent(event: Omit<PromoEvent, 'id'>) {
    const newEvent: PromoEvent = {
      ...event,
      id: crypto.randomUUID(),
    };
    setPromoEvents((prev) => [...prev, newEvent]);
  }

  // Fetch promo events on mount
  React.useEffect(() => {
    async function fetchPromoEvents() {
      try {
        const res = await fetch('/api/v1/promo-events');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPromoEvents(data);
          }
        }
      } catch {
        // Use sample data as fallback
      }
    }
    fetchPromoEvents();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Megaphone className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">Promo Index & Qualitative Adjustment</h2>
          <p className="text-xs text-muted-foreground">
            Marketing input module for demand forecast adjustment
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ====== LEFT COLUMN ====== */}
        <div className="space-y-4">
          {/* --- Promo Index Slider Card --- */}
          <motion.div
            layout
            transition={{ layout: { duration: 0.2 } }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Promotional Intensity Index
                </CardTitle>
                <CardDescription className="text-xs">
                  Adjust promotional intensity to model demand uplift (0.0 = no promo, 1.0 = maximum)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current value display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={promoIndex.toFixed(2)}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12 }}
                        className={cn('text-3xl font-bold tabular-nums', getPromoIntensityColor(promoIndex))}
                      >
                        {promoIndex.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-muted-foreground">/ 1.00</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-medium',
                        promoIndex <= 0.3
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : promoIndex <= 0.6
                            ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : 'border-rose-500/30 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {intensityLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', riskLevel.color)}
                    >
                      {riskLevel.label}
                    </Badge>
                  </div>
                </div>

                {/* Gradient bar */}
                <PromoGradientBar value={promoIndex} />

                {/* Slider */}
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[promoIndex]}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />

                {/* Numerical input + scale markers */}
                <div className="flex items-center gap-3">
                  <Label htmlFor="promo-index-input" className="text-xs text-muted-foreground whitespace-nowrap">
                    Exact value:
                  </Label>
                  <Input
                    id="promo-index-input"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={promoInputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-24 h-8 text-sm tabular-nums"
                  />
                  <div className="flex-1 flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>0.0</span>
                    <span>0.25</span>
                    <span>0.50</span>
                    <span>0.75</span>
                    <span>1.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* --- Campaign Event Date Picker Card --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-500" />
                Campaign Event Window
              </CardTitle>
              <CardDescription className="text-xs">
                Define the promotional date range for seasonal alignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DatePickerField
                  label="Campaign Start"
                  date={campaignStart}
                  onDateChange={setCampaignStart}
                  id="campaign-start"
                />
                <DatePickerField
                  label="Campaign End"
                  date={campaignEnd}
                  onDateChange={setCampaignEnd}
                  id="campaign-end"
                />
              </div>

              {/* Season detection */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Detected Season</p>
                  <SeasonBadge season={campaignSeason} />
                </div>
                {campaignStart && campaignEnd && (
                  <div className="text-right space-y-0.5">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {Math.max(
                        1,
                        Math.ceil(
                          (campaignEnd.getTime() - campaignStart.getTime()) / (1000 * 60 * 60 * 24)
                        ) + 1
                      )}{' '}
                      days
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* --- Beta Coefficient Display Card --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                Multi-Linear Regression Coefficients
              </CardTitle>
              <CardDescription className="text-xs">
                Demand model coefficients update live as promo index changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BetaFormulaDisplay promoIndex={promoIndex} />
            </CardContent>
          </Card>
        </div>

        {/* ====== RIGHT COLUMN ====== */}
        <div className="space-y-4">
          {/* --- Real-Time Forecast Adjustment Preview --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Real-Time Forecast Adjustment
              </CardTitle>
              <CardDescription className="text-xs">
                Baseline vs adjusted consensus forecast — 6-month forward view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastPreviewChart promoIndex={promoIndex} />
            </CardContent>
          </Card>

          {/* --- Active Promo Events Table --- */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-amber-500" />
                    Promo Events
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {promoEvents.filter((e) => e.isActive).length} active / {promoEvents.length} total
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-0 pb-2 px-2">
              <PromoEventsTable
                events={promoEvents}
                onToggleActive={handleToggleActive}
                onDelete={handleDeleteEvent}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Add Promo Event Dialog --- */}
      <AddPromoEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddEvent}
      />
    </motion.div>
  );
}

export default PromoIndexModule;
