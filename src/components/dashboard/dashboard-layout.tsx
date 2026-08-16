'use client';

// ============================================
// Dashboard Layout — Main application shell
// Sidebar + Header + Main Content + Right Panel
// Sticky footer, ErrorBoundary, page transitions
// ============================================

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { DashboardHeader } from './header';
import { ContentRouter } from './content-router';
import { AuditLogPanel } from './audit-log-panel';
import { ErrorBoundary } from './error-boundary';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-h-screen flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-5 overflow-auto">
          <ErrorBoundary>
            <ContentRouter />
          </ErrorBoundary>
        </main>
        <footer className="mt-auto border-t border-border py-3 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            TrimedCast — Integrated Seasonal Demand &amp; Inventory Forecasting System for Bangladesh Motorcycle Parts
          </p>
        </footer>
      </SidebarInset>
      <AuditLogPanel />
    </SidebarProvider>
  );
}
