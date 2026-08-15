// ============================================
// TrimedCast API - Tenant Data Export Service
// GDPR Data Portability & Per-Tenant Backup
// Session 16: Scaling + Production Hardening
// Based on Multi-Tenancy & SaaS Architecture.md §10.5-10.6
// ============================================

import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/api/audit';
import { checkFeatureAccess } from '@/lib/api/billing';

// --- Interfaces ---

export interface ExportOptions {
  tenantId: string;
  userId?: string;
  tables?: string[];  // specific tables, or all if omitted
  format?: 'json' | 'csv';  // JSON default, CSV for enterprise
}

export interface ExportResult {
  success: boolean;
  tenantId: string;
  exportedAt: string;  // ISO timestamp
  format: string;
  tables: ExportTableResult[];
  totalRows: number;
  totalSizeBytes: number;
}

export interface ExportTableResult {
  table: string;
  rows: number;
  data: unknown[];  // actual data for JSON, or string[] for CSV
}

// --- Table Registry ---

/** User-facing table name → Prisma delegate property name on `db` */
const TABLE_TO_DELEGATE: Record<string, string> = {
  products:           'product',
  inventory:          'inventory',
  salesHistory:       'salesHistory',
  purchaseHistory:    'purchaseHistory',
  forecasts:          'forecast',
  recommendedOrders:  'recommendedOrder',
  suppliers:          'supplier',
  motorcycleModels:   'motorcycleModel',
  promoEvents:        'promoEvent',
  forecastSettings:   'forecastSetting',
  salesOrders:        'salesOrder',
  purchaseOrders:     'purchaseOrder',
  sopCycles:          'sopCycle',
  dataImports:        'dataImport',
  auditLogs:          'auditLog',
  usageEvents:        'usageEvent',
  invoices:           'invoice',
};

/** Ordered list of all exportable table names (user-facing plural form) */
const ALL_EXPORT_TABLES = Object.keys(TABLE_TO_DELEGATE);

// --- Rate Limiting (in-memory, 1 export per hour per tenant) ---

const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const lastExportAt = new Map<string, number>();

/** Check whether a tenant can currently export (rate limit: 1 per hour) */
export function canExport(tenantId: string): { allowed: boolean; nextAllowedAt: string | null } {
  const last = lastExportAt.get(tenantId);
  if (!last) {
    return { allowed: true, nextAllowedAt: null };
  }
  const elapsed = Date.now() - last;
  if (elapsed >= RATE_LIMIT_MS) {
    return { allowed: true, nextAllowedAt: null };
  }
  const nextAllowedAt = new Date(last + RATE_LIMIT_MS).toISOString();
  return { allowed: false, nextAllowedAt };
}

/** Mark that an export has just occurred for a tenant */
function markExported(tenantId: string): void {
  lastExportAt.set(tenantId, Date.now());
}

// --- Helpers ---

/** Get the ordered list of all exportable table names */
export function getExportTablesList(): string[] {
  return [...ALL_EXPORT_TABLES];
}

/** Resolve user-facing table names to delegate names, filtering to valid ones */
function resolveTableNames(tables?: string[]): string[] {
  if (!tables || tables.length === 0) {
    return ALL_EXPORT_TABLES;
  }
  // Keep only recognized table names, preserve caller ordering
  return tables.filter((t) => t in TABLE_TO_DELEGATE);
}

/** Convert a single row object to a CSV line (RFC 4180 compliant) */
function rowToCsvLine(row: Record<string, unknown>): string {
  const values = Object.values(row).map((v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote if contains comma, double-quote, or newline
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  });
  return values.join(',');
}

/** Convert an array of objects to CSV-formatted string array (header + rows) */
function toCsvLines(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  const headers = Object.keys(data[0]);
  const lines: string[] = [headers.join(',')];
  for (const row of data) {
    lines.push(rowToCsvLine(row));
  }
  return lines;
}

/** Approximate byte size of a value (JSON-serialized) */
function approximateSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf-8');
}

// --- Core Export ---

/**
 * Export all or specified tenant data.
 * - JSON format: returns actual row objects per table
 * - CSV format: returns string[] per table (enterprise only)
 * Rate-limited to 1 export per hour per tenant.
 */
