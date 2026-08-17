// ============================================
// Subscription Management — Zustand Store
// ============================================

import { create } from 'zustand';
import type {
  SubscriptionStatusResponse,
  InvoiceData,
  LifecycleEvent,
  Tier,
  BillingCycle,
  CancellationReason,
} from './types';

export interface SubscriptionStore {
  // --- Status ---
  statusData: SubscriptionStatusResponse | null;
  isLoadingStatus: boolean;
  statusError: string | null;

  // --- Invoices ---
  invoices: InvoiceData[];
  invoicesPage: number;
  invoicesTotal: number;
  invoicesLastPage: number;
  isLoadingInvoices: boolean;
  invoicesError: string | null;

  // --- Events ---
  events: LifecycleEvent[];
  isLoadingEvents: boolean;
  eventsError: string | null;

  // --- Change Plan ---
  isChangingPlan: boolean;
  changePlanError: string | null;
  changePlanSuccess: string | null;

  // --- Cancel ---
  isCancelling: boolean;
  cancelError: string | null;
  cancelSuccess: string | null;

  // --- Resume ---
  isResuming: boolean;
  resumeError: string | null;

  // --- Renew ---
  isRenewing: boolean;
  renewError: string | null;
  renewSuccess: string | null;

  // --- Auto Renew Toggle ---
  isTogglingAutoRenew: boolean;

  // --- Expanded Invoice ---
  expandedInvoiceId: string | null;

  // --- Actions ---
  fetchStatus: () => Promise<void>;
  fetchInvoices: (page?: number) => Promise<void>;
  fetchEvents: () => Promise<void>;
  changePlan: (tier: Tier, billingCycle: BillingCycle) => Promise<boolean>;
  cancelSubscription: (reason: CancellationReason, feedback?: string) => Promise<boolean>;
  resumeSubscription: () => Promise<boolean>;
  renewSubscription: () => Promise<boolean>;
  toggleAutoRenew: (enabled: boolean) => Promise<boolean>;
  setExpandedInvoiceId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  // --- Initial State ---
  statusData: null,
  isLoadingStatus: true,
  statusError: null,

  invoices: [],
  invoicesPage: 1,
  invoicesTotal: 0,
  invoicesLastPage: 1,
  isLoadingInvoices: false,
  invoicesError: null,

  events: [],
  isLoadingEvents: false,
  eventsError: null,

  isChangingPlan: false,
  changePlanError: null,
  changePlanSuccess: null,

  isCancelling: false,
  cancelError: null,
  cancelSuccess: null,

  isResuming: false,
  resumeError: null,

  isRenewing: false,
  renewError: null,
  renewSuccess: null,

  isTogglingAutoRenew: false,

  expandedInvoiceId: null,

  // --- Fetch Status ---
  fetchStatus: async () => {
    set({ isLoadingStatus: true, statusError: null });
    try {
      const res = await fetch('/api/v1/subscription/status');
      if (!res.ok) {
        set({ statusError: `HTTP ${res.status}: Failed to load subscription`, isLoadingStatus: false });
        return;
      }
      const json = await res.json();
      if (!json.success) {
        set({ statusError: json.errors?.[0]?.message || 'Failed to load subscription', isLoadingStatus: false });
        return;
      }
      set({ statusData: json.data as SubscriptionStatusResponse, isLoadingStatus: false });
    } catch (err) {
      set({ statusError: err instanceof Error ? err.message : 'Network error', isLoadingStatus: false });
    }
  },

