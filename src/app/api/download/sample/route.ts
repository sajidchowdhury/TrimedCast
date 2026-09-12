// ============================================
// CreativeCast — /api/download/sample
// Serves the sample Excel file directly via API route.
// No dependency on public/ folder being copied to standalone.
// ============================================

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const paths = [
    join(process.cwd(), 'public', 'sample_client_sales.xlsx'),
    join(process.cwd(), 'sample_client_sales.xlsx'),
  ];

  for (const filePath of paths) {
    if (existsSync(filePath)) {
      const buffer = readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="sample_client_sales.xlsx"',
          'Content-Length': buffer.length.toString(),
        },
      });
    }
  }

  return NextResponse.json({ error: 'Sample file not found' }, { status: 404 });
}
