'use client';

// ============================================
// TrimedCast — Landing Page
// Premium SaaS landing page for Bangladesh
// motorcycle parts seasonal demand forecasting
// ============================================

import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { Problem } from '@/components/landing/problem';
import { Solution } from '@/components/landing/solution';
import { Bike } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <Hero />

        {/* Problem / Pain Points Section */}
        <Problem />

        {/* Solution Section */}
        <Solution />

        {/* Anchor targets for smooth scrolling (future sections) */}
        <div id="features" className="scroll-mt-20" />
        <div id="pricing" className="scroll-mt-20" />
        <div id="faq" className="scroll-mt-20" />
        <div id="how-it-works" className="scroll-mt-20" />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <Bike className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Trimed<span className="text-emerald-500">Cast</span>
              </span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} TrimedCast. Built for
              Bangladesh motorcycle parts dealers.
            </p>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
