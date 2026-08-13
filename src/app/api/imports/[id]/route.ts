// ============================================
// TrimedCast API - Single Import Operations
// GET: Get import details
// DELETE: Cancel/delete import
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataImport = await db.dataImport.findUnique({
      where: { id },
    });

    if (!dataImport) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: dataImport,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataImport = await db.dataImport.findUnique({
      where: { id },
    });

    if (!dataImport) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }

    if (dataImport.status === 'inserting') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel an import that is currently inserting data' },
        { status: 400 }
      );
    }

    await db.dataImport.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, message: 'Import cancelled' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
