// ============================================
// TrimedCast API - Security Audit Service
// Tracks security events, cross-tenant access attempts,
// and provides security monitoring for the platform.
// Based on: Multi-Tenancy & SaaS Architecture.md Section 10
// Session 16: Scaling + Production Hardening
// ============================================

import { db } from '@/lib/db';

// ============================================
// Types & Interfaces
// ============================================

export type SecurityEventType =
  | 'cross_tenant_access_attempt'
  | 'admin_impersonation'
  | 'rate_limit_exceeded'
  | 'suspicious_query_pattern'
  | 'permission_escalation_attempt'
  | 'data_export'
  | 'login_failure'
  | 'token_expired';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventInput {
  type: SecurityEventType;
  userId?: string;
  tenantId?: string;
  tokenTenantId?: string;
  targetTenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  requestMethod?: string;
  details?: Record<string, unknown>;
  severity?: SecuritySeverity;
}

export interface CrossTenantStats {
  totalAttempts: number;
  uniqueIps: number;
  byUser: Array<{ userId: string; attempts: number }>;
}

export interface SecuritySummary {
  totalEvents: number;
  unresolvedHighSeverity: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentEvents: Array<{
    id: string;
    type: string;
    severity: string;
    userId: string | null;
    tenantId: string | null;
    ipAddress: string | null;
    url: string | null;
    occurredAt: Date;
    resolved: boolean;
  }>;
}

export interface SecurityEventFilters {
  type?: SecurityEventType;
  severity?: SecuritySeverity;
  resolved?: boolean;
  tenantId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface SecurityEventListResult {
  events: Array<{
    id: string;
    type: string;
    severity: string;
    userId: string | null;
    tenantId: string | null;
    tokenTenantId: string | null;
    targetTenantId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    url: string | null;
    requestMethod: string | null;
    details: string | null;
    resolved: boolean;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    occurredAt: Date;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SuspiciousActivityResult {
  isSuspicious: boolean;
  indicators: Array<{
    type: string;
    description: string;
    severity: SecuritySeverity;
    count: number;
    threshold: number;
  }>;
}

// ============================================
// Severity Defaults per Event Type
// ============================================

const DEFAULT_SEVERITY: Record<SecurityEventType, SecuritySeverity> = {
  cross_tenant_access_attempt: 'critical',
  admin_impersonation: 'high',
  rate_limit_exceeded: 'medium',
  suspicious_query_pattern: 'high',
  permission_escalation_attempt: 'critical',
  data_export: 'low',
  login_failure: 'medium',
  token_expired: 'low',
};

// ============================================
// Suspicious Activity Thresholds
// ============================================

const SUSPICIOUS_ACTIVITY_THRESHOLDS = {
  crossTenantAttempts: 3,        // 3+ cross-tenant attempts in 24h
  crossTenantAttemptsPeriod: 24,  // hours
  loginFailures: 10,             // 10+ login failures in 1h
  loginFailuresPeriod: 1,        // hours
  rateLimitViolations: 5,        // 5+ rate limit violations in 1h
  rateLimitViolationsPeriod: 1,  // hours
  permissionEscalationAttempts: 2, // 2+ permission escalation attempts in 24h
  permissionEscalationPeriod: 24,  // hours
  dataExports: 10,               // 10+ data exports in 24h
  dataExportsPeriod: 24,         // hours
};

// ============================================
// Core Functions
// ============================================

/**
 * Log a security event to the database.
 * Captures full request context including IP, user agent, URL, and method.
 * Severity defaults are assigned per event type if not explicitly provided.
 */
export async function logSecurityEvent(input: SecurityEventInput): Promise<string | null> {
  try {
    const severity = input.severity ?? DEFAULT_SEVERITY[input.type];

    const event = await db.securityEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        tokenTenantId: input.tokenTenantId ?? null,
        targetTenantId: input.targetTenantId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        url: input.url ?? null,
        requestMethod: input.requestMethod ?? null,
        details: input.details ? JSON.stringify(input.details) : null,
        severity,
      },
    });

    return event.id;
  } catch (error) {
    // Security event logging should never block the main operation
    console.error('[SecurityAudit] Failed to log security event:', error);
    return null;
  }
}

/**
 * Get unresolved high/critical severity alerts for the admin dashboard.
 * Returns events ordered by severity (critical first) then by occurrence time (most recent first).
 */
export async function getUnresolvedAlerts(limit: number = 50): Promise<
  Array<{
    id: string;
    type: string;
    severity: string;
    userId: string | null;
    tenantId: string | null;
    tokenTenantId: string | null;
    targetTenantId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    url: string | null;
    requestMethod: string | null;
    details: string | null;
    occurredAt: Date;
    createdAt: Date;
  }>
