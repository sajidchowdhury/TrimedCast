'use client';

// ============================================
// Dashboard Header — Top bar with breadcrumb, search, actions
// ============================================

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  RefreshCw,
  Moon,
  Sun,
  Bell,
  Search,
} from 'lucide-react';
import { useDashboardStore, type DashboardPage } from '@/lib/dashboard/store';
import { useTheme } from 'next-themes';
import { AuditLogTriggerButton } from './audit-log-panel';

const PAGE_LABELS: Record<DashboardPage, string> = {
  overview: 'Dashboard',
  forecast: 'Forecast',
  orders: 'Order Triggers',
  inventory: 'Inventory',
  import: 'Import Data',
  suppliers: 'Suppliers',
  analytics: 'Analytics',
  billing: 'Billing',
  'api-explorer': 'API Explorer',
  settings: 'Settings',
};

export function DashboardHeader() {
  const { activePage, refreshData, isLoading } = useDashboardStore();
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-background/95 backdrop-blur-sm px-4 sticky top-0 z-20">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-1" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink>TrimedCast</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{PAGE_LABELS[activePage]}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      {/* Ask AI search bar */}
      <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 max-w-xs w-full">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Ask AI... (e.g. stockout risk next 14 days)"
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
        />
        <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1 py-0.5 shrink-0">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1 ml-2">
        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={refreshData}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Audit Log */}
        <AuditLogTriggerButton />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-3.5 w-3.5" />
          <Badge className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 text-[8px] p-0 flex items-center justify-center">
            3
          </Badge>
        </Button>
      </div>
    </header>
  );
}
