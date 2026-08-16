// ============================================================================
// TrimedCast Job Queue System
// In-memory job queue with priority support, monitoring, and automatic retry
// Similar to Laravel Horizon — designed for SQLite-backed SaaS platform
// Session 16: Scaling + Production Hardening
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobPriority = 'critical' | 'high' | 'normal' | 'low';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying' | 'cancelled';
export type QueueName = 'forecasts' | 'imports' | 'backups' | 'exports' | 'notifications' | 'default';

export interface Job {
  id: string;
  queue: QueueName;
  priority: JobPriority;
  status: JobStatus;
  type: string;
  tenantId: string;
  userId?: string;
  payload: Record<string, unknown>;
  progress: number;       // 0-100
  attempts: number;
  maxAttempts: number;    // default 3
  timeout: number;        // ms, default 300000 (5 min)
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface QueueStats {
  name: QueueName;
  depth: number;
  running: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  throughputPerMin: number;
}

export interface QueueConfig {
  concurrency: number;
  retryDelay: number;
  jobTimeout: number;
}

export interface SystemLoad {
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  overallThroughputPerMin: number;
  overallAvgProcessingTime: number;
  overallFailureRate: number;
  queueDetails: QueueStats[];
  uptime: number;
}

export type JobHandler = (job: Job) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const DEFAULT_QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  forecasts:      { concurrency: 2, retryDelay: 5000,  jobTimeout: 300000 },
  imports:        { concurrency: 1, retryDelay: 3000,  jobTimeout: 600000 },
  backups:        { concurrency: 1, retryDelay: 10000, jobTimeout: 1800000 },
  exports:        { concurrency: 2, retryDelay: 2000,  jobTimeout: 120000 },
  notifications:  { concurrency: 5, retryDelay: 1000,  jobTimeout: 30000 },
  default:        { concurrency: 3, retryDelay: 2000,  jobTimeout: 120000 },
};

const ALL_QUEUE_NAMES: QueueName[] = [
  'forecasts', 'imports', 'backups', 'exports', 'notifications', 'default',
];

const PROCESSOR_INTERVAL_MS = 1000; // 1 second
const STATS_WINDOW_MS = 60_000;     // 1 minute rolling window for throughput

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function generateJobId(): string {
  // Use crypto.randomUUID when available; otherwise fallback
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ---------------------------------------------------------------------------
// Internal data structures
// ---------------------------------------------------------------------------

/** All jobs indexed by id */
const jobsById: Map<string, Job> = new Map();

/** Per-queue arrays of queued job ids, maintained in priority order */
const queuedJobs: Record<QueueName, string[]> = {
  forecasts: [],
  imports: [],
  backups: [],
  exports: [],
  notifications: [],
  default: [],
};

/** Per-queue sets of currently running job ids */
const runningJobs: Record<QueueName, Set<string>> = {
  forecasts: new Set(),
  imports: new Set(),
  backups: new Set(),
  exports: new Set(),
  notifications: new Set(),
  default: new Set(),
};

/** Per-queue arrays of completed job ids (today / recent) */
const completedJobs: Record<QueueName, string[]> = {
  forecasts: [],
  imports: [],
  backups: [],
  exports: [],
  notifications: [],
  default: [],
};

/** Per-queue arrays of failed job ids */
const failedJobs: Record<QueueName, string[]> = {
  forecasts: [],
  imports: [],
  backups: [],
  exports: [],
  notifications: [],
  default: [],
};

/** Per-queue running totals for stats (reset on purge or rolling) */
const processingTimes: Record<QueueName, number[]> = {
  forecasts: [],
  imports: [],
  backups: [],
  exports: [],
  notifications: [],
  default: [],
};

/** Timestamps of completions within the rolling window (for throughput) */
const completionTimestamps: Record<QueueName, number[]> = {
  forecasts: [],
  imports: [],
  backups: [],
  exports: [],
  notifications: [],
  default: [],
};

/** Queue configurations (can be overridden) */
const queueConfigs: Record<QueueName, QueueConfig> = { ...DEFAULT_QUEUE_CONFIGS };

/** Handler registry: job type → handler function */
const handlers: Map<string, JobHandler> = new Map();

/** System start time for uptime calculation */
const systemStartTime: number = Date.now();

// ---------------------------------------------------------------------------
// Processor state
// ---------------------------------------------------------------------------

let processorTimer: ReturnType<typeof setInterval> | null = null;
let processorRunning: boolean = false;

/** Active timeouts for scheduled retries */
const retryTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

/** Active timeouts for job TTL enforcement */
const ttlTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): number {
  return Date.now();
}

