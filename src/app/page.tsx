'use client';

// ============================================
// TrimedCast — Forecast Results Dashboard
// Session 21: Demand Forecasting Results
// ============================================

import { ForecastDashboard } from '@/components/forecast-results/forecast-dashboard';
import { Footer } from '@/components/landing/footer';

export default function ForecastResultsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <span className="font-semibold text-base">TrimedCast</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">/ Forecast Results</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium">
              Session 21
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <ForecastDashboard />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
