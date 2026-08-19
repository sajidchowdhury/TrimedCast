'use client';

// ============================================
// TrimedCast — Product Catalog & Inventory Intelligence
// Session 28: Product Catalog & Inventory
// ============================================

import Link from 'next/link';
import { CatalogDashboard } from '@/components/catalog/catalog-dashboard';
import { Footer } from '@/components/landing/footer';
import { Button } from '@/components/ui/button';

export default function CatalogPage() {
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
            <span className="text-muted-foreground text-sm hidden sm:inline">/ Product Catalog & Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium hidden sm:inline">
              Session 28
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <CatalogDashboard />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
