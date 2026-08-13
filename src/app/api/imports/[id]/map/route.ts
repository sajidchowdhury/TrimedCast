// ============================================
// TrimedCast API - Column Mapping
// GET: Get current mapping for an import
// POST: Save manual mapping adjustments
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { autoMapColumns, validateMapping } from '@/lib/etl/column-mapper';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type ColumnMapping } from '@/lib/etl/import-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataImport = await db.dataImport.findUnique({ where: { id } });

    if (!dataImport) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    const mappings: ColumnMapping[] = dataImport.columnMapping
      ? JSON.parse(dataImport.columnMapping)
      : [];

    const schema = IMPORT_TYPE_SCHEMAS[dataImport.importType as ImportType];
    const validation = schema ? validateMapping(mappings, schema) : { isValid: false, missingRequired: [], warnings: [] };

    return NextResponse.json({
      success: true,
      data: {
        mappings,
        validation,
        schema: schema ? {
          type: schema.type,
          label: schema.label,
          requiredFields: schema.requiredFields,
          optionalFields: schema.optionalFields,
        } : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { mappings } = body as { mappings: ColumnMapping[] };

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ success: false, error: 'Mappings array required' }, { status: 400 });
    }

    const dataImport = await db.dataImport.findUnique({ where: { id } });
    if (!dataImport) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    // Validate the mapping
    const schema = IMPORT_TYPE_SCHEMAS[dataImport.importType as ImportType];
    const validation = schema ? validateMapping(mappings, schema) : { isValid: false, missingRequired: [], warnings: [] };

    // Save the mapping
    await db.dataImport.update({
      where: { id },
      data: {
        columnMapping: JSON.stringify(mappings),
        status: validation.isValid ? 'validating' : 'mapping',
      },
    });

    return NextResponse.json({
      success: true,
      data: { mappings, validation },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
