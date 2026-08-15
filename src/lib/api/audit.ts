// ============================================
// TrimedCast API - Audit Logger
// Creates audit trail entries for all mutations
// ============================================

import { db } from '@/lib/db';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export' | 'approve' | 'reject' | 'fulfill' | 'status_change';
  entity: string;
  entityId?: string;
  changes?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    // Audit log failure should never block the main operation
    console.error('[AuditLog] Failed to create audit entry:', error);
  }
}
