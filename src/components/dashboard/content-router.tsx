'use client';

// ============================================
// Content Router — Renders the correct content
// based on active sidebar navigation page
// ============================================

import { useDashboardStore } from '@/lib/dashboard/store';
import { DashboardOverview } from './overview';
import { ForecastPage } from './pages/forecast-page';
import { OrdersPage } from './pages/orders-page';
import { InventoryPage } from './pages/inventory-page';
import { ImportPage } from './pages/import-page';
import { SuppliersPage } from './pages/suppliers-page';
import { AnalyticsPage } from './pages/analytics-page';
import { BillingPage } from './pages/billing-page';
import { ApiExplorerPage } from './pages/api-explorer-page';
import { SettingsPage } from './pages/settings-page';
import { AnimatePresence, motion } from 'framer-motion';

export function ContentRouter() {
  const { activePage } = useDashboardStore();

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <DashboardOverview />;
      case 'forecast':
        return <ForecastPage />;
      case 'orders':
        return <OrdersPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'import':
        return <ImportPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'ai-assistant':
        return <ForecastPage />;
      case 'billing':
        return <BillingPage />;
      case 'api-explorer':
        return <ApiExplorerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}
