// ============================================
// TrimedCast API - Import Types Schema
// GET: Returns all import type definitions
// ============================================

import { NextResponse } from 'next/server';
import { getImportTypesList, IMPORT_TYPE_SCHEMAS } from '@/lib/etl/import-types';

export async function GET() {
  try {
    const types = getImportTypesList();
    return NextResponse.json({
      success: true,
      data: types,
      schemas: IMPORT_TYPE_SCHEMAS,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
