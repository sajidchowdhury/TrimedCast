'use client';

// ============================================
// TrimedCast — Customs Duty Calculator
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  FileText,
  Landmark,
  Percent,
  Globe,
  Package,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useFinanceStore } from '@/stores/finance-store';
import type { CustomsDutyItem } from '@/components/finance/types';
import {
  BD_TAX_RATES,
  formatBDT,
  formatPct,
} from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

// ─── Types ───────────────────────────────────────────────────────────

interface CalcResult {
  totalValue: number;
  customsDuty: number;
  suppDuty: number;
  vat: number;
  ait: number;
  totalDuty: number;
  landedCost: number;
}

// ─── Duty Calculation ────────────────────────────────────────────────

function calculateDuty(
  quantity: number,
  unitValue: number,
  dutyRate: number,
  cdRate: number,
  vatRate: number,
  aitRate: number
): CalcResult {
  const totalValue = quantity * unitValue;
  const customsDuty = totalValue * (dutyRate / 100);
  const suppDuty = totalValue * (cdRate / 100);
  // VAT is on (CIF + CD + SD) in BD structure
  const vatBase = totalValue + customsDuty + suppDuty;
  const vat = vatBase * (vatRate / 100);
  // AIT is on CIF value
  const ait = totalValue * (aitRate / 100);
  const totalDuty = customsDuty + suppDuty + vat + ait;
  const landedCost = totalValue + totalDuty;

  return {
    totalValue: Math.round(totalValue),
    customsDuty: Math.round(customsDuty),
    suppDuty: Math.round(suppDuty),
    vat: Math.round(vat),
    ait: Math.round(ait),
    totalDuty: Math.round(totalDuty),
    landedCost: Math.round(landedCost),
  };
}

// ─── Duty Breakdown Hover Tooltip ────────────────────────────────────

