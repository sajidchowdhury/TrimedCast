'use client';

// ============================================
// TrimedCast LEAN — Sidebar navigation (organized into sections)
// Sections: Planning, Data, Admin
// ============================================

import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  ShoppingCart,
  Plane,
  Calculator,
  Database,
  Rocket,
  CalendarPlus,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAppStore, type ViewKey } from '@/stores/app-store';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Planning',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Unified session pilot' },
      { key: 'forecast', label: 'Forecast', icon: TrendingUp, description: 'Session-wise demand prediction' },
      { key: 'orders', label: 'Order Recommendations', icon: ShoppingCart, description: 'How much & when to order' },
      { key: 'freight', label: 'Air vs Sea', icon: Plane, description: 'Freight mode decision' },
      { key: 'line-cost', label: 'Line Cost', icon: Calculator, description: 'Landed cost & margin analysis' },
    ],
  },
  {
    title: 'Data',
    items: [
      { key: 'upload', label: 'Upload & Manage', icon: Upload, description: 'Upload Excel + year-wise list' },
      { key: 'data', label: 'Products & Sales', icon: Database, description: 'View + edit + delete products' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { key: 'events', label: 'Custom Events', icon: CalendarPlus, description: 'Create your own festival/event' },
      { key: 'pilot', label: 'Pilot Review', icon: Rocket, description: 'Results, handoff & deferred scope' },
      { key: 'settings', label: 'Settings', icon: SettingsIcon, description: 'Lead-time, holidays, EOQ params' },
    ],
  },
];

export function SidebarNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background shrink-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          T
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-sm">TrimedCast</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Lean Edition</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={cn('text-[11px] leading-tight', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium">Single-tenant mode</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Billing, multi-tenancy & RBAC deferred per lean scope.
          </p>
        </div>
      </div>
    </aside>
  );
}
