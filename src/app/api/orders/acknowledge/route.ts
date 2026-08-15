// ============================================
// PATCH /api/orders/acknowledge
// Acknowledge/act on a recommended order
//
// Enhanced with:
//   - Full action support: ordered | skipped | deferred | modified
//   - Actual qty & date tracking
//   - Shipment mode override
//   - Comprehensive audit log entries
//   - Status transitions with justification
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';

// ── Valid action types ──
const VALID_ACTIONS = ['ordered', 'skipped', 'deferred', 'modified'] as const;
type AcknowledgeAction = (typeof VALID_ACTIONS)[number];

// ── Action → status mapping ──
const ACTION_STATUS_MAP: Record<AcknowledgeAction, string> = {
  ordered: 'approved',
  skipped: 'rejected',
  deferred: 'deferred',
  modified: 'pending',
};

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId: tenantIdSlug = 'demo-bd-motors',
      recommendationId,
      action = 'ordered',
      actualQty,
      actualOrderDate,
      shipmentMode,
      notes,
    } = body;

    // ── Validate recommendationId ──
    if (!recommendationId) {
      return NextResponse.json(
        { error: 'recommendationId is required' },
        { status: 400 },
      );
    }

    // ── Validate action ──
    if (!VALID_ACTIONS.includes(action as AcknowledgeAction)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }
    const effectiveAction = action as AcknowledgeAction;

    // ── Validate shipmentMode if provided ──
    if (shipmentMode && !['sea', 'air'].includes(shipmentMode)) {
      return NextResponse.json(
        { error: 'shipmentMode must be "sea" or "air"' },
        { status: 400 },
      );
    }

    // ── Validate actualQty if provided ──
    if (actualQty !== undefined && (typeof actualQty !== 'number' || actualQty < 0)) {
      return NextResponse.json(
        { error: 'actualQty must be a non-negative number' },
        { status: 400 },
      );
    }

    const tenantId = await resolveTenantId(tenantIdSlug);

    // ── Find the recommendation ──
    const recommendation = await db.recommendedOrder.findFirst({
      where: { id: recommendationId, tenantId },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 },
      );
    }

    // ── Build update data based on action ──
    const newStatus = ACTION_STATUS_MAP[effectiveAction];
    const updateData: Record<string, unknown> = { status: newStatus };
    const auditChanges: Record<string, unknown> = {
      action: effectiveAction,
      previousStatus: recommendation.status,
      newStatus,
      notes,
    };

    const today = new Date().toISOString().split('T')[0];

    switch (effectiveAction) {
      case 'ordered': {
        const qty = actualQty ?? recommendation.suggestedQty;
        updateData.quantity = qty;
        updateData.suggestedQty = qty;
        if (shipmentMode) updateData.shipmentMode = shipmentMode;
        if (actualOrderDate) {
          updateData.orderDate = new Date(actualOrderDate);
        }

        auditChanges.actualQty = qty;
        auditChanges.actualOrderDate = actualOrderDate ?? today;
        auditChanges.shipmentMode = shipmentMode ?? recommendation.shipmentMode;
        break;
      }

      case 'skipped': {
        // No qty/date changes — just reject
        updateData.justification = [
          recommendation.justification,
          `[SKIPPED: ${notes || 'No reason provided'}]`,
        ].filter(Boolean).join(' ');

        auditChanges.reason = notes || 'Skipped by user';
        break;
      }

      case 'deferred': {
        // Defer order date by 30 days
        const deferredDate = new Date(recommendation.orderDate);
        deferredDate.setDate(deferredDate.getDate() + 30);

        updateData.orderDate = deferredDate;
        updateData.priority = 'low'; // Lower priority when deferred
        updateData.justification = [
          recommendation.justification,
          `[DEFERRED 30 days to ${deferredDate.toISOString().split('T')[0]}: ${notes || 'No reason provided'}]`,
        ].filter(Boolean).join(' ');

        auditChanges.deferredTo = deferredDate.toISOString().split('T')[0];
        auditChanges.reason = notes || 'Deferred by 30 days';
        break;
      }

      case 'modified': {
        if (actualQty !== undefined) {
          updateData.quantity = actualQty;
          updateData.suggestedQty = actualQty;
        }
        if (shipmentMode) updateData.shipmentMode = shipmentMode;
        if (actualOrderDate) {
          updateData.orderDate = new Date(actualOrderDate);
        }

        updateData.justification = [
          recommendation.justification,
          `[MODIFIED: qty=${actualQty ?? recommendation.suggestedQty}, ship=${shipmentMode ?? recommendation.shipmentMode}. ${notes || ''}]`,
        ].filter(Boolean).join(' ');

        auditChanges.actualQty = actualQty ?? recommendation.suggestedQty;
        auditChanges.shipmentMode = shipmentMode ?? recommendation.shipmentMode;
        auditChanges.actualOrderDate = actualOrderDate;
        auditChanges.reason = notes || 'Modified by user';
        break;
      }
    }

    // ── Apply the update ──
    const updated = await db.recommendedOrder.update({
      where: { id: recommendationId },
      data: updateData,
    });

    // ── Create Audit Log ──
    await db.auditLog.create({
      data: {
        tenantId,
        userId: null, // System action; real user ID would come from auth
        action: `RECOMMENDATION_${effectiveAction.toUpperCase()}`,
        entity: 'RecommendedOrder',
        entityId: recommendationId,
        changes: JSON.stringify({
          before: {
            status: recommendation.status,
            suggestedQty: recommendation.suggestedQty,
            quantity: recommendation.quantity,
            shipmentMode: recommendation.shipmentMode,
            priority: recommendation.priority,
          },
          after: {
            status: updated.status,
            suggestedQty: updated.suggestedQty,
            quantity: updated.quantity,
            shipmentMode: updated.shipmentMode,
            priority: updated.priority,
          },
        }),
        metadata: JSON.stringify(auditChanges),
      },
    });

    // ── Build action-specific message ──
    const messages: Record<AcknowledgeAction, string> = {
      ordered: `Order approved for ${updated.suggestedQty} units. Shipment: ${updated.shipmentMode}.`,
      skipped: `Recommendation skipped. Status → rejected.`,
      deferred: `Recommendation deferred 30 days to ${fmt(updated.orderDate)}. Priority → low.`,
      modified: `Recommendation modified. Qty: ${updated.suggestedQty}, Ship: ${updated.shipmentMode}.`,
    };

    return NextResponse.json({
      success: true,
      data: {
        recommendationId,
        action: effectiveAction,
        newStatus,
        message: messages[effectiveAction],
        updated: {
          id: updated.id,
          status: updated.status,
          quantity: updated.quantity,
          suggestedQty: updated.suggestedQty,
          orderDate: fmt(updated.orderDate),
          shipmentMode: updated.shipmentMode,
          priority: updated.priority,
          justification: updated.justification,
        },
        auditLogged: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to acknowledge recommendation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ── Helper ──
function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}
