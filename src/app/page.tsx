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
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Statistics } from '@/components/landing/statistics';
import { Pricing } from '@/components/landing/pricing';
import { FAQ } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';

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

        {/* Features Section */}
        <Features />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Statistics / Proof Section */}
        <Statistics />

        {/* Pricing Section */}
        <Pricing />

        {/* FAQ Section */}
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
