// ============================================
// TrimedCast API - Security Event Logger
// Logs RBAC violations, access patterns, and suspicious activity
// Works with the existing SecurityEvent Prisma model
// ============================================

import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/api/audit';

// --- Security Event Types ---
export const SECURITY_EVENT_TYPES = {
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_ESCALATION_ATTEMPT: 'PERMISSION_ESCALATION_ATTEMPT',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ROLE_CHANGE: 'ROLE_CHANGE',
  SESSION_HIJACK_SUSPECT: 'SESSION_HIJACK_SUSPECT',
} as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];

// --- Severity Levels ---
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

// --- Input Interface ---

export interface SecurityEventInput {
  tenantId: string;
  userId?: string;
  eventType: string;
  severity: SecurityEventSeverity;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// --- Result Interfaces ---

export interface SuspiciousActivityCheck {
  isSuspicious: boolean;
  denyCount: number;
}

export interface SecurityEventQueryOptions {
  limit?: number;
  offset?: number;
  severity?: SecurityEventSeverity;
  eventType?: string;
  since?: Date;
}

// ============================================
// logSecurityEvent()
// Creates a security event in DB + audit log entry
// ============================================

export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    // 1. Create the SecurityEvent record
    await db.securityEvent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.eventType,
        severity: input.severity,
        details: JSON.stringify(input.details),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    // 2. Also create an audit log entry for the security event
    await createAuditLog({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'status_change',
      entity: 'security_event',
      metadata: {
        eventType: input.eventType,
        severity: input.severity,
        details: input.details,
      },
      ipAddress: input.ipAddress,
    });
  } catch (error) {
    // Security event logging should never block the main operation
    console.error('[SecurityEvent] Failed to log security event:', error);
  }
}

// ============================================
// checkSuspiciousActivity()
// Checks for multiple denied attempts in the last 15 minutes
// If >5 denied attempts, creates a SUSPICIOUS_ACTIVITY event
// ============================================

const SUSPICIOUS_ACTIVITY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const SUSPICIOUS_ACTIVITY_THRESHOLD = 5;

export async function checkSuspiciousActivity(
  tenantId: string,
  userId: string
): Promise<SuspiciousActivityCheck> {
  try {
    const windowStart = new Date(Date.now() - SUSPICIOUS_ACTIVITY_WINDOW_MS);

    // Count ACCESS_DENIED events for this user in the time window
    const deniedEvents = await db.securityEvent.findMany({
      where: {
        tenantId,
        userId,
        type: {
          in: [SECURITY_EVENT_TYPES.ACCESS_DENIED, 'ACCESS_DENIED'],
        },
        occurredAt: {
          gte: windowStart,
        },
      },
      select: { id: true },
    });

    const denyCount = deniedEvents.length;
    const isSuspicious = denyCount > SUSPICIOUS_ACTIVITY_THRESHOLD;

    // If suspicious, create a SUSPICIOUS_ACTIVITY event
    if (isSuspicious) {
      await logSecurityEvent({
        tenantId,
        userId,
        eventType: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        severity: 'high',
        details: {
          denyCount,
          windowMinutes: 15,
          threshold: SUSPICIOUS_ACTIVITY_THRESHOLD,
          message: `User has ${denyCount} access denied events in the last 15 minutes (threshold: ${SUSPICIOUS_ACTIVITY_THRESHOLD})`,
        },
      });
    }

    return { isSuspicious, denyCount };
  } catch (error) {
    console.error('[SecurityEvent] Failed to check suspicious activity:', error);
    return { isSuspicious: false, denyCount: 0 };
  }
}

// ============================================
// getSecurityEventsForTenant()
// Retrieves security events with filtering and pagination
// ============================================

export async function getSecurityEventsForTenant(
  tenantId: string,
  options: SecurityEventQueryOptions = {}
) {
  const {
    limit = 50,
    offset = 0,
    severity,
    eventType,
    since,
  } = options;

  try {
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (severity) {
      where.severity = severity;
    }

    if (eventType) {
      where.type = eventType;
    }

    if (since) {
      where.occurredAt = { gte: since };
    }

    const [events, total] = await Promise.all([
      db.securityEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.securityEvent.count({ where }),
    ]);

    return { events, total };
  } catch (error) {
    console.error('[SecurityEvent] Failed to get security events:', error);
    return { events: [], total: 0 };
  }
}

// ============================================
// resolveSecurityEvent()
// Mark a security event as resolved
// ============================================

export async function resolveSecurityEvent(
  eventId: string,
  resolvedBy: string
): Promise<boolean> {
  try {
    await db.securityEvent.update({
      where: { id: eventId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error('[SecurityEvent] Failed to resolve security event:', error);
    return false;
  }
}

// ============================================
// getSecurityEventStats()
// Aggregate stats for a tenant's security dashboard
// ============================================

export async function getSecurityEventStats(tenantId: string) {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUnresolved, last24hCount, last7dCount, bySeverity, byType] =
      await Promise.all([
        // Unresolved events
        db.securityEvent.count({
          where: { tenantId, resolved: false },
        }),

        // Events in last 24 hours
        db.securityEvent.count({
          where: { tenantId, occurredAt: { gte: last24h } },
        }),

        // Events in last 7 days
        db.securityEvent.count({
          where: { tenantId, occurredAt: { gte: last7d } },
        }),

        // Count by severity
        db.securityEvent.groupBy({
          by: ['severity'],
          where: { tenantId },
          _count: { severity: true },
        }),

        // Count by type (top 10)
        db.securityEvent.groupBy({
          by: ['type'],
          where: { tenantId, occurredAt: { gte: last7d } },
          _count: { type: true },
          orderBy: { _count: { type: 'desc' } },
          take: 10,
        }),
      ]);

    return {
      totalUnresolved,
      last24hCount,
      last7dCount,
      bySeverity: bySeverity.map((s) => ({
        severity: s.severity,
        count: s._count.severity,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count.type,
      })),
    };
  } catch (error) {
    console.error('[SecurityEvent] Failed to get security event stats:', error);
    return {
      totalUnresolved: 0,
      last24hCount: 0,
      last7dCount: 0,
      bySeverity: [],
      byType: [],
    };
  }
}
