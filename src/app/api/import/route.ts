// ============================================
// TrimedCast LEAN — /api/import
// Receives the client's wide Excel, parses, melts Jan–Dec into
// SKU-month sales rows, upserts products + purchases + sales + inventory.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseExcelFile, isValidFileType, MAX_FILE_SIZE } from '@/lib/etl/excel-parser';
import { transformWideToLong } from '@/lib/etl/wide-to-long';
import { FESTIVAL_SEEDS } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dataYearStr = (formData.get('dataYear') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!isValidFileType(file.name)) {
      return NextResponse.json({ error: 'Unsupported file type. Use .xlsx, .xls, or .csv.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 10 MB.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = parseExcelFile(buf, file.name);

    const dataYear = dataYearStr ? Number(dataYearStr) : new Date().getFullYear() - 1;
    const result = transformWideToLong(parsed.rows, parsed.headers, dataYear);

    if (result.products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid SKU rows found. Ensure the sheet has a "Pic No" column.',
        warnings: result.warnings,
      }, { status: 422 });
    }

    // --- Persist ---
    const dataImport = await db.dataImport.create({
      data: {
        fileName: file.name,
        fileType: file.name.split('.').pop() || 'xlsx',
        fileSize: file.size,
        importType: 'sales_wide',
        status: 'parsed',
        dataYear, // track which year this import belongs to
        rowCount: parsed.totalRows,
        skuCount: result.products.length,
        warnings: JSON.stringify(result.warnings),
      },
    });

    let saleCount = 0;
    let purchaseCount = 0;

    await db.$transaction(async (tx) => {
      // 0. REPLACE-ON-REUPLOAD: each year can have only 1 Excel upload.
      //    Before inserting new sales, delete ALL existing sales for this year
      //    and mark previous DataImport records for this year as 'superseded'.
      await tx.sale.deleteMany({ where: { year: dataYear } });
      // Mark previous completed imports for THIS YEAR as superseded
      await tx.dataImport.updateMany({
        where: { dataYear, status: 'completed', id: { not: dataImport.id } },
        data: { status: 'superseded' },
      });

      // 1. Upsert products
      for (const p of result.products) {
        await tx.product.upsert({
          where: { skuCode: p.skuCode },
          create: {
            skuCode: p.skuCode,
            productName: p.productName,
            colorDetails: p.colorDetails,
            hsCode: '8512',
          },
          update: {
            productName: p.productName,
            colorDetails: p.colorDetails,
          },
        });
      }

      // 2. Purchases + seed inventory baseline
      for (const pu of result.purchases) {
        await tx.purchase.create({
          data: {
            skuCode: pu.skuCode,
            orderQty: pu.orderQty,
            orderedOn: pu.orderedOn ? new Date(pu.orderedOn) : new Date(),
            sendOn: pu.sendOn ? new Date(pu.sendOn) : null,
            receivedOn: pu.receivedOn ? new Date(pu.receivedOn) : null,
            shipmentMode: pu.shipmentMode,
            actualLeadTimeDays: pu.actualLeadTimeDays,
          },
        });
        purchaseCount++;

        // seed inventory with the order qty (heuristic starting stock)
        await tx.inventory.upsert({
          where: { skuCode: pu.skuCode },
          create: { skuCode: pu.skuCode, qtyOnHand: pu.orderQty },
          update: { qtyOnHand: { increment: pu.orderQty } },
        });
      }

      // 3. Sales — insert the new year's data (year was already cleared in step 0)
      for (const s of result.sales) {
        await tx.sale.create({
          data: {
            skuCode: s.skuCode,
            year: s.year,
            month: s.month,
            saleDate: new Date(s.saleDate),
            qtySold: s.qtySold,
          },
        });
        saleCount++;
      }

      // 4. Seed festival calendar if empty
      const existingFestivals = await tx.festivalSession.count();
      if (existingFestivals === 0) {
        for (const f of FESTIVAL_SEEDS) {
          await tx.festivalSession.create({
            data: {
              name: f.name,
              type: f.type,
              peakDate: new Date(f.peakDate),
              windowStart: new Date(f.windowStart),
              windowEnd: new Date(f.windowEnd),
              demandEffect: f.demandEffect,
              year: f.year,
            },
          });
        }
      }

      // 5. Seed forecast settings if empty
      const settingsCount = await tx.forecastSetting.count();
      if (settingsCount === 0) {
        await tx.forecastSetting.create({ data: {} });
      }

      await tx.dataImport.update({
        where: { id: dataImport.id },
        data: {
          status: 'completed',
          saleCount,
          purchaseCount,
          completedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      importId: dataImport.id,
      fileName: file.name,
      totalRows: parsed.totalRows,
      skuCount: result.products.length,
      saleCount,
      purchaseCount,
      warnings: result.warnings,
      mapping: result.mapping,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[import] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const byYear = url.searchParams.get('byYear') === 'true';

  if (byYear) {
    // Return the latest import per year (active uploads only — 'completed' status)
    const allImports = await db.dataImport.findMany({
      where: { status: 'completed', dataYear: { not: null } },
      orderBy: { dataYear: 'desc' },
    });

    // Group by dataYear — each year has only 1 active import
    const yearMap = new Map<number, typeof allImports[number]>();
    for (const imp of allImports) {
      const yr = imp.dataYear ?? 0;
      if (!yearMap.has(yr)) yearMap.set(yr, imp);
    }

    // Enrich with the actual sales count for that year from the DB
    const years = Array.from(yearMap.values());
    const enriched = await Promise.all(
      years.map(async (imp) => {
        const year = imp.dataYear ?? 0;
        const saleCount = await db.sale.count({ where: { year } });
        const skuCount = await db.sale.groupBy({
          by: ['skuCode'],
          where: { year },
          _count: true,
        });
        return {
          id: imp.id,
          fileName: imp.fileName,
          dataYear: year,
          status: imp.status,
          rowCount: imp.rowCount,
          skuCount: skuCount.length,
          saleCount,
          fileSize: imp.fileSize,
          createdAt: imp.createdAt.toISOString(),
          completedAt: imp.completedAt?.toISOString() ?? null,
        };
      }),
    );

    return NextResponse.json({ years: enriched, count: enriched.length });
  }

  // Default: return all imports + stats
  const imports = await db.dataImport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const stats = {
    products: await db.product.count(),
    sales: await db.sale.count(),
    purchases: await db.purchase.count(),
    festivals: await db.festivalSession.count(),
  };
  return NextResponse.json({ imports, stats });
}
