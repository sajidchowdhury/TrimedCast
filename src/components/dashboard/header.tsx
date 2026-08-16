'use client';

// ============================================
// Dashboard Header — Top bar with breadcrumb, search, actions
// Includes user avatar + logout from auth context
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
  LogOut,
  User,
  Loader2,
} from 'lucide-react';
import { useDashboardStore, type DashboardPage } from '@/lib/dashboard/store';
import { useTheme } from 'next-themes';
import { AuditLogTriggerButton } from './audit-log-panel';
import { AskAITriggerButton, AskAIPanel } from './ask-ai-panel';
import { useAIStore } from '@/lib/dashboard/ai-store';
import { useAuth } from '@/lib/auth/context';
import { TrialBanner } from './trial-banner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_LABELS: Record<DashboardPage, string> = {
  overview: 'Dashboard',
  forecast: 'Forecast',
  orders: 'Order Triggers',
  inventory: 'Inventory',
  import: 'Import Data',
  suppliers: 'Suppliers',
  analytics: 'Analytics',
  'ai-assistant': 'AI Assistant',
  billing: 'Billing',
  'api-explorer': 'API Explorer',
  settings: 'Settings',
};

/** Role badge colors */
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  warehouse_manager: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  sales_manager: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  marketing_manager: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  finance: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  executive: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  viewer: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
};

export function DashboardHeader() {
  const { activePage, refreshData, isLoading } = useDashboardStore();
  const { theme, setTheme } = useTheme();
  const { user, tenant, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Trial status
  const trialDaysRemaining = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const isTrial = tenant?.status === 'trial' && trialDaysRemaining > 0;

  // Get user initials for avatar
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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

      {/* Tenant AC-ID badge (when authenticated) */}
      {isAuthenticated && tenant && (
        <>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Badge variant="outline" className="text-[10px] font-mono">
            {tenant.ac_id}
          </Badge>
        </>
      )}

      {/* Trial banner (inline in header) */}
      {isTrial && (
        <TrialBanner
          daysRemaining={trialDaysRemaining}
          onUpgrade={() => useDashboardStore.getState().setActivePage('billing')}
        />
      )}

      <div className="flex-1" />

      {/* Ask AI search bar (clickable — opens the Ask AI panel) */}
      <button
        onClick={() => useAIStore.getState().setIsOpen(true)}
        className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 max-w-xs w-full hover:bg-muted/70 transition-colors cursor-pointer"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground truncate">Ask AI... (e.g. stockout risk next 14 days)</span>
        <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1 py-0.5 shrink-0">
          {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? '\u2318' : 'Ctrl+'}K
        </kbd>
      </button>

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

        {/* Ask AI */}
        <AskAITriggerButton />

        {/* Audit Log */}
        <AuditLogTriggerButton />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-3.5 w-3.5" />
          <Badge className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 text-[8px] p-0 flex items-center justify-center">
            3
          </Badge>
        </Button>

        {/* User menu */}
        {authLoading ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </Button>
        ) : isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {userInitials}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.role && (
                    <Badge className={`w-fit text-[10px] ${ROLE_COLORS[user.role] || ''}`}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenant && (
                <>
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {tenant.shop_name || tenant.name} · {tenant.ac_id}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    Plan: {isTrial ? 'Trial (Pro)' : tenant.plan} · Division: {tenant.division}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => { useDashboardStore.getState().setActivePage('settings'); }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Ask AI Sheet Panel */}
      <AskAIPanel />
    </header>
  );
}
