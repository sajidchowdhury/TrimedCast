// ============================================
// POST /api/v1/billing/usage/track
// Record a billable usage event
// Session 14: Usage Metering & Feature Check
// ============================================

import { NextRequest } from 'next/server';
import {
  apiCreated,
  apiError,
  unauthorizedError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  recordUsageEvent,
  checkUsageLimit,
  type UsageEventType,
} from '@/lib/api/billing';

// Valid event types
const VALID_EVENT_TYPES: UsageEventType[] = [
  'forecast_run',
  'ai_query',
  'sku_created',
  'import_run',
  'report_generated',
];

// Map event type to the corresponding limit check type
const EVENT_TO_LIMIT_TYPE: Record<
  string,
  'ai_queries' | 'forecast_runs' | 'import_runs' | 'sku_count' | null
> = {
  forecast_run: 'forecast_runs',
  ai_query: 'ai_queries',
  sku_created: 'sku_count',
  import_run: 'import_runs',
  report_generated: null, // No limit check for reports
};

export async function POST(request: NextRequest) {
  try {
    // 1. Get auth context (require auth)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { event_type, metadata } = body;

    // Validate event_type (required)
    if (!event_type) {
      return validationError('event_type', 'event_type is required');
    }

    if (!VALID_EVENT_TYPES.includes(event_type)) {
      return validationError(
        'event_type',
        `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
      );
    }

    // Validate metadata (optional, must be object if provided)
    if (metadata !== undefined && metadata !== null && typeof metadata !== 'object') {
      return validationError('metadata', 'metadata must be an object');
    }

    // 3. Get tenant plan for limit checking
    const { db } = await import('@/lib/db');
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return apiError({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    // 4. Check usage limit for the event type
    const limitType = EVENT_TO_LIMIT_TYPE[event_type];
    if (limitType) {
      const limitCheck = await checkUsageLimit(context.tenantId, tenant.plan, limitType);

      // 5. If limit exceeded, return 429
      if (!limitCheck.allowed) {
        return apiError(
          {
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `Usage limit exceeded for ${limitType}. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}`,
          },
          429
        );
      }
    }

    // 6. Record the usage event
    await recordUsageEvent(
      context.tenantId,
      event_type as UsageEventType,
      metadata
    );

    // 7. Get updated remaining usage after recording
    let remaining: number | null = null;
    if (limitType) {
      const updatedCheck = await checkUsageLimit(
        context.tenantId,
        tenant.plan,
        limitType
      );
      remaining = updatedCheck.remaining;
    }

    // 8. Return apiCreated with event details and remaining usage
    return apiCreated({
      event_type,
      tenant_id: context.tenantId,
      recorded_at: new Date().toISOString(),
      remaining,
    });
  } catch (error) {
    console.error('[Billing/Usage/Track/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to record usage event' },
      500
    );
  }
}
