'use client';

// ============================================
// TrimedCast LEAN — App Shell
// Sidebar (6 core nav items) + header + content area.
// Single-page app — view switching via Zustand, no routes.
// ============================================

import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useAppStore } from '@/stores/app-store';
import { DashboardView } from '@/components/views/dashboard-view';
import { UploadView } from '@/components/views/upload-view';
import { ForecastView } from '@/components/views/forecast-view';
import { OrdersView } from '@/components/views/orders-view';
import { FreightView } from '@/components/views/freight-view';
import { LineCostView } from '@/components/views/line-cost-view';
import { PilotReviewView } from '@/components/views/pilot-review-view';
import { CustomEventsView } from '@/components/views/custom-events-view';
import { DataView } from '@/components/views/data-view';

export function AppShell() {
  const view = useAppStore((s) => s.view);

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <SidebarNav />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {view === 'dashboard' && <DashboardView />}
          {view === 'upload' && <UploadView />}
          {view === 'forecast' && <ForecastView />}
          {view === 'orders' && <OrdersView />}
          {view === 'freight' && <FreightView />}
          {view === 'line-cost' && <LineCostView />}
          {view === 'pilot' && <PilotReviewView />}
          {view === 'events' && <CustomEventsView />}
          {view === 'data' && <DataView />}
        </main>
        <footer className="border-t bg-background px-6 py-3 text-xs text-muted-foreground">
          TrimedCast Lean v1 — Session-wise demand & order planning for BD motorcycle-parts importers
        </footer>
      </div>
    </div>
  );
}
