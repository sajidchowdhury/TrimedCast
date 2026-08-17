// ============================================
// TrimedCast API - Run Batch Insert
// POST: Execute batch database insertion
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batchInsert } from '@/lib/etl/batch-inserter';
import { calculateQualityScore } from '@/lib/etl/quality-score';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type ColumnMapping, type QualityStats } from '@/lib/etl/import-types';
export const runtime = 'nodejs';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataImport = await db.dataImport.findUnique({ where: { id } });

    if (!dataImport) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    const rows: Record<string, unknown>[] = dataImport.mappedPreview
      ? JSON.parse(dataImport.mappedPreview)
      : [];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No data rows found' }, { status: 400 });
    }

    const mappings: ColumnMapping[] = dataImport.columnMapping
      ? JSON.parse(dataImport.columnMapping)
      : [];

    const schema = IMPORT_TYPE_SCHEMAS[dataImport.importType as ImportType];
    if (!schema) {
      return NextResponse.json({ success: false, error: 'Invalid import type' }, { status: 400 });
    }

    // Update status
    await db.dataImport.update({
      where: { id },
      data: { status: 'inserting' },
    });

    // Run batch insert
    const result = await batchInsert(rows, dataImport.importType as ImportType, dataImport.tenantId);

    // Calculate quality score
    const requiredFields = schema.requiredFields;
    const mappedFields = mappings.filter(m => m.targetField && m.confidence > 0);
    const qualityStats: QualityStats = {
      rowsTotal: dataImport.rowsTotal,
      rowsValid: dataImport.rowsValid || rows.length,
      rowsInserted: result.inserted,
      rowsDuplicate: dataImport.rowsDuplicate || 0,
      requiredMapped: mappedFields.filter(m => requiredFields.some(rf => rf.field === m.targetField)).length,
      requiredTotal: requiredFields.length,
    };
    const qualityScore = calculateQualityScore(qualityStats);

    // Update import record with final results
    const completedAt = new Date();
    const durationMs = dataImport.startedAt
      ? completedAt.getTime() - new Date(dataImport.startedAt).getTime()
      : null;

    await db.dataImport.update({
      where: { id },
      data: {
        rowsInserted: result.inserted,
        rowsSkipped: result.skipped,
        qualityScore,
        status: 'completed',
        completedAt,
        durationMs,
        errorDetails: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 100)) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        inserted: result.inserted,
        skipped: result.skipped,
        qualityScore,
        createdMasterData: result.createdMasterData,
        errors: result.errors.slice(0, 50),
        durationMs,
      },
    });
  } catch (error) {
    await db.dataImport.update({
      where: { id: (await params).id },
      data: { status: 'failed' },
    }).catch(() => {});
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
