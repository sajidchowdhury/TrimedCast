// ============================================
// TrimedCast API - Imports List & Upload
// GET: List imports for a tenant
// POST: Upload a new Excel file
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseExcelFile, isValidFileType, getMaxFileSize, formatFileSize } from '@/lib/etl/excel-parser';
import { autoMapColumns } from '@/lib/etl/column-mapper';
import { IMPORT_TYPE_SCHEMAS, type ImportType } from '@/lib/etl/import-types';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default';
    const importType = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { tenantId };
    if (importType) where.importType = importType;
    if (status) where.status = status;

    const [imports, total] = await Promise.all([
      db.dataImport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.dataImport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: imports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('importType') as string;
    const tenantId = formData.get('tenantId') as string || 'default';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!importType || !IMPORT_TYPE_SCHEMAS[importType as ImportType]) {
      return NextResponse.json(
        { success: false, error: `Invalid import type: ${importType}. Valid types: ${Object.keys(IMPORT_TYPE_SCHEMAS).join(', ')}` },
        { status: 400 }
      );
    }

    if (!isValidFileType(file.name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Supported: .xlsx, .xls, .csv' },
        { status: 400 }
      );
    }

    if (file.size > getMaxFileSize()) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size: ${formatFileSize(getMaxFileSize())}` },
        { status: 400 }
      );
    }

    // Parse the Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseExcelFile(buffer, file.name);

    // Auto-map columns
    const mappings = autoMapColumns(parsed.headers, importType as ImportType);

    // Create import record
    const dataImport = await db.dataImport.create({
      data: {
        tenantId,
        importType,
        fileName: file.name,
        fileSize: file.size,
        rowsTotal: parsed.totalRows,
        status: 'mapping',
        columnMapping: JSON.stringify(mappings),
        rawPreview: JSON.stringify(parsed.preview),
        startedAt: new Date(),
      },
    });

    // Store parsed data in a temporary way - encode rows as JSON in mappedPreview
    // (In production, use Redis or a temp file. For this demo, we store in the record)
    await db.dataImport.update({
      where: { id: dataImport.id },
      data: {
        mappedPreview: JSON.stringify(parsed.rows.slice(0, 20)),
        status: 'mapping',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: dataImport.id,
        importType,
        fileName: file.name,
        fileSize: file.size,
        rowsTotal: parsed.totalRows,
        status: 'mapping',
        headers: parsed.headers,
        preview: parsed.preview,
        mappings,
        detectedFormat: parsed.detectedFormat,
        sheetName: parsed.sheetName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
