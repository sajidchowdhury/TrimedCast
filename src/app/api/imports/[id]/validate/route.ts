// ============================================
// TrimedCast API - Run Validation
// POST: Execute 3-phase validation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runAllValidations } from '@/lib/etl/validator';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type ColumnMapping } from '@/lib/etl/import-types';

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

    // Get rows and mappings
    const rows: Record<string, unknown>[] = dataImport.mappedPreview
      ? JSON.parse(dataImport.mappedPreview)
      : [];
    const mappings: ColumnMapping[] = dataImport.columnMapping
      ? JSON.parse(dataImport.columnMapping)
      : [];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No data rows found' }, { status: 400 });
    }

    const schema = IMPORT_TYPE_SCHEMAS[dataImport.importType as ImportType];
    if (!schema) {
      return NextResponse.json({ success: false, error: 'Invalid import type' }, { status: 400 });
    }

    // Update status
    await db.dataImport.update({
      where: { id },
      data: { status: 'validating' },
    });

    // Run all 3 validation phases
    const result = runAllValidations(rows, mappings, schema);

    // Store results
    await db.dataImport.update({
      where: { id },
      data: {
        rowsValid: result.stats.valid,
        rowsInvalid: result.stats.invalid,
        validationErrors: JSON.stringify(result.errors.slice(0, 500)), // Limit stored errors
        status: result.valid ? 'harmonizing' : 'validating',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        valid: result.valid,
        stats: result.stats,
        errors: result.errors.slice(0, 100), // Return first 100 for display
        errorSummary: {
          bySeverity: {
            error: result.errors.filter(e => e.severity === 'error').length,
            warning: result.errors.filter(e => e.severity === 'warning').length,
            info: result.errors.filter(e => e.severity === 'info').length,
          },
          byField: Object.entries(
            result.errors.reduce<Record<string, number>>((acc, e) => {
              acc[e.field] = (acc[e.field] || 0) + 1;
              return acc;
            }, {})
          ).sort(([, a], [, b]) => b - a).slice(0, 10),
        },
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
