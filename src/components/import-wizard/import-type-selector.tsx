'use client';

// ============================================
// TrimedCast — Import Type Selector
// Session 22: Card grid for selecting import type
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import {
  type ImportType,
  IMPORT_TYPE_CONFIG,
} from './types';
import {
  TrendingUp,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Tag,
  Bike,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Tag,
  Bike,
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', iconBg: 'bg-violet-100 text-violet-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-600' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700', iconBg: 'bg-sky-100 text-sky-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-600' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', iconBg: 'bg-pink-100 text-pink-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', iconBg: 'bg-orange-100 text-orange-600' },
};

interface ImportTypeSelectorProps {
  selected: ImportType | null;
  onSelect: (type: ImportType) => void;
}

export function ImportTypeSelector({ selected, onSelect }: ImportTypeSelectorProps) {
  const importTypes = Object.entries(IMPORT_TYPE_CONFIG) as [ImportType, typeof IMPORT_TYPE_CONFIG[ImportType]][];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {importTypes.map(([typeKey, config]) => {
        const isSelected = selected === typeKey;
        const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.emerald;
        const IconComp = ICON_MAP[config.icon];

        return (
          <Card
            key={typeKey}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden ${
              isSelected
                ? `ring-2 ring-offset-1 ${colors.border} ${colors.bg}`
                : 'hover:border-gray-300'
            }`}
            onClick={() => onSelect(typeKey)}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className={`h-5 w-5 ${colors.text}`} />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                  {IconComp && <IconComp className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900">{config.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 block mb-1.5">{config.labelBn}</span>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{config.description}</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {config.requiredFields.length} required fields
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