function DutyBreakdown({ item }: { item: CustomsDutyItem }) {
  const totalValue = item.totalValueBdt;
  const cd = Math.round(totalValue * (item.dutyRate / 100));
  const sd = Math.round(totalValue * (item.cdRate / 100));
  const vatBase = totalValue + cd + sd;
  const vat = Math.round(vatBase * (item.vatRate / 100));
  const ait = Math.round(totalValue * (item.aitRate / 100));

  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Customs Duty ({item.dutyRate}%):</span>
        <span className="font-medium">{formatBDT(cd)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Supp. Duty ({item.cdRate}%):</span>
        <span className="font-medium">{formatBDT(sd)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">VAT ({item.vatRate}%):</span>
        <span className="font-medium">{formatBDT(vat)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">AIT ({item.aitRate}%):</span>
        <span className="font-medium">{formatBDT(ait)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function CustomsCalculator() {
  const { customsItems, fetchCustomsItems, isLoading } = useFinanceStore();

  // Collapsible state for tax reference
  const [taxRefOpen, setTaxRefOpen] = useState(false);

  // Expanded row for duty breakdown
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Calculator input state
  const [hsCode, setHsCode] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('China');
  const [quantity, setQuantity] = useState('1');
  const [unitValue, setUnitValue] = useState('0');
  const [dutyRate, setDutyRate] = useState('10');
  const [cdRate, setCdRate] = useState('0');
  const [vatRate, setVatRate] = useState('15');
  const [aitRate, setAitRate] = useState('3');

  useEffect(() => {
    if (customsItems.length === 0) {
      fetchCustomsItems();
    }
  }, [customsItems.length, fetchCustomsItems]);

  // Real-time calculation
  const calcResult = useMemo<CalcResult>(() => {
    const q = parseFloat(quantity) || 0;
    const uv = parseFloat(unitValue) || 0;
    const dr = parseFloat(dutyRate) || 0;
    const cdr = parseFloat(cdRate) || 0;
    const vr = parseFloat(vatRate) || 0;
    const ar = parseFloat(aitRate) || 0;

    return calculateDuty(q, uv, dr, cdr, vr, ar);
  }, [quantity, unitValue, dutyRate, cdRate, vatRate, aitRate]);

  // Summary totals from all customs items
  const totals = useMemo(() => {
    const totalImportValue = customsItems.reduce((sum, i) => sum + i.totalValueBdt, 0);
    const totalDuties = customsItems.reduce((sum, i) => sum + i.totalDutyBdt, 0);
    const totalLandedCost = customsItems.reduce((sum, i) => sum + i.landedCostBdt, 0);
    const effectiveRate = totalImportValue > 0 ? (totalDuties / totalImportValue) * 100 : 0;

    return { totalImportValue, totalDuties, totalLandedCost, effectiveRate };
  }, [customsItems]);

  const toggleRow = useCallback(
    (id: string) => {
      setExpandedRow((prev) => (prev === id ? null : id));
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Customs Duty Calculator
          </h2>
          <p className="text-sm text-muted-foreground">কাস্টমস শুল্ক ক্যালকুলেটর</p>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
        >
          <Landmark className="h-3.5 w-3.5" />
          BD Import Tax Structure
        </Badge>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ── Tax Rate Reference (Collapsible) ──────────────────────── */}
        <motion.div variants={itemVariants}>
          <Collapsible open={taxRefOpen} onOpenChange={setTaxRefOpen}>
            <Card className="shadow-sm">
              <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Bangladesh Tax Rate Reference</CardTitle>
                      </div>
                      {taxRefOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      NBR tariff schedule for motorcycle parts imports
                    </CardDescription>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Customs Duty */}
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold">Customs Duty</span>
                      </div>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {BD_TAX_RATES.customsDuty.min}–{BD_TAX_RATES.customsDuty.max}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {BD_TAX_RATES.customsDuty.description}
                      </p>
                    </div>

                    {/* Supplementary Duty */}
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-semibold">Supplementary Duty</span>
                      </div>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {BD_TAX_RATES.supplementaryDuty.min}–{BD_TAX_RATES.supplementaryDuty.max}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {BD_TAX_RATES.supplementaryDuty.description}
                      </p>
                    </div>

                    {/* VAT */}
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold">VAT</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {BD_TAX_RATES.vat.rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {BD_TAX_RATES.vat.description}
                      </p>
                    </div>

                    {/* Advance Income Tax */}
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-sky-500" />
                        <span className="text-xs font-semibold">Advance Income Tax</span>
                      </div>
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        {BD_TAX_RATES.advanceIncomeTax.min}–{BD_TAX_RATES.advanceIncomeTax.max}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {BD_TAX_RATES.advanceIncomeTax.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>

        {/* ── Items Table ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Import Items & Duty Breakdown</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Click a row to expand duty calculation details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pt-0">
              {/* Desktop Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">HS Code</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Origin</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Unit Value</TableHead>
                      <TableHead className="text-xs text-right">Total Value</TableHead>
                      <TableHead className="text-xs text-center">CD%</TableHead>
                      <TableHead className="text-xs text-center">SD%</TableHead>
                      <TableHead className="text-xs text-center">VAT%</TableHead>
                      <TableHead className="text-xs text-center">AIT%</TableHead>
                      <TableHead className="text-xs text-right">Total Duty</TableHead>
                      <TableHead className="text-xs text-right">Landed Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && customsItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    )}
                    {customsItems.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        variants={rowVariants}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleRow(item.id)}
                      >
                        <TableCell className="text-xs font-mono">{item.hsCode}</TableCell>
                        <TableCell className="text-xs">
                          <div>{item.description}</div>
                          <div className="text-muted-foreground text-[10px]">{item.descriptionBn}</div>
                        </TableCell>
                        <TableCell className="text-xs">{item.originCountry}</TableCell>
                        <TableCell className="text-xs text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right">{formatBDT(item.unitValueBdt)}</TableCell>
                        <TableCell className="text-xs text-right">{formatBDT(item.totalValueBdt)}</TableCell>
                        <TableCell className="text-xs text-center">{item.dutyRate}%</TableCell>
                        <TableCell className="text-xs text-center">{item.cdRate}%</TableCell>
                        <TableCell className="text-xs text-center">{item.vatRate}%</TableCell>
                        <TableCell className="text-xs text-center">{item.aitRate}%</TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatBDT(item.totalDutyBdt)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {formatBDT(item.landedCostBdt)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Expanded Duty Breakdown */}
              <AnimatePresence>
                {expandedRow && customsItems.find((i) => i.id === expandedRow) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        Duty Breakdown:{' '}
                        {customsItems.find((i) => i.id === expandedRow)?.description}
                      </span>
                    </div>
                    {(() => {
                      const item = customsItems.find((i) => i.id === expandedRow);
                      return item ? <DutyBreakdown item={item} /> : null;
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Calculator Input Section ─────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Duty Calculator</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Enter item details to calculate landed cost in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: HS Code, Description, Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    HS Code
                  </Label>
                  <Input
                    placeholder="e.g. 8407.31"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Description
                  </Label>
                  <Input
                    placeholder="e.g. Motorcycle Engine 250cc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Origin Country
                  </Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Thailand">Thailand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Quantity, Unit Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Quantity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <CircleDollarSign className="h-3 w-3" />
                    Unit Value (BDT)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={unitValue}
                    onChange={(e) => setUnitValue(e.target.value)}
                    className="text-sm h-9"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Row 3: Duty rates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Duty Rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="25"
                    value={dutyRate}
                    onChange={(e) => setDutyRate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SD Rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={cdRate}
                    onChange={(e) => setCdRate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">VAT Rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">AIT Rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={aitRate}
                    onChange={(e) => setAitRate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
              </div>

              <Separator />

              {/* Real-time Results */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Calculation Result</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">Total Value</p>
                    <p className="text-sm font-bold">{formatBDT(calcResult.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">Customs Duty</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatBDT(calcResult.customsDuty)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">Supp. Duty</p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {formatBDT(calcResult.suppDuty)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">VAT</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(calcResult.vat)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">AIT</p>
                    <p className="text-sm font-bold text-sky-600 dark:text-sky-400">
                      {formatBDT(calcResult.ait)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5 bg-red-50/50 dark:bg-red-950/20">
                    <p className="text-[10px] text-muted-foreground">Total Duty</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatBDT(calcResult.totalDuty)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-0.5 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <p className="text-[10px] text-muted-foreground">Landed Cost</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(calcResult.landedCost)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Summary Totals ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-emerald-200 dark:border-emerald-800/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base">Import Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Import Value */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    Total Import Value
                  </p>
                  <p className="text-lg font-bold tracking-tight">
                    {formatBDT(totals.totalImportValue)}
                  </p>
                </div>

                {/* Total Duties */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5" />
                    Total Duties
                  </p>
                  <p className="text-lg font-bold tracking-tight text-red-600 dark:text-red-400">
                    {formatBDT(totals.totalDuties)}
                  </p>
                </div>

                {/* Total Landed Cost */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Total Landed Cost
                  </p>
                  <p className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                    {formatBDT(totals.totalLandedCost)}
                  </p>
                </div>

                {/* Effective Duty Rate */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5" />
                    Effective Duty Rate
                  </p>
                  <p className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {formatPct(totals.effectiveRate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
