// ============================================
// TrimedCast API - Save Recommended Orders
// POST: Persist calculated order triggers as RecommendedOrder records
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';

interface TriggerToSave {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  orderTrigger: string;
  totalLeadTime: number;
  reorderHitDate: string;
  priority: string;
  justification?: string;
  cnyRisk?: boolean;
  cnyStrategy?: string;
  stockStatus?: string;
  daysOfStock?: number;
  suggestedOrderQty?: number;
  currentSeason?: string;
  seasonNote?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'demo-bd-motors',
      triggers,
    } = body as { tenantId?: string; triggers: TriggerToSave[] };
    const tenantId = await resolveTenantId(tenantIdRaw);

    if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'triggers array is required and must not be empty' },
        { status: 400 }
      );
    }

    let savedCount = 0;
    const errors: string[] = [];

    for (const trigger of triggers) {
      try {
        // Build justification if not provided
        const justification = trigger.justification || buildJustification(trigger);

        // Check for existing pending recommended order for same product
        const existing = await db.recommendedOrder.findFirst({
          where: {
            tenantId,
            productId: trigger.productId,
            status: 'pending',
          },
        });

        if (existing) {
          // Update existing pending order
          await db.recommendedOrder.update({
            where: { id: existing.id },
            data: {
              quantity: trigger.quantity || trigger.suggestedOrderQty || 0,
              orderTrigger: trigger.orderTrigger,
              totalLeadTime: trigger.totalLeadTime,
              reorderHitDate: trigger.reorderHitDate ? new Date(trigger.reorderHitDate) : null,
              priority: trigger.priority,
              justification,
              orderDate: new Date(),
            },
          });
        } else {
          // Create new recommended order
          await db.recommendedOrder.create({
            data: {
              tenantId,
              productId: trigger.productId,
              orderDate: new Date(),
              quantity: trigger.quantity || trigger.suggestedOrderQty || 0,
              orderTrigger: trigger.orderTrigger,
              totalLeadTime: trigger.totalLeadTime,
              reorderHitDate: trigger.reorderHitDate ? new Date(trigger.reorderHitDate) : null,
              priority: trigger.priority,
              status: 'pending',
              justification,
            },
          });
        }

        savedCount++;
      } catch (err) {
        errors.push(`Failed to save trigger for ${trigger.productSku}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        savedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildJustification(trigger: TriggerToSave): string {
  const parts: string[] = [];

  if (trigger.stockStatus) {
    parts.push(`Stock: ${trigger.stockStatus}`);
  }
  if (trigger.daysOfStock !== undefined) {
    parts.push(`${trigger.daysOfStock} days of stock remaining`);
  }
  if (trigger.cnyRisk) {
    parts.push('CNY RISK: ' + (trigger.cnyStrategy || 'Order affected by Chinese New Year shutdown'));
  }
  if (trigger.currentSeason) {
    parts.push(`Season: ${trigger.currentSeason}`);
  }
  if (trigger.seasonNote) {
    parts.push(trigger.seasonNote);
  }
  if (trigger.orderTrigger) {
    parts.push(`Trigger: ${trigger.orderTrigger}`);
  }

  return parts.join(' | ') || 'Order trigger calculated';
}
