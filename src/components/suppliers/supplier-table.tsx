'use client';

// ============================================
// TrimedCast - Supplier Table
// Session 18: Product & Supplier Management
// Responsive table with search, country filter,
// CNY affected filter, and actions
// ============================================

import React from 'react';
import {
  Building2,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Supplier } from '@/components/products/types';
import { SUPPLIER_COUNTRIES } from '@/components/products/types';

// --- Props ---
interface SupplierTableProps {
  suppliers: Supplier[];
  searchQuery: string;
  countryFilter: string;
  cnyFilter: boolean | null;
  onSearchChange: (query: string) => void;
  onCountryChange: (country: string) => void;
  onCnyFilterChange: (filter: boolean | null) => void;
  onViewDetail: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

// --- Reliability Badge ---
function ReliabilityBadge({ reliability }: { reliability?: number | null }) {
  if (reliability == null) return <span className="text-xs text-muted-foreground">-</span>;
  const pct = Math.round(reliability * 100);
  if (pct >= 90) {
    return (
      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
        {pct}%
      </Badge>
    );
  }
  if (pct >= 75) {
    return (
      <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
        {pct}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      {pct}%
    </Badge>
  );
}

// --- Main Component ---
export function SupplierTable({
  suppliers,
  searchQuery,
  countryFilter,
  cnyFilter,
  onSearchChange,
  onCountryChange,
  onCnyFilterChange,
  onViewDetail,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  return (
    <div className="space-y-4">
      {/* Search + Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search suppliers..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={countryFilter} onValueChange={onCountryChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Countries</SelectItem>
            {SUPPLIER_COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={cnyFilter === null ? 'all' : cnyFilter ? 'yes' : 'no'}
          onValueChange={(v) => {
            if (v === 'all') onCnyFilterChange(null);
            else if (v === 'yes') onCnyFilterChange(true);
            else onCnyFilterChange(false);
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="CNY Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            <SelectItem value="yes">CNY Affected</SelectItem>
            <SelectItem value="no">Not CNY Affected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} found
      </p>

      {/* Desktop Table */}
      {suppliers.length > 0 ? (
        <>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead className="text-center">Reliability</TableHead>
                  <TableHead className="text-center">CNY</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer"
                    onClick={() => onViewDetail(supplier)}
                  >
                    <TableCell className="font-medium text-sm">{supplier.name}</TableCell>
                    <TableCell className="font-mono text-xs">{supplier.code || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Globe className="h-3 w-3" />
                        {supplier.country}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {supplier.lead_time_days}d
                    </TableCell>
                    <TableCell className="text-center">
                      <ReliabilityBadge reliability={supplier.reliability} />
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.is_cny_affected ? (
                        <Badge variant="destructive" className="text-[10px] gap-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          CNY
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {supplier.product_count ?? 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(supplier); }}>
                            <Eye className="h-3.5 w-3.5 mr-2" />View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDelete(supplier); }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onViewDetail(supplier)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{supplier.name}</p>
                    {supplier.code && (
                      <p className="text-[10px] font-mono text-muted-foreground">{supplier.code}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(supplier); }}>
                        <Eye className="h-3.5 w-3.5 mr-2" />View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(supplier); }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Globe className="h-3 w-3" />{supplier.country}
                  </Badge>
                  <ReliabilityBadge reliability={supplier.reliability} />
                  {supplier.is_cny_affected && (
                    <Badge variant="destructive" className="text-[10px] gap-0.5">
                      <AlertTriangle className="h-3 w-3" />CNY
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lead time: {supplier.lead_time_days}d</span>
                  <span>{supplier.product_count ?? 0} products</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No suppliers found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {searchQuery || countryFilter
              ? 'No suppliers match your filters. Try adjusting your search.'
              : 'Add your first supplier to start managing your supply chain.'}
          </p>
        </div>
      )}
    </div>
  );
}
