// ============================================
// GET /api/system/cache
// Section 8: Performance Requirements — Cache stats
// ============================================

import { NextResponse } from 'next/server';
import { getAllCacheStats, invalidateTenantCaches, clearAllCaches } from '@/lib/forecasting/cache';

export async function GET() {
  try {
    const stats = getAllCacheStats();
    return NextResponse.json({
      caches: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get cache stats', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      invalidateTenantCaches(tenantId);
      return NextResponse.json({ message: `Caches invalidated for tenant: ${tenantId}` });
    }

    clearAllCaches();
    return NextResponse.json({ message: 'All caches cleared' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear caches', details: String(error) },
      { status: 500 }
    );
  }
}
