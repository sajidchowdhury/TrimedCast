'use client';

// ============================================
// Forecast Accuracy Metrics Table
// Per UI/UX Specification Section 8:
// MAPE, MAE, MSE, RMSE with descriptions
// ============================================

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
import { Target, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { type ForecastMetricsClient } from '@/lib/forecasting/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ForecastMetricsTableProps {
  metrics: ForecastMetricsClient;
  dataPoints?: number;
  className?: string;
}

function getMapeRating(mape: number): { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (mape <= 10) return { label: 'Excellent', color: 'text-emerald-600', variant: 'default' };
  if (mape <= 20) return { label: 'Good', color: 'text-emerald-600', variant: 'default' };
  if (mape <= 30) return { label: 'Fair', color: 'text-amber-600', variant: 'secondary' };
  return { label: 'Poor', color: 'text-red-600', variant: 'destructive' };
}

export function ForecastMetricsTable({ metrics, dataPoints, className }: ForecastMetricsTableProps) {
  const mse = metrics.rmse * metrics.rmse; // MSE = RMSE²
  const rating = getMapeRating(metrics.mape);

  const rows = [
    {
      metric: 'MAPE',
      value: `${metrics.mape.toFixed(1)}%`,
      rawValue: metrics.mape,
      description: 'Mean Absolute Percentage Error — Relative accuracy',
      icon: Target,
      rating: metrics.mape <= 10 ? 'Excellent' : metrics.mape <= 20 ? 'Good' : metrics.mape <= 30 ? 'Fair' : 'Poor',
      ratingColor: metrics.mape <= 10 ? 'text-emerald-600' : metrics.mape <= 20 ? 'text-emerald-600' : metrics.mape <= 30 ? 'text-amber-600' : 'text-red-600',
    },
    {
      metric: 'MAE',
      value: metrics.mae.toFixed(1),
      rawValue: metrics.mae,
      description: 'Mean Absolute Error — Average magnitude of error',
      icon: Activity,
      rating: null,
      ratingColor: '',
    },
    {
      metric: 'MSE',
      value: mse.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      rawValue: mse,
      description: 'Mean Squared Error — Weights larger outliers more',
      icon: BarChart3,
      rating: null,
      ratingColor: '',
    },
    {
      metric: 'RMSE',
      value: metrics.rmse.toFixed(1),
      rawValue: metrics.rmse,
      description: 'Root Mean Squared Error — Std dev of residuals',
      icon: TrendingUp,
      rating: null,
      ratingColor: '',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Forecast Health Metrics
            </CardTitle>
            <div className="flex items-center gap-2">
              {dataPoints !== undefined && (
                <Badge variant="outline" className="text-[10px]">
                  {dataPoints} data points
                </Badge>
              )}
              <Badge variant={rating.variant === 'default' ? 'default' : 'secondary'} className="text-[10px]">
                {rating.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-xs">Metric</TableHead>
                <TableHead className="w-[100px] text-xs">Value</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="w-[80px] text-xs text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="text-xs font-mono font-semibold">
                    <div className="flex items-center gap-1.5">
                      <row.icon className="h-3 w-3 text-muted-foreground" />
                      {row.metric}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium tabular-nums">
                    {row.value}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.description}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {row.rating ? (
                      <span className={cn('font-medium', row.ratingColor)}>
                        {row.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {/* Bias indicator */}
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Bias: {metrics.bias >= 0 ? '+' : ''}{metrics.bias.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {metrics.bias > 5 ? 'Forecast tends to under-predict' :
               metrics.bias < -5 ? 'Forecast tends to over-predict' :
               'Forecast is well-balanced'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
