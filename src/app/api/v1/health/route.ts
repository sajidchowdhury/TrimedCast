// ============================================
// GET /api/v1/health
// Public health check endpoint (no auth required)
// Session 16: Scaling + Production Hardening
// ============================================

import { NextResponse } from 'next/server';
import { getFullSystemHealth } from '@/lib/api/health-check';

export async function GET() {
  try {
    const health = await getFullSystemHealth();

    // Return appropriate HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200
      : health.status === 'degraded' ? 200  // Still operational
      : 503;  // Service unavailable

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