function getQueueName(queue?: QueueName): QueueName {
  return queue ?? 'default';
}

/** Insert a job id into the queue array at the correct priority-sorted position */
function insertByPriority(queue: QueueName, jobId: string): void {
  const job = jobsById.get(jobId);
  if (!job) return;

  const arr = queuedJobs[queue];
  const priorityRank = PRIORITY_ORDER[job.priority];

  // Find insertion point: keep array sorted by priority (lower rank = higher priority)
  let insertIdx = arr.length;
  for (let i = 0; i < arr.length; i++) {
    const existingJob = jobsById.get(arr[i]);
    if (existingJob && PRIORITY_ORDER[existingJob.priority] > priorityRank) {
      insertIdx = i;
      break;
    }
  }

  arr.splice(insertIdx, 0, jobId);
}

/** Prune timestamps older than the rolling window */
function pruneTimestamps(queue: QueueName): void {
  const cutoff = now() - STATS_WINDOW_MS;
  completionTimestamps[queue] = completionTimestamps[queue].filter(t => t >= cutoff);
}

/** Prune processing times to keep only recent entries (last 1000) */
function pruneProcessingTimes(queue: QueueName): void {
  if (processingTimes[queue].length > 1000) {
    processingTimes[queue] = processingTimes[queue].slice(-1000);
  }
}

/** Schedule a job timeout (TTL enforcement) */
function scheduleJobTimeout(jobId: string, timeoutMs: number): void {
  // Clear any existing timeout
  const existing = ttlTimeouts.get(jobId);
  if (existing !== undefined) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    ttlTimeouts.delete(jobId);
    const job = jobsById.get(jobId);
    if (job && job.status === 'running') {
      failJob(jobId, `Job timed out after ${timeoutMs}ms`);
    }
  }, timeoutMs);

  ttlTimeouts.set(jobId, timer);
}

/** Clear a job timeout */
function clearJobTimeout(jobId: string): void {
  const timer = ttlTimeouts.get(jobId);
  if (timer !== undefined) {
    clearTimeout(timer);
    ttlTimeouts.delete(jobId);
  }
}

// ---------------------------------------------------------------------------
// Core Queue Operations
// ---------------------------------------------------------------------------

/**
 * Enqueue a new job.
 * Returns the generated job id.
 */
