'use client';

// ============================================
// AppSidebar — Main navigation sidebar
// Dashboard navigation with role-aware items
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

interface NavItem {
  page: DashboardPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNav: NavItem[] = [
  { page: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'forecast', label: 'Forecast', icon: TrendingUp },
  { page: 'orders', label: 'Order Triggers', icon: ShoppingCart },
  { page: 'inventory', label: 'Inventory', icon: Package },
];

const secondaryNav: NavItem[] = [
  { page: 'import', label: 'Import Data', icon: Upload },
  { page: 'suppliers', label: 'Suppliers', icon: Truck },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'soe', label: 'S&OE Tower', icon: Zap },
  { page: 'ai-assistant', label: 'AI Assistant', icon: Brain },
];

const systemNav: NavItem[] = [
  { page: 'billing', label: 'Billing', icon: CreditCard },
  { page: 'api-explorer', label: 'API Explorer', icon: Code2 },
  { page: 'settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const { activePage, setActivePage } = useDashboardStore();

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
              {mainNav.map((item) => (
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
              {secondaryNav.map((item) => (
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
              {systemNav.map((item) => (
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">v1.0 — BD Market</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
