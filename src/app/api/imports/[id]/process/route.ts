// ============================================
// TrimedCast API - Run Full Pipeline
// POST: Execute complete ETL pipeline
// (map → validate → harmonize → insert)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { autoMapColumns, validateMapping, applyMapping } from '@/lib/etl/column-mapper';
import { runAllValidations } from '@/lib/etl/validator';
import { runHarmonization } from '@/lib/etl/harmonizer';
import { batchInsert } from '@/lib/etl/batch-inserter';
import { calculateQualityScore } from '@/lib/etl/quality-score';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type ColumnMapping, type QualityStats } from '@/lib/etl/import-types';

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

    const schema = IMPORT_TYPE_SCHEMAS[dataImport.importType as ImportType];
    if (!schema) {
      return NextResponse.json({ success: false, error: 'Invalid import type' }, { status: 400 });
    }

    // Get rows
    let rows: Record<string, unknown>[] = dataImport.mappedPreview
      ? JSON.parse(dataImport.mappedPreview)
      : [];

    let mappings: ColumnMapping[] = dataImport.columnMapping
      ? JSON.parse(dataImport.columnMapping)
      : [];

    // Step 1: Mapping
    await db.dataImport.update({ where: { id }, data: { status: 'mapping' } });
    if (mappings.length === 0) {
      const headers = Object.keys(rows[0] || {});
      mappings = autoMapColumns(headers, dataImport.importType as ImportType);
    }

    // Step 2: Validation
    await db.dataImport.update({ where: { id }, data: { status: 'validating' } });
    const validationResult = runAllValidations(rows, mappings, schema);

    await db.dataImport.update({
      where: { id },
      data: {
        rowsValid: validationResult.stats.valid,
        rowsInvalid: validationResult.stats.invalid,
        validationErrors: JSON.stringify(validationResult.errors.slice(0, 500)),
        columnMapping: JSON.stringify(mappings),
      },
    });

    // Step 3: Harmonization
    await db.dataImport.update({ where: { id }, data: { status: 'harmonizing' } });
    const harmonizationResult = runHarmonization(rows, mappings, schema);

    await db.dataImport.update({
      where: { id },
      data: {
        harmonizationLog: JSON.stringify(harmonizationResult.log),
        rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
        rowsSkipped: harmonizationResult.stats.duplicatesRemoved,
      },
    });

    rows = harmonizationResult.harmonizedRows;

    // Step 4: Insert
    await db.dataImport.update({ where: { id }, data: { status: 'inserting' } });
    const insertResult = await batchInsert(rows, dataImport.importType as ImportType, dataImport.tenantId);

    // Calculate quality score
    const qualityStats: QualityStats = {
      rowsTotal: dataImport.rowsTotal,
      rowsValid: validationResult.stats.valid,
      rowsInserted: insertResult.inserted,
      rowsDuplicate: harmonizationResult.stats.duplicatesRemoved,
      requiredMapped: mappings.filter(m => m.targetField && m.confidence > 0 && schema.requiredFields.some(rf => rf.field === m.targetField)).length,
      requiredTotal: schema.requiredFields.length,
    };
    const qualityScore = calculateQualityScore(qualityStats);

    // Final update
    const completedAt = new Date();
    const durationMs = dataImport.startedAt
      ? completedAt.getTime() - new Date(dataImport.startedAt).getTime()
      : null;

    await db.dataImport.update({
      where: { id },
      data: {
        rowsInserted: insertResult.inserted,
        rowsSkipped: insertResult.skipped + harmonizationResult.stats.duplicatesRemoved,
        qualityScore,
        status: 'completed',
        completedAt,
        durationMs,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        qualityScore,
        validation: {
          valid: validationResult.valid,
          stats: validationResult.stats,
        },
        harmonization: {
          stats: harmonizationResult.stats,
          log: harmonizationResult.log,
        },
        insertion: {
          inserted: insertResult.inserted,
          skipped: insertResult.skipped,
          createdMasterData: insertResult.createdMasterData,
        },
        durationMs,
      },
    });
  } catch (error) {
    try {
      const { id: errId } = await params;
      await db.dataImport.update({
        where: { id: errId },
        data: { status: 'failed' },
      });
    } catch {}
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
