// ============================================
// TrimedCast Tenant Rate Limiter - Tier-Based
// Rate limits vary by subscription tier and are
// shared across all users within a tenant.
// Based on: Multi-Tenancy & SaaS Architecture.md Section 10.3
// Session 16: Scaling + Production Hardening
// ============================================

import { logRateLimitExceeded } from '@/lib/api/security-audit';

// ============================================
// Types & Interfaces
// ============================================

export type TenantRateLimitCategory = 'api' | 'forecast' | 'ai' | 'import';
export type TierSlug = 'starter' | 'professional' | 'enterprise';

export interface TenantRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;       // Unix timestamp ms
  retryAfter?: number;   // Seconds until reset if not allowed
}

export interface TenantRateLimitStatus {
  tenantId: string;
  tier: TierSlug;
  limits: Record<TenantRateLimitCategory, {
    limit: number;
    used: number;
    remaining: number;
    resetAt: number;
  }>;
}

export interface TierRateLimits {
  api: number;
  forecast: number;
  ai: number;
  import: number;
}

// ============================================
// Tier Rate Limit Configuration
// Per Section 10.3: different limits per tier per category.
// All limits are requests per minute (60-second window).
// ============================================

export const TIER_RATE_LIMITS: Record<TierSlug, TierRateLimits> = {
  starter: {
    api: 60,
    forecast: 10,
    ai: 0,       // Not available on starter
    import: 5,
  },
  professional: {
    api: 120,
    forecast: 30,
    ai: 10,
    import: 10,
  },
  enterprise: {
    api: 300,
    forecast: 60,
    ai: 30,
    import: 20,
  },
};

/** Window duration in milliseconds — 1 minute for all categories. */
const WINDOW_MS = 60_000;

/** All valid categories for iteration. */
const ALL_CATEGORIES: TenantRateLimitCategory[] = ['api', 'forecast', 'ai', 'import'];

// ============================================
// In-Memory Store
// ============================================

interface TenantRateLimitEntry {
  count: number;
  windowStart: number;  // Timestamp when the current window started
}

/**
 * Map key format: `${category}:${tenantId}`
 * Flat namespace consistent with rate-limit.ts pattern.
 */
const tenantRateLimitStore = new Map<string, TenantRateLimitEntry>();

// ============================================
// Auto-Cleanup
// Periodically purge expired entries to prevent memory leaks.
// Runs every 2 minutes, matching rate-limit.ts.
// ============================================

