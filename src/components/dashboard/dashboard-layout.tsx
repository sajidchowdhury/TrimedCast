'use client';

// ============================================
// Dashboard Layout — Main application shell
// Sidebar + Header + Main Content + Right Panel
// ============================================

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { DashboardHeader } from './header';
import { ContentRouter } from './content-router';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-5 overflow-auto">
          <ContentRouter />
        </main>
        <footer className="border-t border-border py-3 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            TrimedCast — Integrated Seasonal Demand & Inventory Forecasting System for Bangladesh Motorcycle Parts
          </p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
