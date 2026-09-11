'use client';

// ============================================
// TrimedCast LEAN — Sidebar navigation
// Only the 6 core capabilities the client asked for, plus a Data view.
// NO billing, NO users, NO settings, NO audit log (deferred scope).
// ============================================

import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  ShoppingCart,
  Plane,
  Calculator,
  Database,
} from 'lucide-react';
import { useAppStore, type ViewKey } from '@/stores/app-store';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    phase: 'Phase 0',
    description: 'Overview & upcoming sessions',
  },
  {
    key: 'upload',
    label: 'Upload Excel',
    icon: Upload,
    phase: 'Phase 1',
    description: 'Import monthly sales (wide format)',
  },
  {
    key: 'forecast',
    label: 'Forecast',
    icon: TrendingUp,
    phase: 'Phase 2',
    description: 'Session-wise demand prediction',
  },
  {
    key: 'orders',
    label: 'Order Recommendations',
    icon: ShoppingCart,
    phase: 'Phase 3',
    description: 'How much & when to order',
  },
  {
    key: 'freight',
    label: 'Air vs Sea',
    icon: Plane,
    phase: 'Phase 4',
    description: 'Freight mode decision',
  },
  {
    key: 'line-cost',
    label: 'Line Cost',
    icon: Calculator,
    phase: 'Phase 4',
    description: 'Landed cost & margin analysis',
  },
  {
    key: 'data',
    label: 'Data',
    icon: Database,
    phase: 'Phase 1',
    description: 'Uploaded products & sales',
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

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground text-foreground',
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span
                  className={cn(
                    'text-[11px] leading-tight',
                    active ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
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