export async function exportTenantData(options: ExportOptions): Promise<ExportResult> {
  const { tenantId, userId, tables: requestedTables, format = 'json' } = options;
  const exportedAt = new Date().toISOString();

  // 1. Rate limit check
  const rateCheck = canExport(tenantId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      tenantId,
      exportedAt,
      format,
      tables: [],
      totalRows: 0,
      totalSizeBytes: 0,
    };
  }

  // 2. CSV format requires enterprise tier
  if (format === 'csv') {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    const tierCheck = checkFeatureAccess(tenant?.plan ?? 'starter', 'per_tenant_backup');
    if (!tierCheck.allowed) {
      // Fall back to JSON for non-enterprise tenants
      return exportTenantData({ ...options, format: 'json' });
    }
  }

  // 3. Resolve which tables to export
  const tableNames = resolveTableNames(requestedTables);

  // 4. Query each table
  const tableResults: ExportTableResult[] = [];
  let totalRows = 0;
  let totalSizeBytes = 0;

  for (const tableName of tableNames) {
    const delegateName = TABLE_TO_DELEGATE[tableName];
    try {
       
      const delegate = (db as any)[delegateName];
      if (!delegate || typeof delegate.findMany !== 'function') {
        tableResults.push({ table: tableName, rows: 0, data: [] });
        continue;
      }

      const rows: Record<string, unknown>[] = await delegate.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });

      let data: unknown[];
      if (format === 'csv') {
        data = toCsvLines(rows);
      } else {
        data = rows;
      }

      const sizeBytes = approximateSize(data);
      totalRows += rows.length;
      totalSizeBytes += sizeBytes;

      tableResults.push({
        table: tableName,
        rows: rows.length,
        data,
      });
    } catch (err) {
      // Per-table error: include empty result but don't abort entire export
      console.error(`[DataExport] Failed to export table "${tableName}" for tenant ${tenantId}:`, err);
      tableResults.push({ table: tableName, rows: 0, data: [] });
    }
  }

  // 5. Mark rate limit
  markExported(tenantId);

  // 6. Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'export',
    entity: 'tenant_data',
    entityId: tenantId,
    metadata: {
      format,
      tables: tableNames,
      totalRows,
      totalSizeBytes,
      exportedAt,
    },
  });

  return {
    success: true,
    tenantId,
    exportedAt,
    format,
    tables: tableResults,
    totalRows,
    totalSizeBytes,
  };
}

// --- Backup Management ---

/**
 * Create a tenant backup record and perform the full data export.
 * The backup record tracks status through pending → in_progress → completed/failed.
 */
export async function createTenantBackup(tenantId: string, userId?: string): Promise<{
  backupId: string;
  result: ExportResult;
}> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `backups/tenant-${tenantId}/${timestamp}`;

  // 1. Create backup record as pending
  const backup = await db.tenantBackup.create({
    data: {
      tenantId,
      path,
      status: 'pending',
    },
  });

  // 2. Move to in_progress
  await db.tenantBackup.update({
    where: { id: backup.id },
    data: {
      status: 'in_progress',
      startedAt: new Date(),
    },
  });

  try {
    // 3. Perform the export (always JSON for backup)
    const result = await exportTenantData({
      tenantId,
      userId,
      format: 'json',
    });

    if (!result.success) {
      // Export was rate-limited
      await db.tenantBackup.update({
        where: { id: backup.id },
        data: {
          status: 'failed',
          error: 'Export rate limited — try again later',
          completedAt: new Date(),
        },
      });
      return { backupId: backup.id, result };
    }

    // 4. Update backup record as completed
    const exportedTableNames = result.tables.map((t) => t.table);
    await db.tenantBackup.update({
      where: { id: backup.id },
      data: {
        status: 'completed',
        sizeBytes: result.totalSizeBytes,
        tables: JSON.stringify(exportedTableNames),
        completedAt: new Date(),
      },
    });

    return { backupId: backup.id, result };
  } catch (err) {
    // 5. Mark as failed
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.tenantBackup.update({
      where: { id: backup.id },
      data: {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      backupId: backup.id,
      result: {
        success: false,
        tenantId,
        exportedAt: new Date().toISOString(),
        format: 'json',
        tables: [],
        totalRows: 0,
        totalSizeBytes: 0,
      },
    };
  }
}

/**
 * List recent backups for a tenant, ordered by most recent first.
 */
export async function getTenantBackups(
  tenantId: string,
  limit: number = 20,
): Promise<{
  id: string;
  path: string;
  sizeBytes: number;
  tables: string | null;
  status: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}[]> {
  const backups = await db.tenantBackup.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      path: true,
      sizeBytes: true,
      tables: true,
      status: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });

  return backups;
}

/**
 * Get the status of a specific backup by ID.
 */
export async function getBackupStatus(backupId: string): Promise<{
  id: string;
  tenantId: string;
  path: string;
  sizeBytes: number;
  tables: string | null;
  status: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
} | null> {
  const backup = await db.tenantBackup.findUnique({
    where: { id: backupId },
    select: {
      id: true,
      tenantId: true,
      path: true,
      sizeBytes: true,
      tables: true,
      status: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });

  return backup;
}
