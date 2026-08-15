// ============================================
// TrimedCast Rate Limiter - In-Memory
// Sliding window rate limiting with auto-expiry.
// Based on: RBAC & Security Model.md Section 4.3
// ============================================

// --- Rate Limit Categories ---

export type RateLimitCategory = 'api' | 'ai' | 'forecast' | 'import' | 'global';

/**
 * Rate limit configuration per category.
 * All limits are per minute (60-second sliding window).
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;     // Window duration in milliseconds
  description: string;
}

const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  api: {
    maxRequests: 60,
    windowMs: 60_000,
    description: 'Standard API endpoints - 60 req/min per user',
  },
  ai: {
    maxRequests: 20,
    windowMs: 60_000,
    description: 'AI queries - 20 req/min per user',
  },
  forecast: {
    maxRequests: 10,
    windowMs: 60_000,
    description: 'Forecast generation - 10 req/min per tenant',
  },
  import: {
    maxRequests: 5,
    windowMs: 60_000,
    description: 'Data imports - 5 req/min per tenant',
  },
  global: {
    maxRequests: 100,
    windowMs: 60_000,
    description: 'Unauthenticated routes - 100 req/min per IP',
  },
};

// --- In-Memory Store ---

interface RateLimitEntry {
  count: number;
  windowStart: number;  // Timestamp when the current window started
}

/**
 * Map key format: `${category}:${key}`
 * Uses a flat namespace to avoid nested maps.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

// --- Auto-Cleanup ---
// Periodically purge expired entries to prevent memory leaks
// Runs every 2 minutes

const CLEANUP_INTERVAL_MS = 120_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return; // Already running

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [mapKey, entry] of rateLimitStore.entries()) {
      const category = mapKey.split(':')[0] as RateLimitCategory;
      const config = RATE_LIMIT_CONFIGS[category];
      if (config && now - entry.windowStart > config.windowMs) {
        rateLimitStore.delete(mapKey);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node.js from exiting
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    (cleanupTimer as ReturnType<typeof setInterval> & { unref: () => void }).unref();
  }
}

// Start cleanup on module load
startCleanup();

// ============================================
// Core Functions
// ============================================

/**
 * Check if a request is allowed under the rate limit.
 * Uses a fixed-window algorithm with automatic window reset.
 *
 * @param key - Identifier for the rate limit bucket (user ID, tenant ID, IP address)
 * @param category - Rate limit category determining the limit and window
 * @returns Object with allowed status, remaining quota, and reset timestamp
 */
export function checkRateLimit(
  key: string,
  category: RateLimitCategory
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMIT_CONFIGS[category];
  const mapKey = `${category}:${key}`;
  const now = Date.now();

  let entry = rateLimitStore.get(mapKey);

  // If no entry exists or the window has expired, start a new window
  if (!entry || now - entry.windowStart >= config.windowMs) {
    entry = {
      count: 0,
      windowStart: now,
    };
    rateLimitStore.set(mapKey, entry);
  }

  // Check if under the limit
  if (entry.count < config.maxRequests) {
    entry.count++;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetAt = entry.windowStart + config.windowMs;

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  // Rate limit exceeded
  const resetAt = entry.windowStart + config.windowMs;
  return {
    allowed: false,
    remaining: 0,
    resetAt,
  };
}

/**
 * Get standard rate limit HTTP headers for a given key and category.
 * Returns headers following the IETF draft standard:
 * - X-RateLimit-Limit: Maximum requests allowed in the window
 * - X-RateLimit-Remaining: Remaining requests in the current window
 * - X-RateLimit-Reset: Unix timestamp (seconds) when the window resets
 *
 * This function does NOT increment the counter; it only reads current state.
 * Call checkRateLimit() first to increment, then use this to get headers.
 */
export function getRateLimitHeaders(
  key: string,
  category: RateLimitCategory
): Record<string, string> {
  const config = RATE_LIMIT_CONFIGS[category];
  const mapKey = `${category}:${key}`;
  const now = Date.now();

  const entry = rateLimitStore.get(mapKey);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    // No active window; full quota available
    return {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(config.maxRequests),
      'X-RateLimit-Reset': String(Math.ceil((now + config.windowMs) / 1000)),
    };
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetAt = entry.windowStart + config.windowMs;

  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

/**
 * Reset rate limit for a specific key and category.
 * If category is not provided, resets all categories for that key.
 * Primarily used for testing.
 */
export function resetRateLimit(key: string, category?: string): void {
  if (category) {
    const mapKey = `${category}:${key}`;
    rateLimitStore.delete(mapKey);
  } else {
    // Delete all categories for this key
    const categories: RateLimitCategory[] = ['api', 'ai', 'forecast', 'import', 'global'];
    for (const cat of categories) {
      rateLimitStore.delete(`${cat}:${key}`);
    }
  }
}

// ============================================
// Utility Helpers
// ============================================

/**
 * Get the rate limit configuration for a category.
 */
export function getRateLimitConfig(category: RateLimitCategory): RateLimitConfig {
  return { ...RATE_LIMIT_CONFIGS[category] };
}

/**
 * Get all rate limit configurations.
 */
export function getAllRateLimitConfigs(): Record<RateLimitCategory, RateLimitConfig> {
  return { ...RATE_LIMIT_CONFIGS };
}

/**
 * Get current usage stats for a key and category.
 * Returns current count, limit, and percentage of quota used.
 */
export function getRateLimitUsage(
  key: string,
  category: RateLimitCategory
): { count: number; limit: number; percentage: number; windowStart: number } {
  const config = RATE_LIMIT_CONFIGS[category];
  const mapKey = `${category}:${key}`;
  const now = Date.now();

  const entry = rateLimitStore.get(mapKey);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    return {
      count: 0,
      limit: config.maxRequests,
      percentage: 0,
      windowStart: now,
    };
  }

  return {
    count: entry.count,
    limit: config.maxRequests,
    percentage: Math.round((entry.count / config.maxRequests) * 100),
    windowStart: entry.windowStart,
  };
}

/**
 * Clear all rate limit entries.
 * Use only in testing or admin operations.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get the total number of active rate limit entries.
 * Useful for monitoring memory usage.
 */
export function getActiveRateLimitCount(): number {
  return rateLimitStore.size;
}
