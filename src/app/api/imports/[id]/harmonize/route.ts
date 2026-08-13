// ============================================
// TrimedCast API - Run Harmonization
// POST: Execute 6-step harmonization
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runHarmonization } from '@/lib/etl/harmonizer';
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
      data: { status: 'harmonizing' },
    });

    // Run all 6 harmonization steps
    const result = runHarmonization(rows, mappings, schema);

    // Store harmonized data and log
    await db.dataImport.update({
      where: { id },
      data: {
        harmonizationLog: JSON.stringify(result.log),
        rowsDuplicate: result.stats.duplicatesRemoved,
        rowsSkipped: result.stats.duplicatesRemoved,
        mappedPreview: JSON.stringify(result.harmonizedRows.slice(0, 20)),
        status: 'inserting',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: result.stats,
        log: result.log,
        preview: result.harmonizedRows.slice(0, 5),
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