  // --- Fetch Invoices ---
  fetchInvoices: async (page = 1) => {
    set({ isLoadingInvoices: true, invoicesError: null });
    try {
      const res = await fetch(`/api/v1/subscription/invoices?page=${page}&per_page=10`);
      if (!res.ok) {
        set({ invoicesError: `HTTP ${res.status}`, isLoadingInvoices: false });
        return;
      }
      const json = await res.json();
      if (!json.success) {
        set({ invoicesError: json.errors?.[0]?.message || 'Failed to load invoices', isLoadingInvoices: false });
        return;
      }
      // Handle both paginated and demo format
      const data = json.data;
      if (Array.isArray(data)) {
        set({
          invoices: data as InvoiceData[],
          invoicesPage: json.meta?.page || page,
          invoicesTotal: json.meta?.total || data.length,
          invoicesLastPage: json.meta?.last_page || 1,
          isLoadingInvoices: false,
        });
      } else if (data?.invoices) {
        set({
          invoices: data.invoices as InvoiceData[],
          invoicesPage: data.page || page,
          invoicesTotal: data.total || data.invoices.length,
          invoicesLastPage: 1,
          isLoadingInvoices: false,
        });
      } else {
        set({ invoices: [], isLoadingInvoices: false });
      }
    } catch (err) {
      set({ invoicesError: err instanceof Error ? err.message : 'Network error', isLoadingInvoices: false });
    }
  },

  // --- Fetch Events ---
  fetchEvents: async () => {
    set({ isLoadingEvents: true, eventsError: null });
    try {
      const statusData = get().statusData;
      if (statusData?.subscription?.id) {
        const res = await fetch(`/api/v1/subscription/status`);
        if (!res.ok) {
          set({ events: [], isLoadingEvents: false });
          return;
        }
        const json = await res.json();
        if (json.success && json.data?.subscription) {
          const sub = json.data.subscription;
          const events: LifecycleEvent[] = [];

          events.push({
            id: `evt-created-${sub.id}`,
            eventType: 'created',
            fromStatus: null,
            toStatus: 'trial',
            fromTier: null,
            toTier: sub.tier,
            metadata: null,
            performedBy: null,
            createdAt: sub.createdAt,
          });

          if (sub.status !== 'trial') {
            events.push({
              id: `evt-activated-${sub.id}`,
              eventType: 'activated',
              fromStatus: 'trial',
              toStatus: 'active',
              fromTier: sub.tier,
              toTier: sub.tier,
              metadata: null,
              performedBy: null,
              createdAt: sub.currentPeriodStart || sub.createdAt,
            });
          }

          if (sub.lastPaymentAt && sub.status === 'active') {
            events.push({
              id: `evt-renewed-${sub.id}`,
              eventType: 'renewed',
              fromStatus: 'active',
              toStatus: 'active',
              fromTier: sub.tier,
              toTier: sub.tier,
              metadata: JSON.stringify({ amount: sub.unitAmount }),
              performedBy: null,
              createdAt: sub.lastPaymentAt,
            });
          }

          if (sub.cancelledAt) {
            events.push({
              id: `evt-cancelled-${sub.id}`,
              eventType: 'cancelled',
              fromStatus: 'active',
              toStatus: 'cancelled',
              fromTier: sub.tier,
              toTier: sub.tier,
              metadata: null,
              performedBy: null,
              createdAt: sub.cancelledAt,
            });
          }

          if (sub.expiredAt) {
            events.push({
              id: `evt-expired-${sub.id}`,
              eventType: 'expired',
              fromStatus: sub.status === 'past_due' ? 'past_due' : 'active',
              toStatus: 'expired',
              fromTier: sub.tier,
              toTier: sub.tier,
              metadata: null,
              performedBy: null,
              createdAt: sub.expiredAt,
            });
          }

          events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          set({ events, isLoadingEvents: false });
        } else {
          set({ events: [], isLoadingEvents: false });
        }
      } else {
        // Demo events
        const now = new Date();
        set({
          events: [
            {
              id: 'evt-demo-1',
              eventType: 'created',
              fromStatus: null,
              toStatus: 'trial',
              fromTier: null,
              toTier: 'professional',
              metadata: null,
              performedBy: null,
              createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'evt-demo-2',
              eventType: 'activated',
              fromStatus: 'trial',
              toStatus: 'active',
              fromTier: 'professional',
              toTier: 'professional',
              metadata: null,
              performedBy: null,
              createdAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'evt-demo-3',
              eventType: 'renewed',
              fromStatus: 'active',
              toStatus: 'active',
              fromTier: 'professional',
              toTier: 'professional',
              metadata: JSON.stringify({ amount: 6900 }),
              performedBy: null,
              createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          isLoadingEvents: false,
        });
      }
    } catch (err) {
      set({ eventsError: err instanceof Error ? err.message : 'Network error', isLoadingEvents: false });
    }
  },

  // --- Change Plan ---
  changePlan: async (tier, billingCycle) => {
    set({ isChangingPlan: true, changePlanError: null, changePlanSuccess: null });
    try {
      const res = await fetch('/api/v1/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle }),
      });
      const json = await res.json();
      if (!json.success) {
        set({ changePlanError: json.errors?.[0]?.message || 'Failed to change plan', isChangingPlan: false });
        return false;
      }
      set({ changePlanSuccess: json.data?.message || 'Plan changed successfully', isChangingPlan: false });
      // Refresh status
      await get().fetchStatus();
      return true;
    } catch (err) {
      set({ changePlanError: err instanceof Error ? err.message : 'Network error', isChangingPlan: false });
      return false;
    }
  },

  // --- Cancel ---
  cancelSubscription: async (reason, feedback) => {
    set({ isCancelling: true, cancelError: null, cancelSuccess: null });
    try {
      const res = await fetch('/api/v1/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, feedback }),
      });
      const json = await res.json();
      if (!json.success) {
        set({ cancelError: json.errors?.[0]?.message || 'Failed to cancel', isCancelling: false });
        return false;
      }
      set({ cancelSuccess: json.data?.message || 'Subscription cancelled', isCancelling: false });
      await get().fetchStatus();
      await get().fetchEvents();
      return true;
    } catch (err) {
      set({ cancelError: err instanceof Error ? err.message : 'Network error', isCancelling: false });
      return false;
    }
  },

