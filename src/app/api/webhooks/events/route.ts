// ============================================
// GET /api/webhooks/events
// List recent webhook events for a tenant
// Section 12.2: Webhook Events
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { webhookEmitter } from '@/lib/forecasting/webhooks';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'demo-bd-motors';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type') as string | null;

    const events = type
      ? webhookEmitter.getEventsByType(type as any, limit)
      : webhookEmitter.getRecentEvents(tenantId, limit);

    // Stats
    const allEvents = webhookEmitter.getRecentEvents(undefined, 1000);
    const byType: Record<string, number> = {};
    for (const evt of allEvents) {
      byType[evt.type] = (byType[evt.type] || 0) + 1;
    }

    return NextResponse.json({
      events,
      stats: {
        totalEvents: allEvents.length,
        byType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch webhook events', details: String(error) },
      { status: 500 }
    );
  }
}
