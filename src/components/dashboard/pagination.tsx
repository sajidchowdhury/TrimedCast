'use client';

// ============================================
// TrimedCast LEAN — Pagination controls
// Reusable pagination bar: first/prev/next/last + page indicator.
// ============================================

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PaginationState } from '@/hooks/use-pagination';

interface Props<T> {
  pagination: PaginationState<T>;
  itemName?: string;
}

export function Pagination<T>({ pagination, itemName = 'items' }: Props<T>) {
  const { page, total, totalPages, paginatedItems, hasNext, hasPrev, nextPage, prevPage, goToPage } = pagination;

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
      <span className="text-xs text-muted-foreground">
        Showing {paginatedItems.length} of {total} {itemName}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(1)} disabled={!hasPrev} title="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPage} disabled={!hasPrev} title="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs tabular-nums px-2">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPage} disabled={!hasNext} title="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(totalPages)} disabled={!hasNext} title="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
