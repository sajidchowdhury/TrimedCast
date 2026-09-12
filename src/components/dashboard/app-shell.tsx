'use client';

// ============================================
// TrimedCast LEAN — App Shell
// Sidebar (6 core nav items) + header + content area.
// Single-page app — view switching via Zustand, no routes.
// ============================================

import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { HelpButton } from '@/components/dashboard/help-button';
import { useAppStore } from '@/stores/app-store';
import { DashboardView } from '@/components/views/dashboard-view';
import { UploadManageView } from '@/components/views/upload-manage-view';
import { ForecastView } from '@/components/views/forecast-view';
import { OrdersView } from '@/components/views/orders-view';
import { FreightView } from '@/components/views/freight-view';
import { LineCostView } from '@/components/views/line-cost-view';
import { CustomEventsView } from '@/components/views/custom-events-view';
import { SettingsView } from '@/components/views/settings-view';
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
          {view === 'upload' && <UploadManageView />}
          {view === 'forecast' && <ForecastView />}
          {view === 'orders' && <OrdersView />}
          {view === 'freight' && <FreightView />}
          {view === 'line-cost' && <LineCostView />}
          {view === 'events' && <CustomEventsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'data' && <DataView />}
        </main>
        <footer className="border-t bg-background px-6 py-3 text-xs text-muted-foreground">
          CreativeCast developed with{' '}
          <span className="text-red-500">♥</span>
          {' '}&{' '}
          <span className="text-amber-600">☕</span>
          {' '}by{' '}
          <a href="https://mycreativecode.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
            my creative code
          </a>
        </footer>
      </div>
      {/* Floating help button — shows on every page, content changes per view */}
      <HelpButton />
    </div>
  );
}
