'use client';

// ============================================
// TrimedCast - Month Badge Component
// Compact pill showing month short name with color
// ============================================

import React from 'react';
import { MONTH_SHORT_EN, MONTH_SHORT_BN } from './types';

interface MonthBadgeProps {
  month: number; // 1-12
  color?: string | null;
  showBn?: boolean;
  className?: string;
  isActive?: boolean;
}

export function MonthBadge({
  month,
  color,
  showBn = false,
  className = '',
  isActive = true,
}: MonthBadgeProps) {
  const idx = month - 1;
  const label = showBn ? MONTH_SHORT_BN[idx] : MONTH_SHORT_EN[idx];

  const bgColor = color ?? '#6b7280';

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${!isActive ? 'opacity-40' : ''} ${className}`}
      style={{
        backgroundColor: `${bgColor}18`,
        color: bgColor,
        border: `1px solid ${bgColor}30`,
      }}
    >
      {label}
    </span>
  );
}

// ============================================
// MonthBadgeGroup - Renders multiple month badges
// ============================================

interface MonthBadgeGroupProps {
  months: number[];
  color?: string | null;
  showBn?: boolean;
  className?: string;
  isActive?: boolean;
}

export function MonthBadgeGroup({
  months,
  color,
  showBn = false,
  className = '',
  isActive = true,
}: MonthBadgeGroupProps) {
  const sortedMonths = [...months].sort((a, b) => a - b);

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sortedMonths.map((month) => (
        <MonthBadge
          key={month}
          month={month}
          color={color}
          showBn={showBn}
          isActive={isActive}
        />
      ))}
    </div>
  );
}
