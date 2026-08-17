'use client';

// ============================================
// AppSidebar — Main navigation sidebar
// Dashboard navigation with role-aware items
// Shows auth context in footer (user + tenant)
// ============================================

import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Package,
  Upload,
  Truck,
  BarChart3,
  CreditCard,
  Code2,
  Settings,
  Bike,
  Brain,
  Zap,
  CircleHelp,
  LogOut,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useDashboardStore, type DashboardPage } from '@/lib/dashboard/store';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/context';

interface NavItem {
  page: DashboardPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Required permissions to see this item */
  permissions?: string[];
}

const mainNav: NavItem[] = [
  { page: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'forecast', label: 'Forecast', icon: TrendingUp, permissions: ['forecasts.read', 'forecasts.crud'] },
  { page: 'orders', label: 'Order Triggers', icon: ShoppingCart, permissions: ['recommended_orders.read', 'recommended_orders.crud'] },
  { page: 'inventory', label: 'Inventory', icon: Package, permissions: ['inventory.read', 'inventory.crud'] },
];

const secondaryNav: NavItem[] = [
  { page: 'import', label: 'Import Data', icon: Upload, permissions: ['imports.crud'] },
  { page: 'suppliers', label: 'Suppliers', icon: Truck, permissions: ['suppliers.read', 'suppliers.crud'] },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'soe', label: 'S&OE Tower', icon: Zap, permissions: ['sop_cycles.crud'] },
  { page: 'ai-assistant', label: 'AI Assistant', icon: Brain },
];

const systemNav: NavItem[] = [
  { page: 'billing', label: 'Billing', icon: CreditCard, permissions: ['billing.manage'] },
  { page: 'team', label: 'Team', icon: Users, permissions: ['team.manage', 'users.manage'] },
  { page: 'api-explorer', label: 'API Explorer', icon: Code2, permissions: ['api_explorer.access'] },
  { page: 'settings', label: 'Settings', icon: Settings, permissions: ['settings.crud', 'settings.read'] },
  { page: 'help', label: 'Help', icon: CircleHelp },
];

export function AppSidebar() {
  const { activePage, setActivePage } = useDashboardStore();
  const { user, tenant, isAuthenticated, hasAnyPermission, logout } = useAuth();

  /** Filter nav items based on permissions */
  const filterByPermission = (items: NavItem[]) => {
    if (!isAuthenticated) return items; // Show all if not yet loaded
    return items.filter(item => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return hasAnyPermission(item.permissions);
    });
  };

  const visibleMainNav = filterByPermission(mainNav);
  const visibleSecondaryNav = filterByPermission(secondaryNav);
  const visibleSystemNav = filterByPermission(systemNav);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Bike className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">TrimedCast</span>
            <span className="text-[10px] text-muted-foreground leading-none">Seasonal Demand & Inventory</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainNav.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={activePage === item.page}
                    onClick={() => setActivePage(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1 h-4">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSecondaryNav.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={activePage === item.page}
                    onClick={() => setActivePage(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSystemNav.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={activePage === item.page}
                    onClick={() => setActivePage(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {isAuthenticated && user ? (
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
            {/* User info */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-semibold shrink-0">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-medium truncate">{user.name}</span>
                {tenant && (
                  <span className="text-[10px] text-muted-foreground font-mono truncate">{tenant.ac_id}</span>
                )}
              </div>
            </div>
            {/* Quick logout */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-red-500 transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center w-fit"
            >
              <LogOut className="h-3 w-3" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">v1.0 — BD Market</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
