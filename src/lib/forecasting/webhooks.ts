// ============================================
// TrimedCast — Webhook Event System
// Section 12.2: Webhook Events
//
// Events emitted when:
// - Order becomes critical (overdue stock)
// - CNY risk detected for products
// - Pipeline completes
// - Order acknowledged/converted
// - Forecast drift detected (MAPE exceeded)
// ============================================

// ============================================
// Event Types (Section 12.2)
// ============================================

export type WebhookEventType =
  | 'order_trigger.critical'
  | 'order_trigger.high'
  | 'cny_risk.detected'
  | 'pipeline.completed'
  | 'order.acknowledged'
  | 'order.converted'
  | 'order.deferred'
  | 'forecast.drift'
  | 'stockout.warning';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  tenantId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ============================================
// Specific Event Payloads
// ============================================

export interface OrderTriggerCriticalPayload {
  productId: string;
  skuCode: string;
  productName: string;
  daysOverdue: number;
  recommendedQty: number;
  stockoutDate: string;
  currentStock: number;
  safetyStock: number;
  urgency: string;
}

export interface CNYRiskDetectedPayload {
  productIds: string[];
  skuCodes: string[];
  cnyYear: number;
  affectedCount: number;
  strategyBreakdown: {
    beforeCny: number;
    afterCny: number;
    airEscape: number;
    partialOrder: number;
  };
  shutdownStart: string;
  shutdownEnd: string;
}

export interface PipelineCompletedPayload {
  sessionId: string;
  durationMs: number;
  productsAnalyzed: number;
  productsNeedingOrder: number;
  criticalCount: number;
  highCount: number;
  cnyRiskCount: number;
  totalRecommendedSpendBdt: number;
}

export interface OrderAcknowledgedPayload {
  recommendationId: string;
  productId: string;
  skuCode: string;
  action: 'ordered' | 'skipped' | 'deferred' | 'modified';
  actualQty?: number;
  notes?: string;
  acknowledgedBy?: string;
}

export interface OrderConvertedPayload {
  recommendationId: string;
  purchaseOrderId: string;
  poNumber: string;
  productId: string;
  skuCode: string;
  quantity: number;
  expectedDelivery: string;
  cnyRisk: boolean;
}

export interface ForecastDriftPayload {
  productId: string;
  skuCode: string;
  currentMape: number;
  threshold: number;
  model: string;
  lastCalibrationDate: string | null;
  recommendation: string;
}

export interface StockoutWarningPayload {
  productId: string;
  skuCode: string;
  productName: string;
  currentStock: number;
  dailyConsumption: number;
  daysUntilStockout: number;
  stockoutDate: string;
  reorderPoint: number;
}

// ============================================
// Webhook Emitter
// ============================================

type WebhookListener = (event: WebhookEvent) => void | Promise<void>;

class WebhookEmitter {
  private listeners = new Map<WebhookEventType, Set<WebhookListener>>();
  private globalListeners = new Set<WebhookListener>();
  private eventLog: WebhookEvent[] = [];
  private maxLogSize = 100;

  /**
   * Subscribe to a specific event type.
   */
  on(type: WebhookEventType, listener: WebhookListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Subscribe to ALL events.
   */
  onAny(listener: WebhookListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Emit a webhook event to all subscribers.
   */
  async emit(
    type: WebhookEventType,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      tenantId,
      timestamp: new Date().toISOString(),
      payload,
    };

    // Log the event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Notify specific listeners
    const specificListeners = this.listeners.get(type) ?? new Set();
    const promises: (void | Promise<void>)[] = [];

    for (const listener of specificListeners) {
      try {
        promises.push(listener(event));
      } catch (err) {
        console.error(`[Webhook] Listener error for ${type}:`, err);
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        promises.push(listener(event));
      } catch (err) {
        console.error(`[Webhook] Global listener error for ${type}:`, err);
      }
    }

    await Promise.all(promises);
    return event;
  }

  /**
   * Get recent events for a tenant.
   */
  getRecentEvents(tenantId?: string, limit: number = 20): WebhookEvent[] {
    const events = tenantId
      ? this.eventLog.filter(e => e.tenantId === tenantId)
      : this.eventLog;
    return events.slice(-limit);
  }

  /**
   * Get events by type.
   */
  getEventsByType(type: WebhookEventType, limit: number = 20): WebhookEvent[] {
    return this.eventLog.filter(e => e.type === type).slice(-limit);
  }

  /**
   * Clear all listeners and log.
   */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.eventLog.length = 0;
  }
}

// ============================================
// Singleton Emitter
// ============================================

export const webhookEmitter = new WebhookEmitter();

// ============================================
// Convenience Emit Functions
// ============================================

export async function emitOrderCritical(
  tenantId: string,
  payload: OrderTriggerCriticalPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('order_trigger.critical', tenantId, payload);
}

export async function emitCNYRiskDetected(
  tenantId: string,
  payload: CNYRiskDetectedPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('cny_risk.detected', tenantId, payload);
}

export async function emitPipelineCompleted(
  tenantId: string,
  payload: PipelineCompletedPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('pipeline.completed', tenantId, payload);
}

export async function emitOrderAcknowledged(
  tenantId: string,
  payload: OrderAcknowledgedPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('order.acknowledged', tenantId, payload);
}

export async function emitOrderConverted(
  tenantId: string,
  payload: OrderConvertedPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('order.converted', tenantId, payload);
}

export async function emitForecastDrift(
  tenantId: string,
  payload: ForecastDriftPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('forecast.drift', tenantId, payload);
}

export async function emitStockoutWarning(
  tenantId: string,
  payload: StockoutWarningPayload,
): Promise<WebhookEvent> {
  return webhookEmitter.emit('stockout.warning', tenantId, payload);
}

// ============================================
// Default Console Logger (Development)
// ============================================

if (process.env.NODE_ENV !== 'production') {
  webhookEmitter.onAny((event) => {
    console.log(
      `[Webhook] ${event.type} | tenant=${event.tenantId} | ${new Date(event.timestamp).toLocaleTimeString()}`,
    );
  });
}