export function enqueue(input: {
  queue?: QueueName;
  priority?: JobPriority;
  type: string;
  tenantId: string;
  userId?: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  timeout?: number;
}): string {
  const queue = getQueueName(input.queue);
  const id = generateJobId();
  const timestamp = now();

  const job: Job = {
    id,
    queue,
    priority: input.priority ?? 'normal',
    status: 'queued',
    type: input.type,
    tenantId: input.tenantId,
    userId: input.userId,
    payload: input.payload ?? {},
    progress: 0,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    timeout: input.timeout ?? queueConfigs[queue].jobTimeout,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  jobsById.set(id, job);
  insertByPriority(queue, id);

  return id;
}

/**
 * Dequeue the next job from a queue (highest priority first).
 * Returns undefined if no job is available or concurrency limit is reached.
 */
export function dequeue(queue: QueueName): Job | undefined {
  const config = queueConfigs[queue];
  const running = runningJobs[queue];

  // Respect concurrency limit
  if (running.size >= config.concurrency) {
    return undefined;
  }

  // Find next queued job
  while (queuedJobs[queue].length > 0) {
    const jobId = queuedJobs[queue].shift()!;
    const job = jobsById.get(jobId);

    // Skip if job no longer exists or is no longer queued
    if (!job || job.status !== 'queued') {
      continue;
    }

    // Mark as running
    job.status = 'running';
    job.attempts += 1;
    job.startedAt = now();
    job.updatedAt = now();
    running.add(jobId);

    // Schedule TTL enforcement
    scheduleJobTimeout(jobId, job.timeout);

    return job;
  }

  return undefined;
}

/**
 * Update job progress (0-100).
 */
export function updateProgress(jobId: string, progress: number): boolean {
  const job = jobsById.get(jobId);
  if (!job || (job.status !== 'running' && job.status !== 'retrying')) {
    return false;
  }

  job.progress = Math.max(0, Math.min(100, Math.round(progress)));
  job.updatedAt = now();
  return true;
}

/**
 * Mark a job as completed with an optional result.
 */
export function completeJob(jobId: string, result?: unknown): boolean {
  const job = jobsById.get(jobId);
  if (!job || (job.status !== 'running' && job.status !== 'retrying')) {
    return false;
  }

  const timestamp = now();
  const processingTime = job.startedAt ? timestamp - job.startedAt : 0;

  job.status = 'completed';
  job.progress = 100;
  job.result = result;
  job.completedAt = timestamp;
  job.updatedAt = timestamp;

  // Clear TTL timeout
  clearJobTimeout(jobId);

  // Move out of running
  runningJobs[job.queue].delete(jobId);

  // Track stats
  completedJobs[job.queue].push(jobId);
  processingTimes[job.queue].push(processingTime);
  pruneProcessingTimes(job.queue);
  completionTimestamps[job.queue].push(timestamp);
  pruneTimestamps(job.queue);

  return true;
}

/**
 * Mark a job as failed. If attempts < maxAttempts, schedule automatic retry
 * with exponential backoff.
 */
export function failJob(jobId: string, error: string): boolean {
  const job = jobsById.get(jobId);
  if (!job || job.status === 'completed' || job.status === 'cancelled') {
    return false;
  }

  const timestamp = now();
  const processingTime = job.startedAt ? timestamp - job.startedAt : 0;

  // Clear TTL timeout
  clearJobTimeout(jobId);

  // Move out of running
  runningJobs[job.queue].delete(jobId);

  // Record processing time even for failures
  if (processingTime > 0) {
    processingTimes[job.queue].push(processingTime);
    pruneProcessingTimes(job.queue);
  }

  job.error = error;
  job.updatedAt = timestamp;

  // Check if we can retry
  if (job.attempts < job.maxAttempts) {
    // Schedule retry with exponential backoff
    const config = queueConfigs[job.queue];
    const backoffMs = config.retryDelay * Math.pow(2, job.attempts - 1);

    job.status = 'retrying';
    job.completedAt = undefined;
    job.startedAt = undefined;

    // Clear any existing retry timeout for this job
    const existingTimeout = retryTimeouts.get(jobId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
    }

    const timer = setTimeout(() => {
      retryTimeouts.delete(jobId);
      requeueForRetry(jobId);
    }, backoffMs);

    retryTimeouts.set(jobId, timer);
  } else {
    // Max attempts reached — mark as failed
    job.status = 'failed';
    job.completedAt = timestamp;
    failedJobs[job.queue].push(jobId);
  }

  return true;
}

/**
 * Internal: re-queue a job for retry after backoff expires.
 */
function requeueForRetry(jobId: string): void {
  const job = jobsById.get(jobId);
  if (!job || job.status !== 'retrying') return;

  job.status = 'queued';
  job.updatedAt = now();
  insertByPriority(job.queue, jobId);
}

/**
 * Cancel a job. Only queued or retrying jobs can be cancelled.
 */
export function cancelJob(jobId: string): boolean {
  const job = jobsById.get(jobId);
  if (!job) return false;

  if (job.status === 'queued') {
    // Remove from queue array
    const idx = queuedJobs[job.queue].indexOf(jobId);
    if (idx !== -1) {
      queuedJobs[job.queue].splice(idx, 1);
    }
  } else if (job.status === 'retrying') {
    // Clear retry timeout
    const timer = retryTimeouts.get(jobId);
    if (timer !== undefined) {
      clearTimeout(timer);
      retryTimeouts.delete(jobId);
    }
  } else if (job.status === 'running') {
    // Clear TTL timeout and remove from running
    clearJobTimeout(jobId);
    runningJobs[job.queue].delete(jobId);
  } else {
    // Cannot cancel completed, failed, or already cancelled jobs
    return false;
  }

  job.status = 'cancelled';
  job.completedAt = now();
  job.updatedAt = now();
  return true;
}

// ---------------------------------------------------------------------------
// Query Operations
// ---------------------------------------------------------------------------

/**
 * Get a job by id.
 */
export function getJob(jobId: string): Job | undefined {
  return jobsById.get(jobId);
}

/**
 * Get stats for a specific queue.
 */
export function getQueueStats(queue: QueueName): QueueStats {
  pruneTimestamps(queue);

  const depth = queuedJobs[queue].filter(id => {
    const j = jobsById.get(id);
    return j && j.status === 'queued';
  }).length;

  const running = runningJobs[queue].size;
  const completed = completedJobs[queue].length;
  const failed = failedJobs[queue].length;

  // Average processing time (from recent sample)
  const times = processingTimes[queue];
  const avgProcessingTime = times.length > 0
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;

  // Throughput: completions in the rolling 1-minute window
  const throughputPerMin = completionTimestamps[queue].length;

  return {
    name: queue,
    depth,
    running,
    completed,
    failed,
    avgProcessingTime,
    throughputPerMin,
  };
}

/**
 * Get stats for all queues.
 */
export function getAllQueueStats(): QueueStats[] {
  return ALL_QUEUE_NAMES.map(getQueueStats);
}

/**
 * Get failed jobs, optionally filtered by queue.
 */
export function getFailedJobs(queue?: QueueName): Job[] {
  const queues: QueueName[] = queue ? [queue] : ALL_QUEUE_NAMES;
  const result: Job[] = [];

  for (const q of queues) {
    for (const jobId of failedJobs[q]) {
      const job = jobsById.get(jobId);
      if (job && job.status === 'failed') {
        result.push(job);
      }
    }
  }

  // Sort by updatedAt descending (most recent first)
  result.sort((a, b) => b.updatedAt - a.updatedAt);
  return result;
}

/**
 * Manually retry a failed job.
 */
export function retryFailedJob(jobId: string): boolean {
  const job = jobsById.get(jobId);
  if (!job || job.status !== 'failed') return false;

  // Remove from failed list
  const idx = failedJobs[job.queue].indexOf(jobId);
  if (idx !== -1) {
    failedJobs[job.queue].splice(idx, 1);
  }

  // Reset for retry
  job.status = 'queued';
  job.attempts = 0;
  job.error = undefined;
  job.result = undefined;
  job.progress = 0;
  job.startedAt = undefined;
  job.completedAt = undefined;
  job.updatedAt = now();

  insertByPriority(job.queue, jobId);
  return true;
}

/**
 * Purge completed jobs older than the given threshold.
 * Defaults to 1 hour.
 */
export function purgeCompletedJobs(olderThanMs: number = 3600000): number {
  const cutoff = now() - olderThanMs;
  let purged = 0;

  for (const q of ALL_QUEUE_NAMES) {
    const remaining: string[] = [];

    for (const jobId of completedJobs[q]) {
      const job = jobsById.get(jobId);
      if (job && job.completedAt && job.completedAt < cutoff) {
        jobsById.delete(jobId);
        purged++;
      } else {
        remaining.push(jobId);
      }
    }

    completedJobs[q] = remaining;
  }

  return purged;
}

/**
 * Get recent job history, optionally filtered by queue.
 * Returns jobs sorted by updatedAt descending.
 */
export function getJobHistory(queue?: QueueName, limit: number = 50): Job[] {
  const queues: QueueName[] = queue ? [queue] : ALL_QUEUE_NAMES;
  const allJobs: Job[] = [];

  for (const q of queues) {
    // Collect from all status buckets
    const seen = new Set<string>();

    const collect = (ids: string[]) => {
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const job = jobsById.get(id);
        if (job) allJobs.push(job);
      }
    };

    collect(queuedJobs[q]);
    collect([...runningJobs[q]]);
    collect(completedJobs[q]);
    collect(failedJobs[q]);

    // Also check retrying jobs (they're in jobsById but not in a bucket)
    for (const [, job] of jobsById) {
      if (job.queue === q && job.status === 'retrying' && !seen.has(job.id)) {
        allJobs.push(job);
        seen.add(job.id);
      }
    }
  }

  // Sort by updatedAt descending
  allJobs.sort((a, b) => b.updatedAt - a.updatedAt);

  return allJobs.slice(0, limit);
}

