'use client';

// ============================================
// TrimedCast - Multiplier Display Component
// Shows multiplier value with color coding:
// green (>1 demand up), red (<1 demand down), gray (=1 neutral)
// Optional bar chart visual for magnitude
// ============================================

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MULTIPLIER_MAX } from './types';

interface MultiplierDisplayProps {
  multiplier: number;
  showBar?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getMultiplierColor(multiplier: number): {
  text: string;
  bg: string;
  border: string;
  bar: string;
} {
  if (multiplier > 1) {
    return {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      bar: 'bg-emerald-500',
    };
  }
  if (multiplier < 1) {
    return {
      text: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      bar: 'bg-red-500',
    };
  }
  return {
    text: 'text-zinc-700 dark:text-zinc-400',
    bg: 'bg-zinc-50 dark:bg-zinc-500/10',
    border: 'border-zinc-200 dark:border-zinc-500/20',
    bar: 'bg-zinc-400',
  };
}

function getMultiplierLabel(multiplier: number): string {
  if (multiplier > 1) return 'Demand Up';
  if (multiplier < 1) return 'Demand Down';
  return 'Neutral';
}

function getTrendIcon(multiplier: number, size: number) {
  if (multiplier > 1) return <TrendingUp className="text-emerald-500" style={{ width: size, height: size }} />;
  if (multiplier < 1) return <TrendingDown className="text-red-500" style={{ width: size, height: size }} />;
  return <Minus className="text-zinc-400" style={{ width: size, height: size }} />;
}

export function MultiplierDisplay({
  multiplier,
  showBar = false,
  showLabel = false,
  size = 'md',
  className = '',
}: MultiplierDisplayProps) {
  const colors = getMultiplierColor(multiplier);
  const label = getMultiplierLabel(multiplier);

  const sizeStyles = {
    sm: { text: 'text-xs', px: 'px-1.5', py: 'py-0.5', iconSize: 12 },
    md: { text: 'text-sm', px: 'px-2', py: 'py-1', iconSize: 14 },
    lg: { text: 'text-base', px: 'px-2.5', py: 'py-1', iconSize: 16 },
  };

  const s = sizeStyles[size];
  const barWidth = Math.min((multiplier / MULTIPLIER_MAX) * 100, 100);

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div
        className={`inline-flex items-center gap-1 ${s.px} ${s.py} rounded-md border ${colors.bg} ${colors.border}`}
      >
        {getTrendIcon(multiplier, s.iconSize)}
        <span className={`font-semibold ${s.text} ${colors.text}`}>
          {multiplier.toFixed(1)}×
        </span>
        {showLabel && (
          <span className={`text-[10px] ${colors.text} opacity-70 hidden sm:inline`}>
            {label}
          </span>
        )}
      </div>
      {showBar && (
        <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// CombinedMultiplierDisplay - Shows product of multiple multipliers
// ============================================

interface CombinedMultiplierDisplayProps {
  multipliers: number[];
  className?: string;
}

export function CombinedMultiplierDisplay({
  multipliers,
  className = '',
}: CombinedMultiplierDisplayProps) {
  const combined = multipliers.length > 0
    ? multipliers.reduce((product, m) => product * m, 1.0)
    : 1.0;

  return (
    <MultiplierDisplay
      multiplier={Math.round(combined * 10) / 10}
      showBar
      showLabel
      size="sm"
      className={className}
    />
  );
}
