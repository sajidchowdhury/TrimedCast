// ============================================================================
// TrimedCast Job Scheduler System
// Periodic job scheduling with cron-like intervals for production workloads
// Handles auto-recalibration, subscription evaluation, backups, and alerts
// Session 16: Scaling + Production Hardening
// ============================================================================

import { db } from '@/lib/db';
import { enqueue, type QueueName } from '@/lib/api/job-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleInterval = 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly';
export type ScheduledJobType = 'cron' | 'one_time' | 'recurring';

export interface ScheduleDefinition {
  name: string;
  interval: ScheduleInterval;
  type: ScheduledJobType;
  handler: string;       // Job type name to dispatch to job queue
  queue: QueueName;      // From job-queue.ts
  tenantId?: string;     // null/undefined = system-wide job
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}

export interface SchedulerStatus {
  running: boolean;
  tickIntervalMs: number;
  registeredJobs: number;
  dueJobs: number;
  nextRuns: Array<{ name: string; nextRunAt: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TICK_INTERVAL_MS = 60_000; // 60 seconds
const MAX_CONSECUTIVE_FAILURES = 5;      // Pause job after this many failures

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/** In-memory registry of schedule definitions */
const scheduleRegistry = new Map<string, ScheduleDefinition>();

/** Handle for the tick interval timer */
let tickTimer: ReturnType<typeof setInterval> | null = null;

/** Whether the scheduler loop is currently running */
let schedulerRunning = false;

/** Current tick interval in milliseconds */
let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS;

/** Logger shim — swap for real logger in production */
function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
   
  console[level]?.(`[${ts}] [scheduler] ${message}`, meta ?? '');
}

// ---------------------------------------------------------------------------
// calculateNextRun — compute the next run timestamp for a given interval
// ---------------------------------------------------------------------------

export function calculateNextRun(interval: ScheduleInterval, from?: Date): Date {
  const base = from ?? new Date();
  const next = new Date(base.getTime());

  switch (interval) {
    case 'minutely': {
      // Advance to the next full minute
      next.setSeconds(0, 0);
      next.setMinutes(next.getMinutes() + 1);
      break;
    }

    case 'hourly': {
      // Advance to the next full hour
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      break;
    }

    case 'daily': {
      // Next day at 02:00 UTC
      next.setHours(2, 0, 0, 0);
      // If the calculated time is at or before the base time, advance one day
      if (next.getTime() <= base.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    case 'weekly': {
      // Next Monday at 02:00 UTC
      const dayOfWeek = next.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
      next.setUTCHours(2, 0, 0, 0);
      // If the result is at or before the base time, push one more week
      if (next.getTime() <= base.getTime()) {
        next.setUTCDate(next.getUTCDate() + 7);
      }
      break;
    }

    case 'monthly': {
      // 1st of the next month at 02:00 UTC
      next.setUTCDate(1);
      next.setUTCHours(2, 0, 0, 0);
      // If the 1st at 02:00 is at or before the base time, go to next month
      if (next.getTime() <= base.getTime()) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      break;
    }

    default: {
      const _exhaustive: never = interval;
      throw new Error(`Unknown schedule interval: ${String(interval)}`);
    }
  }

  return next;
}

// ---------------------------------------------------------------------------
// registerSchedule — add a schedule definition (in-memory + upsert DB)
// ---------------------------------------------------------------------------

export async function registerSchedule(def: ScheduleDefinition): Promise<void> {
  // Store in memory
  scheduleRegistry.set(def.name, def);

  const nextRunAt = def.enabled === false ? null : calculateNextRun(def.interval);

  try {
    // Upsert into the database
    await db.scheduledJob.upsert({
      where: {
        id: def.name, // We use the job name as a stable logical key via upsert
      },
      create: {
        id: def.name,
        tenantId: def.tenantId ?? null,
        name: def.name,
        type: def.type,
        schedule: def.interval,
        status: def.enabled === false ? 'cancelled' : 'scheduled',
        nextRunAt,
        metadata: def.metadata ? JSON.stringify(def.metadata) : null,
      },
      update: {
        tenantId: def.tenantId ?? null,
        type: def.type,
        schedule: def.interval,
        status: def.enabled === false ? 'cancelled' : 'scheduled',
        nextRunAt,
        metadata: def.metadata ? JSON.stringify(def.metadata) : null,
      },
    });

    log('info', `Registered schedule: ${def.name} (${def.interval}, ${def.type})`);
  } catch (error) {
    // If upsert by id fails (name may not match id in existing rows), try find+create
    try {
      const existing = await db.scheduledJob.findFirst({ where: { name: def.name } });
      if (existing) {
        await db.scheduledJob.update({
          where: { id: existing.id },
          data: {
            tenantId: def.tenantId ?? null,
            type: def.type,
            schedule: def.interval,
            status: def.enabled === false ? 'cancelled' : 'scheduled',
            nextRunAt,
            metadata: def.metadata ? JSON.stringify(def.metadata) : null,
          },
        });
      } else {
        await db.scheduledJob.create({
          data: {
            tenantId: def.tenantId ?? null,
            name: def.name,
            type: def.type,
            schedule: def.interval,
            status: def.enabled === false ? 'cancelled' : 'scheduled',
            nextRunAt,
            metadata: def.metadata ? JSON.stringify(def.metadata) : null,
          },
        });
      }
      log('info', `Registered schedule (find-upsert path): ${def.name}`);
    } catch (dbError) {
      log('error', `Failed to persist schedule ${def.name} to DB`, {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// unregisterSchedule — remove a schedule from memory and mark in DB
// ---------------------------------------------------------------------------

export async function unregisterSchedule(name: string): Promise<void> {
  scheduleRegistry.delete(name);

  try {
    const existing = await db.scheduledJob.findFirst({ where: { name } });
    if (existing) {
      await db.scheduledJob.update({
        where: { id: existing.id },
        data: {
          status: 'cancelled',
          nextRunAt: null,
        },
      });
    }
  } catch (error) {
    log('error', `Failed to cancel schedule ${name} in DB`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  log('info', `Unregistered schedule: ${name}`);
}

// ---------------------------------------------------------------------------
// executeJob — dispatch a due scheduled job to the job queue
// ---------------------------------------------------------------------------

async function executeJob(dbJob: {
  id: string;
  name: string;
  tenantId: string | null;
  metadata: string | null;
  failCount: number;
}): Promise<void> {
  const def = scheduleRegistry.get(dbJob.name);

  if (!def) {
    log('warn', `No schedule definition found for job "${dbJob.name}", skipping execution`);
    await db.scheduledJob.update({
      where: { id: dbJob.id },
      data: {
        status: 'failed',
        lastError: 'Schedule definition not found in registry',
        failCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return;
  }

  const now = new Date();

  // Mark as running
  try {
    await db.scheduledJob.update({
      where: { id: dbJob.id },
      data: {
        status: 'running',
        lastRunAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    log('error', `Failed to mark job ${dbJob.name} as running`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // Dispatch to job queue
  try {
    const parsedMetadata = dbJob.metadata ? JSON.parse(dbJob.metadata) : {};

    enqueue({
      queue: def.queue,
      type: def.handler,
      tenantId: dbJob.tenantId ?? 'system',
      payload: {
        scheduledJobId: dbJob.id,
        scheduledJobName: dbJob.name,
        ...parsedMetadata,
        ...(def.metadata ?? {}),
      },
      priority: 'normal',
      maxAttempts: 3,
    });

    // Mark completed and schedule next run
    const nextRunAt = def.type === 'one_time'
      ? null
      : calculateNextRun(def.interval, now);

    await db.scheduledJob.update({
      where: { id: dbJob.id },
      data: {
        status: def.type === 'one_time' ? 'completed' : 'scheduled',
        nextRunAt,
        failCount: 0,      // Reset on success
        lastError: null,
        updatedAt: new Date(),
      },
    });

    log('info', `Dispatched scheduled job: ${dbJob.name} → queue "${def.queue}"`);
  } catch (error) {
    // Execution failed — track the failure
    const newFailCount = dbJob.failCount + 1;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const shouldPause = newFailCount >= MAX_CONSECUTIVE_FAILURES;

    const nextRunAt = shouldPause
      ? null   // Pause the job
      : calculateNextRun(def.interval, now);

    await db.scheduledJob.update({
      where: { id: dbJob.id },
      data: {
        status: shouldPause ? 'failed' : 'scheduled',
        failCount: newFailCount,
        lastError: errorMsg,
        nextRunAt,
        updatedAt: new Date(),
      },
    });

    log('error', `Failed to execute scheduled job: ${dbJob.name}`, {
      error: errorMsg,
      failCount: newFailCount,
      paused: shouldPause,
    });
  }
}

// ---------------------------------------------------------------------------
// tick — check for due jobs and dispatch them
// ---------------------------------------------------------------------------

export async function tick(): Promise<void> {
  const now = new Date();

  try {
    // Find all jobs that are due: status=scheduled and nextRunAt <= now
    const dueJobs = await db.scheduledJob.findMany({
      where: {
        status: 'scheduled',
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: 50, // Process at most 50 jobs per tick to avoid overload
    });

    if (dueJobs.length === 0) return;

    log('info', `Scheduler tick: ${dueJobs.length} due job(s) found`);

    // Execute jobs in parallel (they just enqueue, so it's safe)
    await Promise.allSettled(
      dueJobs.map((job) =>
        executeJob({
          id: job.id,
          name: job.name,
          tenantId: job.tenantId,
          metadata: job.metadata,
          failCount: job.failCount,
        })
      )
    );
  } catch (error) {
    log('error', 'Scheduler tick failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ---------------------------------------------------------------------------
// startScheduler / stopScheduler — control the tick loop
// ---------------------------------------------------------------------------

export function startScheduler(intervalMs?: number): void {
  if (schedulerRunning) {
    log('warn', 'Scheduler is already running');
    return;
  }

  tickIntervalMs = intervalMs ?? DEFAULT_TICK_INTERVAL_MS;
  schedulerRunning = true;

  // Run first tick immediately
  tick().catch((err) => {
    log('error', 'Initial tick error', { error: err instanceof Error ? err.message : String(err) });
  });

  // Schedule subsequent ticks
  tickTimer = setInterval(() => {
    tick().catch((err) => {
      log('error', 'Tick error', { error: err instanceof Error ? err.message : String(err) });
    });
  }, tickIntervalMs);

  log('info', `Scheduler started (tick every ${tickIntervalMs}ms)`);
}

export function stopScheduler(): void {
  if (!schedulerRunning) {
    log('warn', 'Scheduler is not running');
    return;
  }

  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }

  schedulerRunning = false;
  log('info', 'Scheduler stopped');
}

// ---------------------------------------------------------------------------
// isSchedulerRunning
// ---------------------------------------------------------------------------

export function isSchedulerRunning(): boolean {
  return schedulerRunning;
}

// ---------------------------------------------------------------------------
// getSchedulerStatus — current status with next run times
// ---------------------------------------------------------------------------

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const now = new Date();

  let dueJobs = 0;
  let nextRuns: Array<{ name: string; nextRunAt: string }> = [];

  try {
    dueJobs = await db.scheduledJob.count({
      where: {
        status: 'scheduled',
        nextRunAt: { lte: now },
      },
    });

    const scheduled = await db.scheduledJob.findMany({
      where: {
        status: 'scheduled',
        nextRunAt: { not: null },
      },
      select: { name: true, nextRunAt: true },
      orderBy: { nextRunAt: 'asc' },
      take: 20,
    });

    nextRuns = scheduled
      .filter((j) => j.nextRunAt !== null)
      .map((j) => ({
        name: j.name,
        nextRunAt: j.nextRunAt!.toISOString(),
      }));
  } catch (error) {
    log('error', 'Failed to query scheduler status from DB', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    running: schedulerRunning,
    tickIntervalMs,
    registeredJobs: scheduleRegistry.size,
    dueJobs,
    nextRuns,
  };
}

// ---------------------------------------------------------------------------
// getScheduledJobs — list all registered schedule definitions
// ---------------------------------------------------------------------------

export function getScheduledJobs(): ScheduleDefinition[] {
  return Array.from(scheduleRegistry.values());
}

// ---------------------------------------------------------------------------
// pauseJob — pause a scheduled job (set nextRunAt to null)
// ---------------------------------------------------------------------------

export async function pauseJob(name: string): Promise<boolean> {
  try {
    const existing = await db.scheduledJob.findFirst({ where: { name } });
    if (!existing) {
      log('warn', `Cannot pause unknown job: ${name}`);
      return false;
    }

    await db.scheduledJob.update({
      where: { id: existing.id },
      data: {
        status: 'cancelled',  // 'cancelled' serves as "paused" in our status enum
        nextRunAt: null,
        updatedAt: new Date(),
      },
    });

    log('info', `Paused scheduled job: ${name}`);
    return true;
  } catch (error) {
    log('error', `Failed to pause job: ${name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// resumeJob — resume a paused job (recalculate nextRunAt)
// ---------------------------------------------------------------------------

export async function resumeJob(name: string): Promise<boolean> {
  const def = scheduleRegistry.get(name);
  if (!def) {
    log('warn', `Cannot resume unknown job: ${name}`);
    return false;
  }

  try {
    const existing = await db.scheduledJob.findFirst({ where: { name } });
    if (!existing) {
      log('warn', `No DB record for job: ${name}`);
      return false;
    }

    const nextRunAt = calculateNextRun(def.interval);

    await db.scheduledJob.update({
      where: { id: existing.id },
      data: {
        status: 'scheduled',
        nextRunAt,
        failCount: 0,     // Reset failure tracking on resume
        lastError: null,
        updatedAt: new Date(),
      },
    });

    log('info', `Resumed scheduled job: ${name} (next run at ${nextRunAt.toISOString()})`);
    return true;
  } catch (error) {
    log('error', `Failed to resume job: ${name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Default Schedule Definitions
// ---------------------------------------------------------------------------

const DEFAULT_SCHEDULES: ScheduleDefinition[] = [
  {
    name: 'auto_recalibration',
    interval: 'weekly',
    type: 'recurring',
    handler: 'recalibrate_forecasts',
    queue: 'forecasts',
  },
  {
    name: 'subscription_eval',
    interval: 'daily',
    type: 'recurring',
    handler: 'evaluate_subscriptions',
    queue: 'default',
  },
  {
    name: 'usage_alert',
    interval: 'daily',
    type: 'recurring',
    handler: 'check_usage_alerts',
    queue: 'notifications',
  },
  {
    name: 'cleanup_expired',
    interval: 'daily',
    type: 'recurring',
    handler: 'cleanup_expired_data',
    queue: 'default',
  },
  {
    name: 'weekly_backup',
    interval: 'weekly',
    type: 'recurring',
    handler: 'create_tenant_backups',
    queue: 'backups',
    metadata: { enterpriseOnly: true },
  },
];

// ---------------------------------------------------------------------------
// initializeDefaultSchedules — register all default schedules
// ---------------------------------------------------------------------------

export async function initializeDefaultSchedules(): Promise<void> {
  log('info', `Initializing ${DEFAULT_SCHEDULES.length} default schedule(s)...`);

  for (const def of DEFAULT_SCHEDULES) {
    await registerSchedule(def);
  }

  log('info', 'Default schedules initialized');
}

// ---------------------------------------------------------------------------
// Auto-start on module load
// ---------------------------------------------------------------------------

let autoStarted = false;

async function autoStart(): Promise<void> {
  if (autoStarted) return;
  autoStarted = true;

  try {
    // Register default schedules before starting the loop
    await initializeDefaultSchedules();
    // Start the scheduler tick loop
    startScheduler();
  } catch (error) {
    log('error', 'Auto-start failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Auto-start disabled — scheduler starts on-demand via API endpoint
// This prevents crashes during Next.js hot-reload/compilation
// To start the scheduler, call: POST /api/v1/scheduler { action: 'start' }
// Or call startScheduler() + initializeDefaultSchedules() from server code
log('info', 'Scheduler loaded — start via API or explicit call');
