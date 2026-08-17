'use client';

// ============================================
// TrimedCast - Seasonality Card Component
// Individual seasonality type card with all details,
// action buttons, and responsive design
// ============================================

import React from 'react';
import { Pencil, Trash2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SeasonalityType } from './types';
import { MonthBadgeGroup } from './month-badge';
import { MultiplierDisplay } from './multiplier-display';

interface SeasonalityCardProps {
  type: SeasonalityType;
  showBn?: boolean;
  onEdit: (type: SeasonalityType) => void;
  onDelete: (type: SeasonalityType) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function SeasonalityCard({
  type,
  showBn = false,
  onEdit,
  onDelete,
  onToggleActive,
}: SeasonalityCardProps) {
  const displayLabel = showBn && type.label_bn ? type.label_bn : type.label;

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4 ${
        !type.is_active ? 'opacity-60' : ''
      }`}
      style={{ borderLeftColor: type.color ?? '#6b7280' }}
    >
      {/* Color strip at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: type.color ?? '#6b7280' }}
      />

      <CardContent className="p-4 pt-5 space-y-3">
        {/* Row 1: Label + Name badge + Default badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Color dot */}
            <span
              className="shrink-0 h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background"
              style={{
                backgroundColor: type.color ?? '#6b7280',
                ringColor: `${type.color ?? '#6b7280'}40`,
              }}
            />
            <h3 className="font-semibold text-sm truncate">{displayLabel}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {type.is_default && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10">
                      <Shield className="w-3 h-3" />
                      Default
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>System default type — cannot be deleted</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {type.name}
            </Badge>
          </div>
        </div>

        {/* Row 2: Description */}
        {type.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {type.description}
          </p>
        )}

        {/* Row 3: Multiplier */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Multiplier
          </span>
          <MultiplierDisplay multiplier={type.multiplier} showLabel size="sm" />
        </div>

        {/* Row 4: Month badges */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Active Months
          </span>
          <MonthBadgeGroup
            months={type.months}
            color={type.color}
            showBn={showBn}
            isActive={type.is_active}
          />
        </div>

        {/* Row 5: Status + Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          {/* Active/Inactive toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={type.is_active}
              onCheckedChange={(checked) => onToggleActive(type.id, checked)}
              aria-label={`Toggle ${type.label} active status`}
              className="scale-75 origin-left"
            />
            <span className={`text-[10px] font-medium ${type.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
              {type.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(type)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit type</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => onDelete(type)}
                    disabled={type.is_default}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {type.is_default ? 'Cannot delete default type' : 'Delete type'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
