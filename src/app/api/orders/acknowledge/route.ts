// ============================================
// PATCH /api/orders/acknowledge
// Acknowledge/act on a recommended order
// Section 12.1 API: Acknowledge recommendation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId: tenantIdSlug = 'demo-bd-motors',
      recommendationId,
      action = 'ordered',  // ordered, skipped, deferred, modified
      actualQty,
      actualOrderDate,
      shipmentMode = 'sea',
      notes,
    } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
    }

    const validActions = ['ordered', 'skipped', 'deferred', 'modified'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }

    const tenantId = await resolveTenantId(tenantIdSlug);

    // Find the recommendation
    const recommendation = await db.recommendedOrder.findFirst({
      where: { id: recommendationId, tenantId },
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    // Update based on action
    let newStatus: string;
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'ordered':
        newStatus = 'approved';
        updateData = {
          status: 'approved',
          suggestedQty: actualQty ?? recommendation.suggestedQty,
        };

        // If ordered, also create an audit log
        await db.auditLog.create({
          data: {
            tenantId,
            userId: 'system',
            action: 'ORDER_ACKNOWLEDGED',
            entity: 'RecommendedOrder',
            entityId: recommendationId,
            changes: JSON.stringify({
              action: 'ordered',
              actualQty: actualQty ?? recommendation.suggestedQty,
              actualOrderDate: actualOrderDate ?? new Date().toISOString().split('T')[0],
              shipmentMode,
              notes,
            }),
          },
        });
        break;

      case 'skipped':
        newStatus = 'rejected';
        updateData = { status: 'rejected' };
        break;

      case 'deferred':
        newStatus = 'deferred';
        // Defer by 30 days
        const deferredDate = new Date(recommendation.orderTrigger);
        deferredDate.setDate(deferredDate.getDate() + 30);
        updateData = {
          orderTrigger: deferredDate,
          justification: `${recommendation.justification || ''} [DEFERRED by 30 days: ${notes || 'No reason provided'}]`,
        };
        break;

      case 'modified':
        newStatus = 'pending';
        updateData = {
          suggestedQty: actualQty ?? recommendation.suggestedQty,
          justification: `${recommendation.justification || ''} [MODIFIED: qty changed to ${actualQty}. ${notes || ''}]`,
        };
        break;
    }

    // Apply the update
    const updated = await db.recommendedOrder.update({
      where: { id: recommendationId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      recommendationId,
      action,
      newStatus,
      updated: {
        id: updated.id,
        status: updated.status,
        suggestedQty: updated.suggestedQty,
        orderTrigger: updated.orderTrigger.toISOString().split('T')[0],
        priority: updated.priority,
      },
      message: `Recommendation ${recommendationId} ${action}. Status: ${newStatus}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to acknowledge recommendation', details: String(error) },
      { status: 500 }
    );
  }
}
