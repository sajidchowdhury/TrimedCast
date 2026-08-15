// ============================================
// TrimedCast — Health Check System
// Session 16: Scaling + Production Hardening
// Based on Multi-Tenancy & SaaS Architecture.md Section 8-9
//
// Monitors system health, component status,
// and production readiness for the
// motorcycle parts forecasting platform.
// ============================================

import { db } from '@/lib/db';
import { getAllCacheStats } from '@/lib/forecasting/cache';

// ============================================
// Types
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  error?: string;
  lastChecked: string; // ISO timestamp
}

export interface SystemHealth {
  status: HealthStatus;
  uptime: number;         // seconds
  uptimeFormatted: string; // "2d 5h 30m"
  version: string;        // app version
  environment: string;    // development | production
  timestamp: string;      // ISO timestamp
  components: ComponentHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface ProductionConfig {
  category: string;
  item: string;
  required: boolean;
  set: boolean;
  value?: string;  // masked if sensitive
}

// ============================================
// Constants
// ============================================

const SYSTEM_START = Date.now();

const APP_VERSION = '0.2.1';

// Thresholds for memory health
const HEAP_USAGE_DEGRADED_THRESHOLD = 0.75;  // 75%
const HEAP_USAGE_UNHEALTHY_THRESHOLD = 0.90; // 90%
const RSS_DEGRADED_THRESHOLD_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

// ============================================
// Helper: Format Uptime
// ============================================

function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

// ============================================
// Helper: Determine Aggregate Status
// ============================================

function aggregateStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
}

// ============================================
// Helper: Mask Sensitive Values
// ============================================

function maskValue(value: string | undefined, sensitive: boolean): string | undefined {
  if (!value) return undefined;
  if (!sensitive) return value;
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

// ============================================
// Health Check: Database
// ============================================

export async function checkDatabaseHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Simple connectivity ping via raw query
    await db.$queryRaw`SELECT 1`;

    const responseTimeMs = Date.now() - start;

    // If response time is very slow, mark as degraded
    let status: HealthStatus = 'healthy';
    if (responseTimeMs > 2000) {
      status = 'unhealthy';
    } else if (responseTimeMs > 500) {
      status = 'degraded';
    }

    return {
      name: 'database',
      status,
      responseTimeMs,
      details: {
        provider: 'postgresql',
        connected: true,
      },
      lastChecked,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return {
      name: 'database',
      status: 'unhealthy',
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
      details: {
        provider: 'postgresql',
        connected: false,
      },
      lastChecked,
    };
  }
}

// ============================================
// Health Check: Cache
// ============================================

export async function checkCacheHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    const stats = getAllCacheStats();

    const responseTimeMs = Date.now() - start;

    // Calculate total cache entries and hit rate across all caches
    const cacheNames = Object.keys(stats) as string[];
    const totalEntries = cacheNames.reduce((sum, name) => sum + (stats as Record<string, { size: number; hits: number; misses: number; evictions: number }>)[name].size, 0);
    const totalHits = cacheNames.reduce((sum, name) => sum + (stats as Record<string, { size: number; hits: number; misses: number; evictions: number }>)[name].hits, 0);
    const totalMisses = cacheNames.reduce((sum, name) => sum + (stats as Record<string, { size: number; hits: number; misses: number; evictions: number }>)[name].misses, 0);
    const totalEvictions = cacheNames.reduce((sum, name) => sum + (stats as Record<string, { size: number; hits: number; misses: number; evictions: number }>)[name].evictions, 0);
    const totalLookups = totalHits + totalMisses;
    const overallHitRate = totalLookups > 0
      ? `${((totalHits / totalLookups) * 100).toFixed(1)}%`
      : '0%';

    return {
      name: 'cache',
      status: 'healthy',
      responseTimeMs,
      details: {
        totalEntries,
        overallHitRate,
        totalHits,
        totalMisses,
        totalEvictions,
        caches: stats,
      },
      lastChecked,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return {
      name: 'cache',
      status: 'degraded',
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
      details: {
        available: false,
      },
      lastChecked,
    };
  }
}

// ============================================
// Health Check: Job Queue
// ============================================

export async function checkQueueHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Dynamic import to handle case where job-queue module doesn't exist yet
    const jobQueueModule = await import('@/lib/api/job-queue');
    const getAllQueueStats = jobQueueModule.getAllQueueStats as unknown as () => Record<string, unknown>;

    const stats = getAllQueueStats();
    const responseTimeMs = Date.now() - start;

    // Check if any queue has stalled or failed jobs
    const queueNames = Object.keys(stats);
    let status: HealthStatus = 'healthy';

    for (const queueName of queueNames) {
      const queueData = stats[queueName] as Record<string, unknown>;
      if (typeof queueData === 'object' && queueData !== null) {
        const failed = queueData.failed as number | undefined;
        const stalled = queueData.stalled as number | undefined;
        if ((failed && failed > 10) || (stalled && stalled > 5)) {
          status = 'unhealthy';
          break;
        }
        if ((failed && failed > 0) || (stalled && stalled > 0)) {
          status = 'degraded';
        }
      }
    }

    return {
      name: 'jobQueue',
      status,
      responseTimeMs,
      details: {
        queues: queueNames.length,
        stats,
      },
      lastChecked,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    // If job-queue module is not available, mark as degraded (not unhealthy)
    // since queue system may not be initialized yet
    return {
      name: 'jobQueue',
      status: 'degraded',
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
      details: {
        available: false,
        reason: 'Job queue module not available or not initialized',
      },
      lastChecked,
    };
  }
}

