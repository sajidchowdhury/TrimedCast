// ============================================
// TrimedCast - Auth Pages Layout
// Centered layout for login/signup pages
// Left: branding panel | Right: form
// ============================================

import { Bike } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Trimed<span className="text-emerald-200">Cast</span>
            </span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-4xl font-bold leading-tight mb-4">
              ঋতুভিত্তিক চাহিদা<br />
              পূর্বাভাসন সিস্টেম
            </h2>
            <p className="text-emerald-100 text-lg leading-relaxed mb-8">
              Stop guessing seasonal demand. Know exactly when and how much to order for your motorcycle parts business.
            </p>

            {/* Trust indicators */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-emerald-100">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">✓</div>
                <span>14-day free trial, no credit card</span>
              </div>
              <div className="flex items-center gap-3 text-emerald-100">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">✓</div>
                <span>See predictions in 5 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-emerald-100">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">✓</div>
                <span>Built for Bangladesh market</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <p className="text-emerald-200 text-sm">
            © {new Date().getFullYear()} TrimedCast. মোটরসাইকেল পার্টস ডিলারের জন্য।
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
              <Bike className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Trimed<span className="text-emerald-500">Cast</span>
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
