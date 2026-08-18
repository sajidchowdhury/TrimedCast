'use client';

// ============================================
// TrimedCast - Seasonality Form Component
// Create/Edit dialog with all fields,
// month selector, color picker, multiplier slider,
// preset quick-fill, and form validation
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, X, RotateCcw } from 'lucide-react';
import type {
  SeasonalityType,
  CreateSeasonalityTypeInput,
  UpdateSeasonalityTypeInput,
} from './types';
import {
  MONTH_NAMES_EN,
  MONTH_NAMES_BN,
  PRESET_COLORS,
  SEASONALITY_PRESETS,
  MULTIPLIER_MIN,
  MULTIPLIER_MAX,
} from './types';

// ============================================
// Form State
// ============================================

interface FormState {
  label: string;
  labelBn: string;
  description: string;
  multiplier: number;
  months: number[];
  color: string;
  isActive: boolean;
}

interface FormErrors {
  label?: string;
  months?: string;
  multiplier?: string;
}

const EMPTY_FORM: FormState = {
  label: '',
  labelBn: '',
  description: '',
  multiplier: 1.0,
  months: [],
  color: PRESET_COLORS[0],
  isActive: true,
};

// ============================================
// Props
// ============================================

interface SeasonalityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editType?: SeasonalityType | null;
  onSubmit: (data: CreateSeasonalityTypeInput | UpdateSeasonalityTypeInput) => Promise<boolean>;
  showBn?: boolean;
}

// ============================================
// Component
// ============================================