/**
 * Get overall system load metrics.
 */
export function getSystemLoad(): SystemLoad {
  const queueDetails = getAllQueueStats();

  let totalQueued = 0;
  let totalRunning = 0;
  let totalCompleted = 0;
  let totalFailed = 0;
  let weightedProcessingTime = 0;
  let totalProcessingSamples = 0;

  for (const qs of queueDetails) {
    totalQueued += qs.depth;
    totalRunning += qs.running;
    totalCompleted += qs.completed;
    totalFailed += qs.failed;

    // Weighted average of processing times
    const times = processingTimes[qs.name];
    if (times.length > 0) {
      weightedProcessingTime += times.reduce((a, b) => a + b, 0);
      totalProcessingSamples += times.length;
    }
  }

  const overallAvgProcessingTime = totalProcessingSamples > 0
    ? Math.round(weightedProcessingTime / totalProcessingSamples)
    : 0;

  const overallThroughputPerMin = queueDetails.reduce(
    (sum, qs) => sum + qs.throughputPerMin,
    0
  );

  const totalFinished = totalCompleted + totalFailed;
  const overallFailureRate = totalFinished > 0
    ? Math.round((totalFailed / totalFinished) * 10000) / 100 // percentage with 2 decimal places
    : 0;

  return {
    totalQueued,
    totalRunning,
    totalCompleted,
    totalFailed,
    overallThroughputPerMin,
    overallAvgProcessingTime,
    overallFailureRate,
    queueDetails,
    uptime: now() - systemStartTime,
  };
}

