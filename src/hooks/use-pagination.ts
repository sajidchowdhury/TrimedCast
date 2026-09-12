// ============================================
// TrimedCast LEAN — usePagination hook
// Client-side pagination for arrays of items.
// Prevents long lists from rendering infinitely.
// ============================================

import { useState, useMemo, useCallback } from 'react';

export interface PaginationState<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  paginatedItems: T[];
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

export function usePagination<T>(items: T[], pageSize: number = 10): PaginationState<T> {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page if items change (e.g. after search/filter)
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, startIndex, pageSize],
  );

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);
  const goToPage = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);
  const reset = useCallback(() => setPage(1), []);

  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage,
    prevPage,
    goToPage,
    setPage: goToPage,
    reset,
  };
}