const CLEANUP_INTERVAL_MS = 120_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return; // Already running

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [mapKey, entry] of Array.from(tenantRateLimitStore.entries())) {
      if (now - entry.windowStart > WINDOW_MS) {
        tenantRateLimitStore.delete(mapKey);
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
 * Check if a feature/category is available for the given tier.
 * A limit of 0 means the feature is not available at that tier.
 *
 * @param tier - Subscription tier
 * @param category - Rate limit category
 * @returns true if the feature is available (limit > 0)
 */
export function isFeatureAvailable(
  tier: TierSlug,
  category: TenantRateLimitCategory
): boolean {
  return TIER_RATE_LIMITS[tier][category] > 0;
}

/**
 * Get the rate limits for a specific tier.
 * Returns a copy of the limits object.
 *
 * @param tier - Subscription tier
 * @returns Rate limits per category for the tier
 */
export function getTierRateLimits(tier: TierSlug): TierRateLimits {
  return { ...TIER_RATE_LIMITS[tier] };
}

/**
 * Check if a request is allowed under the tenant rate limit.
 * Uses a fixed-window algorithm consistent with rate-limit.ts.
 *
 * The rate limit is shared across all users within the tenant —
 * every request from any user in the tenant counts against the same bucket.
 *
 * When the rate limit is exceeded, a security event is logged asynchronously.
 * Security event logging never blocks the rate limit check.
 *
 * @param tenantId - Tenant identifier
 * @param tier - Subscription tier determining the limit
 * @param category - Rate limit category (api, forecast, ai, import)
 * @param context - Optional context for security audit logging (userId, ipAddress, etc.)
 * @returns TenantRateLimitResult with allowed status, limits, remaining, and reset info
 */
export function checkTenantRateLimit(
  tenantId: string,
  tier: TierSlug,
  category: TenantRateLimitCategory,
  context?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    url?: string;
    requestMethod?: string;
  }
): TenantRateLimitResult {
  const limit = TIER_RATE_LIMITS[tier][category];
  const mapKey = `${category}:${tenantId}`;
  const now = Date.now();

  // If the feature is not available at this tier (limit = 0), deny immediately
  if (limit === 0) {
    const resetAt = now + WINDOW_MS;

    // Log security event for attempted access to unavailable feature
    logRateLimitExceeded({
      tenantId,
      userId: context?.userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      url: context?.url,
      requestMethod: context?.requestMethod,
      details: {
        category,
        tier,
        limit: 0,
        reason: 'feature_not_available_at_tier',
      },
    }).catch(() => {
      // Security event logging must never throw
    });

    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    };
  }

  let entry = tenantRateLimitStore.get(mapKey);

  // If no entry exists or the window has expired, start a new window
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = {
      count: 0,
      windowStart: now,
    };
    tenantRateLimitStore.set(mapKey, entry);
  }

  // Check if under the limit
  if (entry.count < limit) {
    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const resetAt = entry.windowStart + WINDOW_MS;

    return {
      allowed: true,
      limit,
      remaining,
      resetAt,
    };
  }

  // Rate limit exceeded
  const resetAt = entry.windowStart + WINDOW_MS;
  const retryAfter = Math.ceil((resetAt - now) / 1000);

  // Log security event asynchronously — never block the response
  logRateLimitExceeded({
    tenantId,
    userId: context?.userId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    url: context?.url,
    requestMethod: context?.requestMethod,
    details: {
      category,
      tier,
      limit,
      currentCount: entry.count,
      windowStart: entry.windowStart,
    },
  }).catch(() => {
    // Security event logging must never throw
  });

  return {
    allowed: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfter,
  };
}

/**
 * Get the full rate limit status for a tenant across all categories.
 * Does NOT increment any counters — read-only.
 *
 * @param tenantId - Tenant identifier
 * @param tier - Subscription tier
 * @returns TenantRateLimitStatus with usage info for all categories
 */
export function getTenantRateLimitStatus(
  tenantId: string,
  tier: TierSlug
): TenantRateLimitStatus {
  const now = Date.now();
  const tierLimits = TIER_RATE_LIMITS[tier];

  const limits: TenantRateLimitStatus['limits'] = {
    api: { limit: 0, used: 0, remaining: 0, resetAt: 0 },
    forecast: { limit: 0, used: 0, remaining: 0, resetAt: 0 },
    ai: { limit: 0, used: 0, remaining: 0, resetAt: 0 },
    import: { limit: 0, used: 0, remaining: 0, resetAt: 0 },
  };

  for (const category of ALL_CATEGORIES) {
    const limit = tierLimits[category];
    const mapKey = `${category}:${tenantId}`;
    const entry = tenantRateLimitStore.get(mapKey);

    // If no active entry or window expired, usage is 0
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      limits[category] = {
        limit,
        used: 0,
        remaining: limit,
        resetAt: now + WINDOW_MS,
      };
    } else {
      const used = entry.count;
      const remaining = Math.max(0, limit - used);
      const resetAt = entry.windowStart + WINDOW_MS;

      limits[category] = {
        limit,
        used,
        remaining,
        resetAt,
      };
    }
  }

  return {
    tenantId,
    tier,
    limits,
  };
}

