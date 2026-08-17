// ============================================
// POST /api/v1/billing/webhook
// Stripe-compatible webhook handler for billing events
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, internalError } from '@/lib/api/response';
import {
  evaluateTenantStatus,
  cancelSubscription,
  suspendTenant,
  reactivateTenant,
  TenantStatus,
} from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


interface WebhookPayload {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse webhook payload
    const payload: WebhookPayload = await request.json();
    const { type, data } = payload;
    const eventObject = data.object;

    // 2. Handle event types
    switch (type) {
      case 'customer.subscription.updated': {
        // Evaluate tenant status after subscription update
        const tenantId = eventObject.metadata?.tenant_id;
        if (tenantId) {
          const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
          });
          if (tenant) {
            const statusCheck = evaluateTenantStatus(tenant);
            await db.tenant.update({
              where: { id: tenantId },
              data: { status: statusCheck.status as TenantStatus },
            });

            await createAuditLog({
              tenantId,
              action: 'status_change',
              entity: 'subscription',
              entityId: eventObject.id,
              metadata: {
                type: 'webhook.subscription_updated',
                new_status: statusCheck.status,
                can_write: statusCheck.canWrite,
                can_read: statusCheck.canRead,
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Cancel subscription when deleted in Stripe
        const tenantId = eventObject.metadata?.tenant_id;
        if (tenantId) {
          const subscription = await db.subscription.findUnique({
            where: { tenantId },
          });
          if (subscription && subscription.status !== 'cancelled') {
            await cancelSubscription(subscription.id);

            await createAuditLog({
              tenantId,
              action: 'status_change',
              entity: 'subscription',
              entityId: subscription.id,
              metadata: {
                type: 'webhook.subscription_deleted',
                previous_status: subscription.status,
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Mark past_due and set grace period
        const tenantId = eventObject.metadata?.tenant_id;
        if (tenantId) {
          const subscription = await db.subscription.findUnique({
            where: { tenantId },
          });
          if (subscription) {
            const now = new Date();
            const gracePeriodEnd = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000
            ); // 7-day grace

            await db.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'past_due',
                gracePeriodEnd,
                paymentFailCount: { increment: 1 },
              },
            });

            await db.tenant.update({
              where: { id: tenantId },
              data: { status: 'past_due' },
            });

            await createAuditLog({
              tenantId,
              action: 'status_change',
              entity: 'subscription',
              entityId: subscription.id,
              metadata: {
                type: 'webhook.payment_failed',
                grace_period_end: gracePeriodEnd.toISOString(),
                fail_count: subscription.paymentFailCount + 1,
              },
            });

            // If fail count exceeds 3, suspend tenant
            if (subscription.paymentFailCount + 1 >= 3) {
              await suspendTenant(tenantId, 'Excessive payment failures');
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Reactivate if tenant was suspended
        const tenantId = eventObject.metadata?.tenant_id;
        if (tenantId) {
          const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
          });
          if (tenant && (tenant.status === 'suspended' || tenant.status === 'past_due')) {
            await reactivateTenant(tenantId);

            const subscription = await db.subscription.findUnique({
              where: { tenantId },
            });

            await createAuditLog({
              tenantId,
              action: 'status_change',
              entity: 'subscription',
              entityId: subscription?.id,
              metadata: {
                type: 'webhook.payment_succeeded',
                previous_status: tenant.status,
                new_status: 'active',
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Log warning — trial is ending soon
        const tenantId = eventObject.metadata?.tenant_id;
        if (tenantId) {
          await createAuditLog({
            tenantId,
            action: 'status_change',
            entity: 'subscription',
            entityId: eventObject.id,
            metadata: {
              type: 'webhook.trial_will_end',
              warning: 'Trial period ending soon — payment method required',
            },
          });

          console.warn(
            `[Webhook] Trial ending for tenant ${tenantId}, subscription ${eventObject.id}`
          );
        }
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        console.info(`[Webhook] Unhandled event type: ${type}`);
        break;
    }

    // 3. Return success
    return apiSuccess({
      processed: true,
      event_type: type,
    });
  } catch (error) {
    console.error('[Billing/Webhook]', error);
    return internalError('Webhook processing failed');
  }
}