> {
  const events = await db.securityEvent.findMany({
    where: {
      resolved: false,
      severity: { in: ['high', 'critical'] },
    },
    orderBy: [
      { severity: 'desc' },
      { occurredAt: 'desc' },
    ],
    take: limit,
  });

  return events;
}

/**
 * Get cross-tenant access attempt statistics for the specified time window.
 * Returns total attempts, unique IPs involved, and breakdown by user.
 */
export async function getCrossTenantStats(days: number = 7): Promise<CrossTenantStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Total attempts in the time window
  const totalAttempts = await db.securityEvent.count({
    where: {
      type: 'cross_tenant_access_attempt',
      occurredAt: { gte: since },
    },
  });

  // Unique IPs involved in cross-tenant attempts
  const ipResults = await db.securityEvent.findMany({
    where: {
      type: 'cross_tenant_access_attempt',
      occurredAt: { gte: since },
      ipAddress: { not: null },
    },
    select: { ipAddress: true },
    distinct: ['ipAddress'],
  });
  const uniqueIps = ipResults.length;

  // Breakdown by user
  const userAttempts = await db.securityEvent.groupBy({
    by: ['userId'],
    where: {
      type: 'cross_tenant_access_attempt',
      occurredAt: { gte: since },
      userId: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const byUser = userAttempts
    .filter((row) => row.userId !== null)
    .map((row) => ({
      userId: row.userId!,
      attempts: row._count.id,
    }));

  return { totalAttempts, uniqueIps, byUser };
}

/**
 * Get overall security summary for the admin dashboard.
 * Covers the specified time window and includes event counts
 * by type and severity, plus unresolved high-severity count.
 */
export async function getSecuritySummary(days: number = 7): Promise<SecuritySummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Total events in the time window
  const totalEvents = await db.securityEvent.count({
    where: { occurredAt: { gte: since } },
  });

  // Unresolved high-severity events (all time, not just window)
  const unresolvedHighSeverity = await db.securityEvent.count({
    where: {
      resolved: false,
      severity: { in: ['high', 'critical'] },
    },
  });

  // Count by type
  const typeGroups = await db.securityEvent.groupBy({
    by: ['type'],
    where: { occurredAt: { gte: since } },
    _count: { id: true },
  });
  const byType: Record<string, number> = {};
  for (const group of typeGroups) {
    byType[group.type] = group._count.id;
  }

  // Count by severity
  const severityGroups = await db.securityEvent.groupBy({
    by: ['severity'],
    where: { occurredAt: { gte: since } },
    _count: { id: true },
  });
  const bySeverity: Record<string, number> = {};
  for (const group of severityGroups) {
    bySeverity[group.severity] = group._count.id;
  }

  // Recent events for quick overview
  const recentEvents = await db.securityEvent.findMany({
    where: { occurredAt: { gte: since } },
    select: {
      id: true,
      type: true,
      severity: true,
      userId: true,
      tenantId: true,
      ipAddress: true,
      url: true,
      occurredAt: true,
      resolved: true,
    },
    orderBy: { occurredAt: 'desc' },
    take: 20,
  });

  return {
    totalEvents,
    unresolvedHighSeverity,
    byType,
    bySeverity,
    recentEvents,
  };
}

/**
 * Mark a security event as resolved.
 * Records who resolved it and when.
 */
export async function resolveSecurityEvent(
  eventId: string,
  resolvedBy: string
): Promise<boolean> {
  try {
    const result = await db.securityEvent.update({
      where: { id: eventId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });

    return !!result;
  } catch (error) {
    console.error('[SecurityAudit] Failed to resolve security event:', error);
    return false;
  }
}

/**
 * Get a paginated, filtered list of security events.
 * Supports filtering by type, severity, resolved status, tenant, and date range.
 */
export async function getSecurityEvents(
  filters: SecurityEventFilters = {}
): Promise<SecurityEventListResult> {
  const {
    type,
    severity,
    resolved,
    tenantId,
    fromDate,
    toDate,
    page = 1,
    pageSize = 25,
  } = filters;

  // Build the where clause
  const where: Record<string, unknown> = {};

  if (type) {
    where.type = type;
  }

  if (severity) {
    where.severity = severity;
  }

  if (resolved !== undefined) {
    where.resolved = resolved;
  }

  if (tenantId) {
    where.tenantId = tenantId;
  }

  // Date range filter
  const occurredAt: Record<string, Date> = {};
  if (fromDate) {
    occurredAt.gte = fromDate;
  }
  if (toDate) {
    occurredAt.lte = toDate;
  }
  if (Object.keys(occurredAt).length > 0) {
    where.occurredAt = occurredAt;
  }

  // Get total count for pagination
  const total = await db.securityEvent.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  // Get paginated results
  const events = await db.securityEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    events,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Get rate limit violations for a specific tenant within the given time window.
 * Returns the violation events ordered by most recent first.
 */
export async function getRateLimitViolations(
  tenantId: string,
  hours: number = 1
): Promise<
  Array<{
    id: string;
    userId: string | null;
    ipAddress: string | null;
    url: string | null;
    requestMethod: string | null;
    details: string | null;
    occurredAt: Date;
  }>
> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const violations = await db.securityEvent.findMany({
    where: {
      type: 'rate_limit_exceeded',
      tenantId,
      occurredAt: { gte: since },
    },
    select: {
      id: true,
      userId: true,
      ipAddress: true,
      url: true,
      requestMethod: true,
      details: true,
      occurredAt: true,
    },
    orderBy: { occurredAt: 'desc' },
  });

  return violations;
}

/**
 * Detect suspicious activity for a tenant by checking multiple indicators.
 * Examines patterns over the last 24 hours including:
 * - Multiple cross-tenant access attempts
 * - Excessive login failures
 * - Repeated rate limit violations
 * - Permission escalation attempts
 * - Unusually high data exports
 *
 * Returns whether the tenant is flagged as suspicious and a list of indicators
 * that exceeded their thresholds.
 */
export async function detectSuspiciousActivity(
  tenantId: string
): Promise<SuspiciousActivityResult> {
  const now = new Date();
  const indicators: SuspiciousActivityResult['indicators'] = [];

  // --- Cross-tenant access attempts ---
  const crossTenantSince = new Date(now);
  crossTenantSince.setHours(
    crossTenantSince.getHours() - SUSPICIOUS_ACTIVITY_THRESHOLDS.crossTenantAttemptsPeriod
  );
  const crossTenantCount = await db.securityEvent.count({
    where: {
      type: 'cross_tenant_access_attempt',
      tenantId,
      occurredAt: { gte: crossTenantSince },
    },
  });
  if (crossTenantCount >= SUSPICIOUS_ACTIVITY_THRESHOLDS.crossTenantAttempts) {
    indicators.push({
      type: 'cross_tenant_access_attempt',
      description: `${crossTenantCount} cross-tenant access attempts in the last ${SUSPICIOUS_ACTIVITY_THRESHOLDS.crossTenantAttemptsPeriod}h`,
      severity: 'critical',
      count: crossTenantCount,
      threshold: SUSPICIOUS_ACTIVITY_THRESHOLDS.crossTenantAttempts,
    });
  }

  // --- Excessive login failures ---
  const loginSince = new Date(now);
  loginSince.setHours(
    loginSince.getHours() - SUSPICIOUS_ACTIVITY_THRESHOLDS.loginFailuresPeriod
  );
  const loginFailureCount = await db.securityEvent.count({
    where: {
      type: 'login_failure',
      tenantId,
      occurredAt: { gte: loginSince },
    },
  });
  if (loginFailureCount >= SUSPICIOUS_ACTIVITY_THRESHOLDS.loginFailures) {
    indicators.push({
      type: 'login_failure',
      description: `${loginFailureCount} login failures in the last ${SUSPICIOUS_ACTIVITY_THRESHOLDS.loginFailuresPeriod}h`,
      severity: 'high',
      count: loginFailureCount,
      threshold: SUSPICIOUS_ACTIVITY_THRESHOLDS.loginFailures,
    });
  }

  // --- Rate limit violations ---
  const rateLimitSince = new Date(now);
  rateLimitSince.setHours(
    rateLimitSince.getHours() - SUSPICIOUS_ACTIVITY_THRESHOLDS.rateLimitViolationsPeriod
  );
  const rateLimitCount = await db.securityEvent.count({
    where: {
      type: 'rate_limit_exceeded',
      tenantId,
      occurredAt: { gte: rateLimitSince },
    },
  });
  if (rateLimitCount >= SUSPICIOUS_ACTIVITY_THRESHOLDS.rateLimitViolations) {
    indicators.push({
      type: 'rate_limit_exceeded',
      description: `${rateLimitCount} rate limit violations in the last ${SUSPICIOUS_ACTIVITY_THRESHOLDS.rateLimitViolationsPeriod}h`,
      severity: 'medium',
      count: rateLimitCount,
      threshold: SUSPICIOUS_ACTIVITY_THRESHOLDS.rateLimitViolations,
    });
  }

  // --- Permission escalation attempts ---
  const permEscalationSince = new Date(now);
  permEscalationSince.setHours(
    permEscalationSince.getHours() - SUSPICIOUS_ACTIVITY_THRESHOLDS.permissionEscalationPeriod
  );
  const permEscalationCount = await db.securityEvent.count({
    where: {
      type: 'permission_escalation_attempt',
      tenantId,
      occurredAt: { gte: permEscalationSince },
    },
  });
  if (permEscalationCount >= SUSPICIOUS_ACTIVITY_THRESHOLDS.permissionEscalationAttempts) {
    indicators.push({
      type: 'permission_escalation_attempt',
      description: `${permEscalationCount} permission escalation attempts in the last ${SUSPICIOUS_ACTIVITY_THRESHOLDS.permissionEscalationPeriod}h`,
      severity: 'critical',
      count: permEscalationCount,
      threshold: SUSPICIOUS_ACTIVITY_THRESHOLDS.permissionEscalationAttempts,
    });
  }

  // --- Unusually high data exports ---
  const dataExportSince = new Date(now);
  dataExportSince.setHours(
    dataExportSince.getHours() - SUSPICIOUS_ACTIVITY_THRESHOLDS.dataExportsPeriod
  );
  const dataExportCount = await db.securityEvent.count({
    where: {
      type: 'data_export',
      tenantId,
      occurredAt: { gte: dataExportSince },
    },
  });
  if (dataExportCount >= SUSPICIOUS_ACTIVITY_THRESHOLDS.dataExports) {
    indicators.push({
      type: 'data_export',
      description: `${dataExportCount} data exports in the last ${SUSPICIOUS_ACTIVITY_THRESHOLDS.dataExportsPeriod}h`,
      severity: 'high',
      count: dataExportCount,
      threshold: SUSPICIOUS_ACTIVITY_THRESHOLDS.dataExports,
    });
  }

  return {
    isSuspicious: indicators.length > 0,
    indicators,
  };
}

// ============================================
// Utility Helpers
// ============================================

/**
 * Get security event counts grouped by type for a given time range.
 * Useful for charting and trend analysis in the admin dashboard.
 */
export async function getSecurityEventCountsByType(
  fromDate: Date,
  toDate: Date = new Date()
): Promise<Record<string, number>> {
  const groups = await db.securityEvent.groupBy({
    by: ['type'],
    where: {
      occurredAt: { gte: fromDate, lte: toDate },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const result: Record<string, number> = {};
  for (const group of groups) {
    result[group.type] = group._count.id;
  }

  return result;
}

/**
 * Log a cross-tenant access attempt with a convenient shorthand.
 * Automatically sets the type and severity.
 */
export async function logCrossTenantAttempt(input: {
  userId?: string;
  tenantId?: string;
  tokenTenantId?: string;
  targetTenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  requestMethod?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  return logSecurityEvent({
    type: 'cross_tenant_access_attempt',
    severity: 'critical',
    ...input,
  });
}

/**
 * Log a login failure event with a convenient shorthand.
 * Automatically sets the type and severity.
 */
export async function logLoginFailure(input: {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  return logSecurityEvent({
    type: 'login_failure',
    severity: 'medium',
    ...input,
  });
}

/**
 * Log a rate limit exceeded event with a convenient shorthand.
 * Automatically sets the type and severity.
 */
export async function logRateLimitExceeded(input: {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  requestMethod?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  return logSecurityEvent({
    type: 'rate_limit_exceeded',
    severity: 'medium',
    ...input,
  });
}

/**
 * Log an admin impersonation event with a convenient shorthand.
 * Automatically sets the type and severity.
 */
export async function logAdminImpersonation(input: {
  userId?: string;
  tenantId?: string;
  tokenTenantId?: string;
  targetTenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  return logSecurityEvent({
    type: 'admin_impersonation',
    severity: 'high',
    ...input,
  });
}

/**
 * Bulk-resolve all security events matching the given criteria.
 * Returns the number of events resolved.
 */
export async function bulkResolveSecurityEvents(
  criteria: {
    type?: SecurityEventType;
    severity?: SecuritySeverity;
    tenantId?: string;
    fromDate?: Date;
    toDate?: Date;
  },
  resolvedBy: string
): Promise<number> {
  const where: Record<string, unknown> = {
    resolved: false,
  };

  if (criteria.type) {
    where.type = criteria.type;
  }
  if (criteria.severity) {
    where.severity = criteria.severity;
  }
  if (criteria.tenantId) {
    where.tenantId = criteria.tenantId;
  }

  const occurredAt: Record<string, Date> = {};
  if (criteria.fromDate) {
    occurredAt.gte = criteria.fromDate;
  }
  if (criteria.toDate) {
    occurredAt.lte = criteria.toDate;
  }
  if (Object.keys(occurredAt).length > 0) {
    where.occurredAt = occurredAt;
  }

  const result = await db.securityEvent.updateMany({
    where,
    data: {
      resolved: true,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get the count of unresolved security events, optionally filtered by severity.
 * Used for badge counts and notification indicators.
 */
export async function getUnresolvedCount(
  severity?: SecuritySeverity | SecuritySeverity[]
): Promise<number> {
  const where: Record<string, unknown> = { resolved: false };

  if (severity) {
    if (Array.isArray(severity)) {
      where.severity = { in: severity };
    } else {
      where.severity = severity;
    }
  }

  return db.securityEvent.count({ where });
}