// ============================================
// Health Check: Memory
// ============================================

export async function checkMemoryHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  const memUsage = process.memoryUsage();
  const responseTimeMs = Date.now() - start;

  const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;

  let status: HealthStatus = 'healthy';
  if (heapUsedRatio > HEAP_USAGE_UNHEALTHY_THRESHOLD) {
    status = 'unhealthy';
  } else if (heapUsedRatio > HEAP_USAGE_DEGRADED_THRESHOLD || memUsage.rss > RSS_DEGRADED_THRESHOLD_BYTES) {
    status = 'degraded';
  }

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  return {
    name: 'memory',
    status,
    responseTimeMs,
    details: {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsedRatio: `${(heapUsedRatio * 100).toFixed(1)}%`,
      rss: formatBytes(memUsage.rss),
      external: formatBytes(memUsage.external),
      arrayBuffers: formatBytes(memUsage.arrayBuffers),
      heapUsedRaw: memUsage.heapUsed,
      heapTotalRaw: memUsage.heapTotal,
      rssRaw: memUsage.rss,
    },
    lastChecked,
  };
}

// ============================================
// Health Check: Disk
// ============================================

export async function checkDiskHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Use process.resourceUsage() for disk I/O info (Node.js 10.5+)
    const resourceUsage: NodeJS.ResourceUsage | null =
      typeof process.resourceUsage === 'function' ? process.resourceUsage() : null;
    const responseTimeMs = Date.now() - start;

    // We can't directly check disk space from pure Node.js without fs.statfs
    // (which is Node 18.15+ experimental). Instead, we provide what we can
    // from the process resource usage and mark as healthy since we can't
    // definitively determine disk issues.

    const details: Record<string, unknown> = {};

    if (resourceUsage) {
      details.fsRead = resourceUsage.fsRead;
      details.fsWrite = resourceUsage.fsWrite;
      details.userCpuSeconds = resourceUsage.userCPUTime / 1_000_000;
      details.systemCpuSeconds = resourceUsage.systemCPUTime / 1_000_000;
      details.maxRss = resourceUsage.maxRSS;
    }

    // Check if CPU usage seems excessive (based on resource usage)
    let status: HealthStatus = 'healthy';
    if (resourceUsage) {
      const totalCpu = (resourceUsage.userCPUTime + resourceUsage.systemCPUTime) / 1_000_000;
      const uptimeSec = getUptime();
      if (uptimeSec > 0) {
        const cpuUsageRatio = totalCpu / uptimeSec;
        if (cpuUsageRatio > 0.95) {
          status = 'degraded';
          details.cpuUsageRatio = `${(cpuUsageRatio * 100).toFixed(1)}%`;
        }
      }
    }

    details.nodeVersion = process.version;
    details.pid = process.pid;
    details.platform = process.platform;
    details.arch = process.arch;

    return {
      name: 'disk',
      status,
      responseTimeMs,
      details,
      lastChecked,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return {
      name: 'disk',
      status: 'degraded',
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
      lastChecked,
    };
  }
}

// ============================================
// Health Check: API Response Time (Ping)
// ============================================

export async function checkApiHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Ping the health endpoint itself to measure round-trip
    // In production, this would be a self-referential check.
    // For now, we measure the internal processing overhead.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // We do a lightweight fetch to our own API base
    // Set a short timeout to avoid hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let statusCode = 0;
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      statusCode = response.status;
    } catch (fetchError) {
      // If we can't reach ourselves (e.g., during SSR or build),
      // that's expected — we still report the internal timing
      statusCode = 0;
    } finally {
      clearTimeout(timeoutId);
    }

    const responseTimeMs = Date.now() - start;

    let status: HealthStatus = 'healthy';
    if (statusCode === 0) {
      // Self-ping not available (expected during build/SSR)
      status = 'degraded';
    } else if (statusCode >= 500) {
      status = 'unhealthy';
    } else if (statusCode >= 400 || responseTimeMs > 2000) {
      status = 'degraded';
    } else if (responseTimeMs > 500) {
      status = 'degraded';
    }

    return {
      name: 'api',
      status,
      responseTimeMs,
      details: {
        pingTarget: `${baseUrl}/api/health`,
        statusCode,
        note: statusCode === 0 ? 'Self-ping unreachable (expected during build/SSR)' : undefined,
      },
      lastChecked,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return {
      name: 'api',
      status: 'degraded',
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
      lastChecked,
    };
  }
}

// ============================================
// Uptime
// ============================================

