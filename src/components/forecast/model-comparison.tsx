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
import type { IndividualModelResult } from '@/lib/forecasting/store';
import { DEFAULT_WEIGHTS, type EnsembleWeights } from '@/lib/forecasting/models';
import { Trophy } from 'lucide-react';

interface ModelComparisonProps {
  individualResults: IndividualModelResult[];
  ensembleModel?: string;
  weights?: EnsembleWeights;
}

const MODEL_LABELS: Record<string, string> = {
  moving_average: 'Moving Average',
  exponential_smoothing: 'Exponential Smoothing (ETS)',
  seasonal_decomposition: 'Seasonal Decomposition',
  prophet_like: 'Prophet-Like',
  ensemble: 'Ensemble (Weighted)',
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  moving_average: 'Simple baseline using recent window average × season multiplier',
  exponential_smoothing: 'Holt-Winters ETS with level, trend, and seasonal components',
  seasonal_decomposition: 'BD-specific additive decomposition with linear trend + seasonal factors',
  prophet_like: 'Fourier regression with BD holiday effects and changepoint detection',
};

const WEIGHT_LABELS: Record<string, string> = {
  moving_average: '10%',
  exponential_smoothing: '20%',
  seasonal_decomposition: '30%',
  prophet_like: '40%',
};

export function ModelComparison({ individualResults, ensembleModel, weights = DEFAULT_WEIGHTS }: ModelComparisonProps) {
  if (individualResults.length === 0) return null;

  // Find best model by MAPE (lower is better)
  const bestMape = Math.min(...individualResults.map((r) => r.metrics.mape));
  const bestMae = Math.min(...individualResults.map((r) => r.metrics.mae));
  const bestRmse = Math.min(...individualResults.map((r) => r.metrics.rmse));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Model Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Model</TableHead>
                <TableHead className="text-center">MAPE (%)</TableHead>
                <TableHead className="text-center">MAE</TableHead>
                <TableHead className="text-center">RMSE</TableHead>
                <TableHead className="text-center">Bias</TableHead>
                <TableHead className="text-center">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {individualResults.map((result) => {
                const isBestMape = result.metrics.mape === bestMape;
                const isBestMae = result.metrics.mae === bestMae;
                const isBestRmse = result.metrics.rmse === bestRmse;
                const isBest = isBestMape; // Primary criterion: MAPE

                return (
                  <TableRow key={result.model} className={isBest ? 'bg-emerald-50/50' : ''}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">
                            {MODEL_LABELS[result.model] || result.model}
                          </span>
                          {isBest && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] h-4">
                              BEST
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {MODEL_DESCRIPTIONS[result.model] || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isBestMape ? 'font-bold text-emerald-700' : ''}>
                        {result.metrics.mape.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isBestMae ? 'font-bold text-emerald-700' : ''}>
                        {result.metrics.mae.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isBestRmse ? 'font-bold text-emerald-700' : ''}>
                        {result.metrics.rmse.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={result.metrics.bias > 0 ? 'text-amber-600' : result.metrics.bias < 0 ? 'text-blue-600' : ''}>
                        {result.metrics.bias > 0 ? '+' : ''}{result.metrics.bias.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-gray-500">
                        {WEIGHT_LABELS[result.model] || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Ensemble info */}
        {ensembleModel && (
          <div className="mt-3 text-xs text-gray-500 bg-slate-50 rounded p-2">
            <span className="font-medium">Ensemble:</span>{' '}
            MA({(weights.moving_average * 100).toFixed(0)}%) + ETS({(weights.exponential_smoothing * 100).toFixed(0)}%) +
            SD({(weights.seasonal_decomposition * 100).toFixed(0)}%) + Prophet({(weights.prophet_like * 100).toFixed(0)}%)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
