'use client';

// ============================================
// TrimedCast - Product Table
// Session 18: Product & Supplier Management
// Responsive table with search, filters, and
// stock status color-coding
// ============================================

import React from 'react';
import {
  Package,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import type { Product } from './types';
import { PRODUCT_CATEGORIES, getCategoryLabel, getStockStatus } from './types';

// --- Props ---
interface ProductTableProps {
  products: Product[];
  searchQuery: string;
  categoryFilter: string;
  lowStockFilter: boolean;
  activeOnly: boolean;
  page: number;
  totalPages: number;
  total: number;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onLowStockChange: (lowStock: boolean) => void;
  onActiveOnlyChange: (active: boolean) => void;
  onPageChange: (page: number) => void;
  onViewDetail: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// --- Stock Badge ---
function StockBadge({ product }: { product: Product }) {
  const status = getStockStatus(product);
  const avail = product.inventory?.qty_available ?? 0;

  if (status === 'out') {
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <PackageX className="h-3 w-3" />
        Out of Stock
      </Badge>
    );
  }
  if (status === 'low') {
    return (
      <Badge className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
        <AlertTriangle className="h-3 w-3" />
        Low: {avail}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
      {avail} avail
    </Badge>
  );
}

// --- Main Component ---
export function ProductTable({
  products,
  searchQuery,
  categoryFilter,
  lowStockFilter,
  activeOnly,
  page,
  totalPages,
  total,
  onSearchChange,
  onCategoryChange,
  onLowStockChange,
  onActiveOnlyChange,
  onPageChange,
  onViewDetail,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="space-y-4">
      {/* Search + Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products by name, SKU, category..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1">
          <Switch
            checked={lowStockFilter}
            onCheckedChange={onLowStockChange}
            className="scale-75 origin-left"
            id="low-stock-filter"
          />
          <Label htmlFor="low-stock-filter" className="text-xs cursor-pointer whitespace-nowrap">
            Low Stock
          </Label>
        </div>

        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1">
          <Switch
            checked={activeOnly}
            onCheckedChange={onActiveOnlyChange}
            className="scale-75 origin-left"
            id="active-only-filter"
          />
          <Label htmlFor="active-only-filter" className="text-xs cursor-pointer whitespace-nowrap">
            Active Only
          </Label>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} product{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Desktop Table */}
      {products.length > 0 ? (
        <>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => onViewDetail(product)}
                  >
                    <TableCell className="font-mono text-xs">{product.sku_code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{product.name}</span>
                        {product.motorcycle_model && (
                          <span className="text-[10px] text-muted-foreground">
                            {product.motorcycle_model.brand} {product.motorcycle_model.model}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {product.supplier?.name ?? '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {product.unit_cost_bdt != null
                        ? `\u09F3${product.unit_cost_bdt.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <StockBadge product={product} />
                    </TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(product); }}>
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDelete(product); }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
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
            {products.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onViewDetail(product)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{product.sku_code}</p>
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(product); }}>
                        <Eye className="h-3.5 w-3.5 mr-2" />View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(product); }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {getCategoryLabel(product.category)}
                  </Badge>
                  <StockBadge product={product} />
                  {product.is_seasonal && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
                      Seasonal
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{product.supplier?.name ?? 'No supplier'}</span>
                  {product.unit_cost_bdt != null && (
                    <span className="font-mono">
                      {'\u09F3'}{product.unit_cost_bdt.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No products found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {searchQuery || categoryFilter
              ? 'No products match your filters. Try adjusting your search or filters.'
              : 'Add your first product to start managing inventory.'}
          </p>
        </div>
      )}
    </div>
  );
}
