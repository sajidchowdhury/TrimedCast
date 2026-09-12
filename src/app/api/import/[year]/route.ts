// ============================================
// TrimedCast LEAN — /api/import/[year]
// DELETE: remove all sales data + import records for a specific year.
// Used by the "Manage Uploads" view to delete a year's data.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  try {
    const { year: yearStr } = await params;
    const year = Number(yearStr);
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'Invalid year.' },
        { status: 400 },
      );
    }

    // Delete all sales for this year + mark import records as deleted
    const result = await db.$transaction([
      // Delete all sales for this year
      db.sale.deleteMany({ where: { year } }),
      // Mark the DataImport record(s) for this year as 'deleted'
      db.dataImport.updateMany({
        where: { dataYear: year, status: 'completed' },
        data: { status: 'deleted' },
      }),
    ]);

    const deletedSales = result[0].count;
    const deletedImports = result[1].count;

    return NextResponse.json({
      success: true,
      year,
      deletedSalesCount: deletedSales,
      deletedImportCount: deletedImports,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[import DELETE year] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