// ---------------------------------------------------------------------------
// Queue Configuration
// ---------------------------------------------------------------------------

/**
 * Override configuration for a specific queue.
 */
export function setQueueConfig(queue: QueueName, config: Partial<QueueConfig>): void {
  queueConfigs[queue] = {
    ...queueConfigs[queue],
    ...config,
  };
}

/**
 * Get the current configuration for a queue.
 */
export function getQueueConfig(queue: QueueName): QueueConfig {
  return { ...queueConfigs[queue] };
}

// ---------------------------------------------------------------------------
// Handler Registry
// ---------------------------------------------------------------------------

/**
 * Register a handler for a job type.
 */
export function registerHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

/**
 * Unregister a handler for a job type.
 */
export function unregisterHandler(type: string): boolean {
  return handlers.delete(type);
}

/**
 * Get all registered handler types.
 */
export function getRegisteredHandlers(): string[] {
  return [...handlers.keys()];
}

// ---------------------------------------------------------------------------
// Job Processor
// ---------------------------------------------------------------------------

/**
 * Process a single job: look up its handler, run it, and handle result/failure.
 */
async function processJob(job: Job): Promise<void> {
  const handler = handlers.get(job.type);

  if (!handler) {
    failJob(job.id, `No handler registered for job type: "${job.type}"`);
    return;
  }

  try {
    const result = await handler(job);
    completeJob(job.id, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failJob(job.id, message);
  }
}

/**
 * One tick of the processor: check each queue and dequeue/process available jobs.
 */
async function processorTick(): Promise<void> {
  for (const queue of ALL_QUEUE_NAMES) {
    // Dequeue up to the concurrency limit
    while (runningJobs[queue].size < queueConfigs[queue].concurrency) {
      const job = dequeue(queue);
      if (!job) break;

      // Fire and forget — errors are caught inside processJob
      processJob(job).catch(() => {
        // Safety net: if processJob itself throws unexpectedly
        if (job.status === 'running' || job.status === 'retrying') {
          failJob(job.id, 'Processor encountered an unexpected error');
        }
      });
    }
  }
}

/**
 * Start the job processor. Checks queues every second.
 * Idempotent — calling multiple times has no additional effect.
 */
export function startProcessor(): void {
  if (processorRunning) return;
  processorRunning = true;

  processorTimer = setInterval(() => {
    processorTick().catch(() => {
      // Silently swallow — individual job errors are handled in processJob
    });
  }, PROCESSOR_INTERVAL_MS);

  // Allow the Node.js process to exit if only this timer is remaining
  if (processorTimer && typeof processorTimer === 'object' && 'unref' in processorTimer) {
    processorTimer.unref();
  }
}

/**
 * Stop the job processor.
 */
export function stopProcessor(): void {
  if (!processorRunning) return;
  processorRunning = false;

  if (processorTimer !== null) {
    clearInterval(processorTimer);
    processorTimer = null;
  }
}

/**
 * Check whether the processor is currently running.
 */
export function isProcessorRunning(): boolean {
  return processorRunning;
}

// ---------------------------------------------------------------------------
// Cleanup / Reset (useful for testing)
// ---------------------------------------------------------------------------

/**
 * Reset all internal state. Primarily for testing.
 * Stops the processor and clears all data structures.
 */
export function resetQueueSystem(): void {
  stopProcessor();

  // Clear retry and TTL timeouts
  for (const timer of retryTimeouts.values()) {
    clearTimeout(timer);
  }
  retryTimeouts.clear();

  for (const timer of ttlTimeouts.values()) {
    clearTimeout(timer);
  }
  ttlTimeouts.clear();

  // Clear all data structures
  jobsById.clear();

  for (const q of ALL_QUEUE_NAMES) {
    queuedJobs[q] = [];
    runningJobs[q] = new Set();
    completedJobs[q] = [];
    failedJobs[q] = [];
    processingTimes[q] = [];
    completionTimestamps[q] = [];
  }

  // Reset configs to defaults
  Object.assign(queueConfigs, DEFAULT_QUEUE_CONFIGS);

  // Clear handlers
  handlers.clear();
}

// ---------------------------------------------------------------------------
// Utility: get counts for a tenant (useful for per-tenant rate limiting)
// ---------------------------------------------------------------------------

/**
 * Count jobs for a specific tenant, optionally filtered by status.
 */
export function countTenantJobs(
  tenantId: string,
  status?: JobStatus
): number {
  let count = 0;
  for (const job of jobsById.values()) {
    if (job.tenantId === tenantId) {
      if (!status || job.status === status) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Get all jobs for a specific tenant, optionally filtered by status.
 */
export function getTenantJobs(
  tenantId: string,
  status?: JobStatus,
  limit: number = 50
): Job[] {
  const result: Job[] = [];
  for (const job of jobsById.values()) {
    if (job.tenantId === tenantId) {
      if (!status || job.status === status) {
        result.push(job);
      }
    }
    if (result.length >= limit) break;
  }

  result.sort((a, b) => b.updatedAt - a.updatedAt);
  return result;
}