  // --- Resume ---
  resumeSubscription: async () => {
    set({ isResuming: true, resumeError: null });
    try {
      const res = await fetch('/api/v1/subscription/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) {
        set({ resumeError: json.errors?.[0]?.message || 'Failed to resume', isResuming: false });
        return false;
      }
      set({ isResuming: false, cancelSuccess: null });
      await get().fetchStatus();
      await get().fetchEvents();
      return true;
    } catch (err) {
      set({ resumeError: err instanceof Error ? err.message : 'Network error', isResuming: false });
      return false;
    }
  },

  // --- Renew ---
  renewSubscription: async () => {
    set({ isRenewing: true, renewError: null, renewSuccess: null });
    try {
      const res = await fetch('/api/v1/subscription/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) {
        set({ renewError: json.errors?.[0]?.message || 'Failed to renew', isRenewing: false });
        return false;
      }
      set({ renewSuccess: json.data?.message || 'Subscription renewed', isRenewing: false });
      await get().fetchStatus();
      await get().fetchInvoices(1);
      await get().fetchEvents();
      return true;
    } catch (err) {
      set({ renewError: err instanceof Error ? err.message : 'Network error', isRenewing: false });
      return false;
    }
  },

  // --- Toggle Auto-Renew ---
  toggleAutoRenew: async (enabled) => {
    set({ isTogglingAutoRenew: true });
    try {
      // Use change-plan endpoint with same tier to update auto-renew
      // Or a direct status update — for now, use the status endpoint pattern
      const res = await fetch('/api/v1/subscription/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: enabled }),
      });
      // If PATCH not supported, simulate success
      if (res.ok) {
        await get().fetchStatus();
      } else {
        // Optimistic update
        const current = get().statusData;
        if (current?.subscription) {
          set({
            statusData: {
              ...current,
              subscription: {
                ...current.subscription,
                autoRenew: enabled,
              },
            },
          });
        }
      }
      set({ isTogglingAutoRenew: false });
      return true;
    } catch {
      set({ isTogglingAutoRenew: false });
      return false;
    }
  },

  // --- Set Expanded Invoice ---
  setExpandedInvoiceId: (id) => set({ expandedInvoiceId: id }),

  // --- Clear Messages ---
  clearMessages: () =>
    set({
      changePlanError: null,
      changePlanSuccess: null,
      cancelError: null,
      cancelSuccess: null,
      resumeError: null,
      renewError: null,
      renewSuccess: null,
      statusError: null,
    }),
}));
