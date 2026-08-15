'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { SERVICE_LEVEL_TABLE } from '@/lib/forecasting/eoq-safety-stock';

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, duration: 0.3 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

function getRowColor(serviceLevel: number): {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
} {
  if (serviceLevel >= 0.999) return { bg: 'bg-red-50', border: 'border-l-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700' };
  if (serviceLevel >= 0.99) return { bg: 'bg-amber-50', border: 'border-l-amber-500', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' };
  if (serviceLevel >= 0.975) return { bg: 'bg-orange-50', border: 'border-l-orange-400', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' };
  if (serviceLevel >= 0.95) return { bg: 'bg-emerald-50', border: 'border-l-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' };
  return { bg: 'bg-slate-50', border: 'border-l-slate-400', badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' };
}

function getUrgencyLabel(serviceLevel: number): string {
  if (serviceLevel >= 0.999) return 'Life-critical';
  if (serviceLevel >= 0.99) return 'Critical';
  if (serviceLevel >= 0.975) return 'High-turnover';
  if (serviceLevel >= 0.95) return 'Standard';
  return 'Low-criticality';
}

export function ServiceLevelTable() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Shield className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">
              Service Level → Safety Factor (k) Mapping
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              z-score lookup for TrimedCast safety stock formula
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[110px] text-xs font-semibold text-slate-600">Service Level</TableHead>
                <TableHead className="w-[80px] text-xs font-semibold text-slate-600">k (z-score)</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-slate-600">Urgency</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">BD Use Case</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SERVICE_LEVEL_TABLE.map((row) => {
                const colors = getRowColor(row.serviceLevel);
                return (
                  <motion.tr
                    key={row.serviceLevel}
                    variants={rowVariants}
                    className={`border-l-4 ${colors.border} ${colors.bg} hover:bg-opacity-80`}
                  >
                    <TableCell className="py-2.5">
                      <span className="text-sm font-bold text-slate-800">
                        {(row.serviceLevel * 100).toFixed(row.serviceLevel >= 0.999 ? 1 : 0)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={`text-xs font-mono font-bold ${colors.badgeBg} ${colors.badgeText} border-0`}>
                        {row.k.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${colors.badgeBg} ${colors.badgeText} border-0`}>
                        {getUrgencyLabel(row.serviceLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-slate-600 leading-tight">{row.useCase}</span>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* BD-specific notes */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600">BD Motorcycle Parts Context</p>
              <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                <li>
                  <span className="font-medium text-emerald-600">95% (k=1.65)</span> is the default for standard parts — balances cost &amp; availability for BD import supply chains
                </li>
                <li>
                  <span className="font-medium text-amber-600">99% (k=2.33)</span> recommended for brake assemblies &amp; engine parts where stockout = safety risk for riders
                </li>
                <li>
                  <span className="font-medium text-red-600">99.9% (k=3.09)</span> reserved for life-critical parts (brake discs, steering) — higher SS cost justified by safety liability
                </li>
                <li>
                  Sea route (152d lead time) amplifies k impact on SS — each 0.33 increase in k adds ~{Math.round(152 * 0.33)} units of uncertainty buffer per σ_LT
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Compact formula reference */}
        <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200">
          <p className="text-[11px] font-mono text-emerald-700">
            SS = (EOQ/R) + (MAE × μ<sub>t</sub> × σ<sub>LT</sub>) × k &nbsp;|&nbsp; ROP = (d̄ × LT) + SS
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
