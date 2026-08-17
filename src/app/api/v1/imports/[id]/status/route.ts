// ============================================
// GET /api/v1/imports/[id]/status
// Get current import status with all metrics
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext, canDo, tenantScope } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (!canDo(context, 'imports.crud')) {
      return forbiddenError();
    }

    // Get the import record
    const dataImport = await db.dataImport.findFirst({
      where: { id, ...tenantScope(context.tenantId) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!dataImport) {
      return notFoundError('Data import');
    }

    // Parse JSON fields safely
    let columnMapping: Record<string, string> | null = null;
    if (dataImport.columnMapping) {
      try {
        columnMapping = JSON.parse(dataImport.columnMapping);
      } catch {
        columnMapping = null;
      }
    }

    let validationErrors: unknown[] | null = null;
    if (dataImport.validationErrors) {
      try {
        validationErrors = JSON.parse(dataImport.validationErrors);
      } catch {
        validationErrors = null;
      }
    }

    let harmonizationLog: unknown[] | null = null;
    if (dataImport.harmonizationLog) {
      try {
        harmonizationLog = JSON.parse(dataImport.harmonizationLog);
      } catch {
        harmonizationLog = null;
      }
    }

    let rawPreview: unknown[] | null = null;
    if (dataImport.rawPreview) {
      try {
        rawPreview = JSON.parse(dataImport.rawPreview);
      } catch {
        rawPreview = null;
      }
    }

    let mappedPreview: unknown[] | null = null;
    if (dataImport.mappedPreview) {
      try {
        mappedPreview = JSON.parse(dataImport.mappedPreview);
      } catch {
        mappedPreview = null;
      }
    }

    let errorDetails: unknown = null;
    if (dataImport.errorDetails) {
      try {
        errorDetails = JSON.parse(dataImport.errorDetails);
      } catch {
        errorDetails = null;
      }
    }

    // Calculate progress percentage based on status
    const progressMap: Record<string, number> = {
      uploading: 0,
      parsing: 10,
      mapping: 20,
      validating: 40,
      harmonizing: 60,
      inserting: 80,
      completed: 100,
      failed: -1,
      cancelled: -1,
    };
    const progress = progressMap[dataImport.status] ?? 0;

    // Calculate duration
    const durationMs = dataImport.durationMs ?? (
      dataImport.startedAt
        ? (dataImport.completedAt
          ? dataImport.completedAt.getTime() - dataImport.startedAt.getTime()
          : Date.now() - dataImport.startedAt.getTime())
        : null
    );

    // Build response
    const response: Record<string, unknown> = {
      import_id: dataImport.id,
      import_type: dataImport.importType,
      file_name: dataImport.fileName,
      file_size: dataImport.fileSize,
      status: dataImport.status,
      progress,
      rows: {
        total: dataImport.rowsTotal,
        valid: dataImport.rowsValid,
        invalid: dataImport.rowsInvalid,
        skipped: dataImport.rowsSkipped,
        inserted: dataImport.rowsInserted,
        duplicate: dataImport.rowsDuplicate,
        processed: dataImport.rowsValid + dataImport.rowsInvalid,
        succeeded: dataImport.rowsInserted,
        failed: dataImport.rowsInvalid,
      },
      quality_score: dataImport.qualityScore,
      column_mapping: columnMapping,
      harmonization_rules_applied: harmonizationLog,
      errors: validationErrors,
      error_details: errorDetails,
      raw_preview: rawPreview,
      mapped_preview: mappedPreview,
      timing: {
        started_at: dataImport.startedAt,
        completed_at: dataImport.completedAt,
        duration_ms: durationMs,
      },
      created_by: dataImport.creator
        ? { id: dataImport.creator.id, name: dataImport.creator.name, email: dataImport.creator.email }
        : null,
      created_at: dataImport.createdAt,
      updated_at: dataImport.updatedAt,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('[Imports/[id]/status/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get import status' }, 500);
  }
}
