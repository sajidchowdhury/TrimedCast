'use client';

// ============================================
// Product Selector — Choose a product for forecast
// Fetches products from API and displays as a select
// ============================================

import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, RefreshCw } from 'lucide-react';
import { useForecastStore, type ProductForSelection } from '@/lib/forecasting/store';
import { cn } from '@/lib/utils';

interface ProductSelectorProps {
  className?: string;
}

export function ProductSelector({ className }: ProductSelectorProps) {
  const {
    products,
    selectedProductId,
    productsLoading,
    fetchProducts,
    setSelectedProductId,
  } = useForecastStore();

  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  const selected = products.find((p) => p.id === selectedProductId);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Select
          value={selectedProductId || ''}
          onValueChange={setSelectedProductId}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <Package className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder={productsLoading ? 'Loading products...' : 'Select a product...'} />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-sm">
                <span className="font-medium">{p.name || p.sku}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">({p.category})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={fetchProducts}
          disabled={productsLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', productsLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Selected product info */}
      {selected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] font-mono">
            {selected.sku}
          </Badge>
          <span>Stock: {selected.currentStock}</span>
          <span>•</span>
          <span>Safety: {selected.safetyStock}</span>
          <span>•</span>
          <span>ROP: {selected.reorderPoint}</span>
        </div>
      )}
    </div>
  );
}
