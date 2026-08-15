// ============================================
// TrimedCast — In-Memory Caching Layer
// Section 8: Performance Requirements
//
// TTL-based cache for:
// - Order trigger results (avoid recalculation)
// - CNY calendar lookups (changes once/year)
// - Pipeline results (cache per tenant+season)
// - Lead time configs (rarely changes)
// ============================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
  createdAt: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
  evictions: number;
}

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private defaultTTL: number; // ms
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(maxEntries: number = 500, defaultTTL: number = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : '0%',
      evictions: this.stats.evictions,
    };
  }

  private findOldestKey(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = key;
      }
    }
    return oldest;
  }
}

// ============================================
// Specialized Cache Instances
// ============================================

// Order trigger results: cache for 5 minutes
// Key: tenantId:productId:shippingMethod:serviceLevel
export const orderTriggerCache = new TTLCache<unknown>(500, 5 * 60 * 1000);

// CNY calendar: cache for 24 hours (changes once per year)
// Key: year or 'current' or 'all'
export const cnyCalendarCache = new TTLCache<unknown>(10, 24 * 60 * 60 * 1000);

// Pipeline results: cache for 10 minutes
// Key: tenantId:season:year
export const pipelineCache = new TTLCache<unknown>(50, 10 * 60 * 1000);

// Lead time configs: cache for 30 minutes
// Key: tenantId:supplierId or tenantId:default
export const leadTimeCache = new TTLCache<unknown>(200, 30 * 60 * 1000);

// Seasonal weights: cache for 1 hour (very stable)
// Key: category:season or 'all'
export const seasonalWeightCache = new TTLCache<unknown>(100, 60 * 60 * 1000);

// ============================================
// Cache Key Builders
// ============================================

export function buildTriggerCacheKey(
  tenantId: string,
  productId: string,
  shippingMethod: string = 'sea',
  serviceLevel: number = 0.95,
): string {
  return `trigger:${tenantId}:${productId}:${shippingMethod}:${serviceLevel}`;
}

export function buildPipelineCacheKey(
  tenantId: string,
  season: string,
  year: number,
): string {
  return `pipeline:${tenantId}:${season}:${year}`;
}

export function buildCNYCacheKey(year?: number): string {
  return `cny:${year ?? 'current'}`;
}

// ============================================
// Cache-aware Wrapper Functions
// ============================================

/**
 * Cached order trigger calculation.
 * Returns cached result if available and fresh, otherwise computes and caches.
 */
export function cachedCalculate<T>(
  cache: TTLCache<T>,
  key: string,
  computeFn: () => T,
): T {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const result = computeFn();
  cache.set(key, result);
  return result;
}

/**
 * Async version for database-backed computations.
 */
export async function cachedCalculateAsync<T>(
  cache: TTLCache<T>,
  key: string,
  computeFn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const result = await computeFn();
  cache.set(key, result);
  return result;
}

/**
 * Get combined stats for all caches.
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    orderTriggers: orderTriggerCache.getStats(),
    cnyCalendar: cnyCalendarCache.getStats(),
    pipeline: pipelineCache.getStats(),
    leadTime: leadTimeCache.getStats(),
    seasonalWeight: seasonalWeightCache.getStats(),
  };
}

/**
 * Invalidate all caches for a tenant (e.g., after data import).
 */
export function invalidateTenantCaches(tenantId: string): void {
  orderTriggerCache.invalidatePattern(tenantId);
  pipelineCache.invalidatePattern(tenantId);
  leadTimeCache.invalidatePattern(tenantId);
}

/**
 * Clear all caches.
 */
export function clearAllCaches(): void {
  orderTriggerCache.clear();
  cnyCalendarCache.clear();
  pipelineCache.clear();
  leadTimeCache.clear();
  seasonalWeightCache.clear();
}