/**
 * Get standard rate limit HTTP headers from a TenantRateLimitResult.
 * Returns headers following the IETF draft standard:
 * - X-RateLimit-Limit: Maximum requests allowed in the window
 * - X-RateLimit-Remaining: Remaining requests in the current window
 * - X-RateLimit-Reset: Unix timestamp (seconds) when the window resets
 *
 * Optionally includes Retry-After header when the request was not allowed.
 *
 * @param result - The result from checkTenantRateLimit()
 * @param includeRetryAfter - Whether to include Retry-After header when rate limited (default: true)
 * @returns Record of header name to header value strings
 */
export function getRateLimitHeaders(
  result: TenantRateLimitResult,
  includeRetryAfter: boolean = true
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)), // Seconds, not ms
  };

  if (!result.allowed && includeRetryAfter && result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Reset all rate limit counters for a tenant.
 * Removes all category entries for the specified tenant.
 * Primarily for admin operations or tier upgrades.
 *
 * @param tenantId - Tenant identifier
 */
export function resetTenantRateLimits(tenantId: string): void {
  for (const category of ALL_CATEGORIES) {
    tenantRateLimitStore.delete(`${category}:${tenantId}`);
  }
}

/**
 * Reset rate limit for a specific tenant and category.
 * More targeted than resetTenantRateLimits().
 *
 * @param tenantId - Tenant identifier
 * @param category - Specific category to reset
 */
export function resetTenantCategoryRateLimit(
  tenantId: string,
  category: TenantRateLimitCategory
): void {
  tenantRateLimitStore.delete(`${category}:${tenantId}`);
}

// ============================================
// Utility Helpers
// ============================================

/**
 * Clear all tenant rate limit entries.
 * Use only in testing or admin operations.
 */
export function clearAllTenantRateLimits(): void {
  tenantRateLimitStore.clear();
}

/**
 * Get the total number of active tenant rate limit entries.
 * Useful for monitoring memory usage.
 */
export function getActiveTenantRateLimitCount(): number {
  return tenantRateLimitStore.size;
}

/**
 * Get all tier rate limit configurations.
 * Returns a deep copy to prevent mutation.
 */
export function getAllTierRateLimits(): Record<TierSlug, TierRateLimits> {
  return {
    starter: { ...TIER_RATE_LIMITS.starter },
    professional: { ...TIER_RATE_LIMITS.professional },
    enterprise: { ...TIER_RATE_LIMITS.enterprise },
  };
}

/**
 * Get the list of categories that are available for a given tier.
 * Excludes categories with a limit of 0 (e.g., AI for starter).
 *
 * @param tier - Subscription tier
 * @returns Array of available categories
 */
export function getAvailableCategories(tier: TierSlug): TenantRateLimitCategory[] {
  return ALL_CATEGORIES.filter((category) => isFeatureAvailable(tier, category));
}

/**
 * Get the list of categories that are NOT available for a given tier.
 * Categories with a limit of 0 are considered unavailable.
 *
 * @param tier - Subscription tier
 * @returns Array of unavailable categories
 */
export function getUnavailableCategories(tier: TierSlug): TenantRateLimitCategory[] {
  return ALL_CATEGORIES.filter((category) => !isFeatureAvailable(tier, category));
}

/**
 * Compare two tiers and return the rate limit multiplier.
 * Useful for showing upgrade incentives in the UI.
 *
 * @param fromTier - Current tier
 * @param toTier - Target tier
 * @param category - Category to compare
 * @returns Multiplier (e.g., 2.0 means the target tier has 2x the limit)
 */
export function getTierUpgradeMultiplier(
  fromTier: TierSlug,
  toTier: TierSlug,
  category: TenantRateLimitCategory
): number {
  const fromLimit = TIER_RATE_LIMITS[fromTier][category];
  const toLimit = TIER_RATE_LIMITS[toTier][category];

  if (fromLimit === 0) {
    // Going from 0 to any positive number is effectively infinite improvement
    return toLimit > 0 ? Infinity : 1;
  }

  return toLimit / fromLimit;
}