export function getUptime(): number {
  return (Date.now() - SYSTEM_START) / 1000;
}

// ============================================
// Production Configuration
// ============================================

export function getProductionConfig(): ProductionConfig[] {
  const env = process.env;
  const isProd = env.NODE_ENV === 'production';

  const configs: ProductionConfig[] = [
    // Core infrastructure
    {
      category: 'infrastructure',
      item: 'DATABASE_URL',
      required: true,
      set: !!env.DATABASE_URL,
      value: maskValue(env.DATABASE_URL, true),
    },
    {
      category: 'infrastructure',
      item: 'NODE_ENV',
      required: true,
      set: !!env.NODE_ENV,
      value: env.NODE_ENV,
    },

    // Authentication
    {
      category: 'authentication',
      item: 'NEXTAUTH_SECRET',
      required: isProd,
      set: !!env.NEXTAUTH_SECRET,
      value: maskValue(env.NEXTAUTH_SECRET, true),
    },
    {
      category: 'authentication',
      item: 'NEXTAUTH_URL',
      required: isProd,
      set: !!env.NEXTAUTH_URL,
      value: env.NEXTAUTH_URL,
    },

    // Billing / Stripe
    {
      category: 'billing',
      item: 'STRIPE_KEY',
      required: false,
      set: !!env.STRIPE_KEY,
      value: maskValue(env.STRIPE_KEY, true),
    },
    {
      category: 'billing',
      item: 'STRIPE_SECRET',
      required: false,
      set: !!env.STRIPE_SECRET,
      value: maskValue(env.STRIPE_SECRET, true),
    },
    {
      category: 'billing',
      item: 'STRIPE_WEBHOOK_SECRET',
      required: isProd,
      set: !!env.STRIPE_WEBHOOK_SECRET,
      value: maskValue(env.STRIPE_WEBHOOK_SECRET, true),
    },

    // Application
    {
      category: 'application',
      item: 'NEXT_PUBLIC_APP_URL',
      required: isProd,
      set: !!env.NEXT_PUBLIC_APP_URL,
      value: env.NEXT_PUBLIC_APP_URL,
    },
    {
      category: 'application',
      item: 'NEXT_PUBLIC_APP_NAME',
      required: false,
      set: !!env.NEXT_PUBLIC_APP_NAME,
      value: env.NEXT_PUBLIC_APP_NAME,
    },
  ];

  return configs;
}

// ============================================
// Full System Health
// ============================================

export async function getFullSystemHealth(): Promise<SystemHealth> {
  const uptime = getUptime();
  const timestamp = new Date().toISOString();

  // Run all health checks in parallel
  const [database, cache, jobQueue, memory, disk, api] = await Promise.allSettled([
    checkDatabaseHealth(),
    checkCacheHealth(),
    checkQueueHealth(),
    checkMemoryHealth(),
    checkDiskHealth(),
    checkApiHealth(),
  ]);

  // Extract results, replacing rejected promises with unhealthy components
  const components: ComponentHealth[] = [
    database.status === 'fulfilled'
      ? database.value
      : {
          name: 'database',
          status: 'unhealthy' as HealthStatus,
          responseTimeMs: 0,
          error: database.status === 'rejected' ? String(database.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
    cache.status === 'fulfilled'
      ? cache.value
      : {
          name: 'cache',
          status: 'degraded' as HealthStatus,
          responseTimeMs: 0,
          error: cache.status === 'rejected' ? String(cache.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
    jobQueue.status === 'fulfilled'
      ? jobQueue.value
      : {
          name: 'jobQueue',
          status: 'degraded' as HealthStatus,
          responseTimeMs: 0,
          error: jobQueue.status === 'rejected' ? String(jobQueue.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
    memory.status === 'fulfilled'
      ? memory.value
      : {
          name: 'memory',
          status: 'unhealthy' as HealthStatus,
          responseTimeMs: 0,
          error: memory.status === 'rejected' ? String(memory.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
    disk.status === 'fulfilled'
      ? disk.value
      : {
          name: 'disk',
          status: 'degraded' as HealthStatus,
          responseTimeMs: 0,
          error: disk.status === 'rejected' ? String(disk.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
    api.status === 'fulfilled'
      ? api.value
      : {
          name: 'api',
          status: 'degraded' as HealthStatus,
          responseTimeMs: 0,
          error: api.status === 'rejected' ? String(api.reason) : 'Unknown error',
          lastChecked: timestamp,
        },
  ];

  // Compute summary
  const summary = {
    total: components.length,
    healthy: components.filter((c) => c.status === 'healthy').length,
    degraded: components.filter((c) => c.status === 'degraded').length,
    unhealthy: components.filter((c) => c.status === 'unhealthy').length,
  };

  // Compute overall status
  const overallStatus = aggregateStatus(components.map((c) => c.status));

  return {
    status: overallStatus,
    uptime: Math.round(uptime),
    uptimeFormatted: formatUptime(uptime),
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    timestamp,
    components,
    summary,
  };
}