export function SeasonalityForm({
  open,
  onOpenChange,
  editType,
  onSubmit,
  showBn = false,
}: SeasonalityFormProps) {
  const isEdit = !!editType;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customColor, setCustomColor] = useState('');

  // Reset form when dialog opens/closes or editType changes
  useEffect(() => {
    if (open) {
      if (editType) {
        setForm({
          label: editType.label,
          labelBn: editType.label_bn ?? '',
          description: editType.description ?? '',
          multiplier: editType.multiplier,
          months: [...editType.months],
          color: editType.color ?? PRESET_COLORS[0],
          isActive: editType.is_active,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setCustomColor('');
    }
  }, [open, editType]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.label.trim()) {
      newErrors.label = 'Label is required';
    }

    if (form.months.length === 0) {
      newErrors.months = 'Select at least one month';
    }

    if (form.multiplier < MULTIPLIER_MIN || form.multiplier > MULTIPLIER_MAX) {
      newErrors.multiplier = `Multiplier must be between ${MULTIPLIER_MIN} and ${MULTIPLIER_MAX}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data: CreateSeasonalityTypeInput = {
        label: form.label.trim(),
        label_bn: form.labelBn.trim() || undefined,
        description: form.description.trim() || undefined,
        multiplier: Math.round(form.multiplier * 10) / 10,
        months: [...form.months].sort((a, b) => a - b),
        color: form.color,
        is_active: form.isActive,
      };

      const success = await onSubmit(data);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle month selection
  const toggleMonth = (month: number) => {
    setForm((prev) => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter((m) => m !== month)
        : [...prev.months, month],
    }));
  };

  // Apply preset
  const applyPreset = (presetIndex: number) => {
    const preset = SEASONALITY_PRESETS[presetIndex];
    setForm((prev) => ({
      ...prev,
      label: preset.label,
      labelBn: preset.labelBn,
      description: preset.description,
      multiplier: preset.multiplier,
      months: [...preset.months],
      color: preset.color,
    }));
  };

  // Color selection
  const handleColorSelect = (color: string) => {
    setForm((prev) => ({ ...prev, color }));
    setCustomColor('');
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    // Validate hex format
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setForm((prev) => ({ ...prev, color: value }));
    }
  };

  // Multiplier slider change
  const handleMultiplierChange = (value: number[]) => {
    const rounded = Math.round(value[0] * 10) / 10;
    setForm((prev) => ({ ...prev, multiplier: rounded }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Seasonality Type' : 'Add Seasonality Type'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the seasonality type details below.'
              : 'Define a new seasonal demand pattern for Bangladesh motorcycle parts.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preset Quick-Add (only for new) */}
          {!isEdit && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Quick Add from Presets
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SEASONALITY_PRESETS.map((preset, idx) => (
                  <TooltipProvider key={preset.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => applyPreset(idx)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: preset.color }}
                          />
                          {showBn ? preset.labelBn : preset.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {preset.multiplier}× — Months: {preset.months.join(', ')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}

          {/* Label + Label Bn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="label" className="text-xs">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Winter Peak Demand"
                className={errors.label ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.label && (
                <p className="text-xs text-red-500">{errors.label}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="labelBn" className="text-xs">
                Label (বাংলা)
              </Label>
              <Input
                id="labelBn"
                value={form.labelBn}
                onChange={(e) => setForm((prev) => ({ ...prev, labelBn: e.target.value }))}
                placeholder="শীতকালীন চাহিদা বৃদ্ধি"
                dir="auto"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the seasonal demand pattern..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Multiplier */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Demand Multiplier <span className="text-red-500">*</span>
              </Label>
              <Badge
                variant="outline"
                className={`text-xs font-mono ${
                  form.multiplier > 1
                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400'
                    : form.multiplier < 1
                      ? 'border-red-300 text-red-700 dark:border-red-600 dark:text-red-400'
                      : 'border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-400'
                }`}
              >
                {form.multiplier.toFixed(1)}×
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-6">{MULTIPLIER_MIN}</span>
              <Slider
                value={[form.multiplier]}
                min={MULTIPLIER_MIN}
                max={MULTIPLIER_MAX}
                step={0.1}
                onValueChange={handleMultiplierChange}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-6">{MULTIPLIER_MAX}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.multiplier}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setForm((prev) => ({
                      ...prev,
                      multiplier: Math.max(MULTIPLIER_MIN, Math.min(MULTIPLIER_MAX, val)),
                    }));
                  }
                }}
                min={MULTIPLIER_MIN}
                max={MULTIPLIER_MAX}
                step={0.1}
                className="w-20 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                {form.multiplier > 1 ? '↑ Demand increases' : form.multiplier < 1 ? '↓ Demand decreases' : '— Neutral'}
              </span>
            </div>
            {errors.multiplier && (
              <p className="text-xs text-red-500">{errors.multiplier}</p>
            )}
          </div>

          {/* Months Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Active Months <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setForm((prev) => ({ ...prev, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }))}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setForm((prev) => ({ ...prev, months: [] }))}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const checked = form.months.includes(month);
                const monthLabel = showBn ? MONTH_NAMES_BN[month - 1] : MONTH_NAMES_EN[month - 1];
                return (
                  <label
                    key={month}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer transition-colors text-xs ${
                      checked
                        ? 'border-primary/50 bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/30 hover:bg-primary/[0.02]'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleMonth(month)}
                      className="scale-75"
                    />
                    <span className="truncate">{monthLabel}</span>
                  </label>
                );
              })}
            </div>
            {errors.months && (
              <p className="text-xs text-red-500">{errors.months}</p>
            )}
            {form.months.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {form.months.length} month{form.months.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`h-6 w-6 rounded-md border-2 transition-all ${
                    form.color === color
                      ? 'border-foreground scale-110 shadow-sm'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {form.color === color && (
                    <Check className="h-3 w-3 text-white mx-auto block" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }} />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#custom hex"
                className="w-28 h-7 text-xs font-mono"
                maxLength={7}
              />
              <div
                className="h-6 w-6 rounded-md border"
                style={{ backgroundColor: form.color }}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{form.color}</span>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-xs font-medium">Active Status</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Inactive types won&apos;t affect demand calculations
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-1"
          >
            {isSubmitting ? (
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
