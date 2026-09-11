'use client';

// ============================================
// TrimedCast LEAN — Dashboard header
// Shows the active view title + a mobile nav (sheet) since sidebar is md+.
// ============================================

import { useAppStore, type ViewKey } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TITLES: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Unified session pilot — all 6 capabilities' },
  upload: { title: 'Upload & Manage', subtitle: 'Upload Excel + year-wise upload list with delete' },
  forecast: { title: 'Forecast', subtitle: 'Session-wise demand prediction (Eid, Puja, Summer, Winter)' },
  orders: { title: 'Order Recommendations', subtitle: 'How much to order & when to place the PO' },
  freight: { title: 'Air vs Sea Freight', subtitle: 'Shipping-mode decision per SKU' },
  'line-cost': { title: 'Line Cost Analysis', subtitle: 'Landed cost, customs duty & margin' },
  pilot: { title: 'Pilot Review & Handoff', subtitle: 'Results, deferred scope & quick reference guide' },
  events: { title: 'Custom Events', subtitle: 'Create your own festival or event with custom demand effects' },
  settings: { title: 'Settings', subtitle: 'Lead-time, holidays, EOQ params — all editable & saved to DB' },
  data: { title: 'Products & Sales', subtitle: 'View, edit prices, delete SKUs — server-side paginated' },
};

const MOBILE_NAV = [
  { key: 'dashboard' as ViewKey, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'forecast' as ViewKey, label: 'Forecast', icon: TrendingUp },
  { key: 'orders' as ViewKey, label: 'Order Recommendations', icon: ShoppingCart },
  { key: 'freight' as ViewKey, label: 'Air vs Sea', icon: Plane },
  { key: 'line-cost' as ViewKey, label: 'Line Cost', icon: Calculator },
  { key: 'upload' as ViewKey, label: 'Upload & Manage', icon: Upload },
  { key: 'data' as ViewKey, label: 'Products & Sales', icon: Database },
  { key: 'events' as ViewKey, label: 'Custom Events', icon: CalendarPlus },
  { key: 'pilot' as ViewKey, label: 'Pilot Review', icon: Rocket },
  { key: 'settings' as ViewKey, label: 'Settings', icon: SettingsIcon },
];

export function DashboardHeader() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const meta = TITLES[view];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center gap-2 px-5 h-16 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              T
            </div>
            <span className="font-semibold text-sm">TrimedCast Lean</span>
          </div>
          <nav className="p-3 space-y-1">
            {MOBILE_NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold leading-tight truncate">{meta.title}</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">{meta.subtitle}</p>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border bg-background px-2 py-1">
          BDT (৳)
        </span>
        <span className="rounded-md border bg-background px-2 py-1">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </header>
  );
}
