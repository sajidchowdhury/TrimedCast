// ============================================
// CreativeCast — /api/download/template
// Serves the Excel template file directly via API route.
// No dependency on public/ folder being copied to standalone.
// ============================================

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const paths = [
    join(process.cwd(), 'public', 'trimedcast-template.xlsx'),
    join(process.cwd(), 'trimedcast-template.xlsx'),
  ];

  for (const filePath of paths) {
    if (existsSync(filePath)) {
      const buffer = readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="trimedcast-template.xlsx"',
          'Content-Length': buffer.length.toString(),
        },
      });
    }
  }

  return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
}
