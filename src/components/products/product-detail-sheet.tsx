'use client';

// ============================================
// TrimedCast - Product Detail Sheet
// Session 18: Product & Supplier Management
// Slide-out panel with all product details,
// inventory bar chart, and edit/delete actions
// ============================================

import React from 'react';
import {
  Package,
  Pencil,
  Trash2,
  Tag,
  Truck,
  Bike,
  DollarSign,
  Warehouse,
  TrendingUp,
  Snowflake,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Product } from './types';
import { getCategoryLabel, getStockStatus } from './types';

// --- Props ---
interface ProductDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// --- Inventory Bar ---
function InventoryBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Main Component ---
export function ProductDetailSheet({
  open,
  onOpenChange,
  product,
  onEdit,
  onDelete,
}: ProductDetailSheetProps) {
  if (!product) return null;

  const stockStatus = getStockStatus(product);
  const inv = product.inventory;
  const maxForBar = inv ? Math.max(inv.qty_on_hand, inv.reorder_point, inv.safety_stock, product.max_stock) : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {product.name}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {product.sku_code}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-5 pb-6">
          {/* Status badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {getCategoryLabel(product.category)}
            </Badge>
            {product.is_active ? (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
            )}
            {product.is_seasonal && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
                <Snowflake className="h-3 w-3 mr-0.5" />
                Seasonal
              </Badge>
            )}
            {stockStatus === 'out' && (
              <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
            )}
            {stockStatus === 'low' && (
              <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                Low Stock
              </Badge>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" /> Product Details
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Sub-category:</span>
              </div>
              <div className="font-medium">{product.sub_category || '-'}</div>

              <div>
                <span className="text-muted-foreground">Unit:</span>
              </div>
              <div className="font-medium">{product.unit}</div>

              <div>
                <span className="text-muted-foreground">Min Order Qty:</span>
              </div>
              <div className="font-medium font-mono">{product.min_order_qty}</div>

              <div>
                <span className="text-muted-foreground">EOQ:</span>
              </div>
              <div className="font-medium font-mono">{product.eoq}</div>

              <div>
                <span className="text-muted-foreground">Max Stock:</span>
              </div>
              <div className="font-medium font-mono">{product.max_stock}</div>

              <div>
                <span className="text-muted-foreground">Lead Time:</span>
              </div>
              <div className="font-medium font-mono">{product.lead_time_days ?? '-'} days</div>
            </div>
          </div>

          <Separator />

          {/* Motorcycle Model */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Bike className="h-3 w-3" /> Motorcycle Model
            </h3>
            {product.motorcycle_model ? (
              <div className="text-xs">
                <span className="font-medium">
                  {product.motorcycle_model.brand} {product.motorcycle_model.model}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Universal / Not model-specific</p>
            )}
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Pricing (BDT)
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Unit Cost:</span>
              </div>
              <div className="font-medium font-mono">
                {product.unit_cost_bdt != null ? `\u09F3${product.unit_cost_bdt.toLocaleString()}` : '-'}
              </div>

              <div>
                <span className="text-muted-foreground">Selling Price:</span>
              </div>
              <div className="font-medium font-mono">
                {product.selling_price_bdt != null ? `\u09F3${product.selling_price_bdt.toLocaleString()}` : '-'}
              </div>

              {product.unit_cost_bdt != null && product.selling_price_bdt != null && (
                <>
                  <div>
                    <span className="text-muted-foreground">Margin:</span>
                  </div>
                  <div className="font-medium font-mono text-emerald-600 dark:text-emerald-400">
                    {((product.selling_price_bdt - product.unit_cost_bdt) / product.selling_price_bdt * 100).toFixed(1)}%
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Supplier */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Truck className="h-3 w-3" /> Supplier
            </h3>
            {product.supplier ? (
              <div className="text-xs space-y-1">
                <p className="font-medium">{product.supplier.name}</p>
                <p className="text-muted-foreground">{product.supplier.country}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No supplier assigned</p>
            )}
          </div>

          <Separator />

          {/* Inventory */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Warehouse className="h-3 w-3" /> Inventory
            </h3>
            {inv ? (
              <div className="space-y-3">
                <InventoryBar label="On Hand" value={inv.qty_on_hand} max={maxForBar} color="bg-primary" />
                <InventoryBar label="Available" value={inv.qty_available} max={maxForBar} color="bg-emerald-500" />
                <InventoryBar label="Reserved" value={inv.qty_reserved} max={maxForBar} color="bg-amber-500" />
                <InventoryBar label="Reorder Point" value={inv.reorder_point} max={maxForBar} color="bg-red-400" />
                <InventoryBar label="Safety Stock" value={inv.safety_stock} max={maxForBar} color="bg-orange-400" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No inventory data available</p>
            )}
          </div>

          {/* Seasonality */}
          {product.is_seasonal && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Seasonality
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                  </div>
                  <div className="font-medium">{product.season_type || '-'}</div>

                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                  </div>
                  <div className="font-medium font-mono">{product.season_weight?.toFixed(1) ?? '-'}</div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onEdit(product)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Product
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => onDelete(product)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
