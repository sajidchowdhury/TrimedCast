'use client';

// ============================================
// TrimedCast - Supplier Detail Sheet
// Session 18: Product & Supplier Management
// Slide-out panel with all supplier details,
// assigned products list, and actions
// ============================================

import React from 'react';
import {
  Building2,
  Pencil,
  Trash2,
  Globe,
  Mail,
  Phone,
  Clock,
  Shield,
  StickyNote,
  AlertTriangle,
  Package,
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
import type { Supplier, Product } from '@/components/products/types';
import { getCountryLabel } from '@/components/products/types';

// --- Props ---
interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  products?: Product[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

// --- Main Component ---
export function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
  products = [],
  onEdit,
  onDelete,
}: SupplierDetailSheetProps) {
  if (!supplier) return null;

  // Find products assigned to this supplier
  const assignedProducts = products.filter(
    (p) => p.supplier?.id === supplier.id,
  );

  const reliabilityPct = supplier.reliability != null
    ? Math.round(supplier.reliability * 100)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {supplier.name}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {supplier.code || supplier.id}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-5 pb-6">
          {/* Status badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Globe className="h-3 w-3" />
              {getCountryLabel(supplier.country)}
            </Badge>
            {supplier.is_cny_affected && (
              <Badge variant="destructive" className="text-[10px] gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                CNY Affected
              </Badge>
            )}
            {reliabilityPct != null && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  reliabilityPct >= 90
                    ? 'text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600'
                    : reliabilityPct >= 75
                      ? 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600'
                      : 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-600'
                }`}
              >
                <Shield className="h-3 w-3 mr-0.5" />
                {reliabilityPct}% reliable
              </Badge>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" /> Supply Details
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Lead Time:</span>
              </div>
              <div className="font-medium font-mono">{supplier.lead_time_days} days</div>

              <div>
                <span className="text-muted-foreground">Country:</span>
              </div>
              <div className="font-medium">{getCountryLabel(supplier.country)}</div>

              <div>
                <span className="text-muted-foreground">CNY Affected:</span>
              </div>
              <div className="font-medium">
                {supplier.is_cny_affected ? 'Yes' : 'No'}
              </div>

              <div>
                <span className="text-muted-foreground">Products:</span>
              </div>
              <div className="font-medium font-mono">{supplier.product_count ?? assignedProducts.length}</div>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="space-y-1.5">
              {supplier.contact_email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${supplier.contact_email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {supplier.contact_email}
                  </a>
                </div>
              )}
              {supplier.contact_phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{supplier.contact_phone}</span>
                </div>
              )}
              {!supplier.contact_email && !supplier.contact_phone && (
                <p className="text-xs text-muted-foreground">No contact information available</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> Notes
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </>
          )}

          {/* Assigned Products */}
          {assignedProducts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Package className="h-3 w-3" /> Assigned Products ({assignedProducts.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {assignedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{p.sku_code}</p>
                      </div>
                      <span className="font-mono text-muted-foreground ml-2">
                        {p.inventory?.qty_available ?? 0}
                      </span>
                    </div>
                  ))}
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
              onClick={() => onEdit(supplier)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Supplier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => onDelete(supplier)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
