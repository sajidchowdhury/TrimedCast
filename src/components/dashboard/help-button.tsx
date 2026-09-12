'use client';

// ============================================
// TrimedCast LEAN — Floating help button + Bangla off-canvas
// Shows a "?" button fixed to the bottom-right corner on every page.
// Click opens an off-canvas with page-specific Bangla documentation.
// ============================================

import { useAppStore } from '@/stores/app-store';
import { getHelpContent } from '@/lib/help/help-content';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, X, Calculator, TrendingUp, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function HelpButton() {
  const view = useAppStore((s) => s.view);
  const [open, setOpen] = useState(false);
  const help = getHelpContent(view);

  return (
    <>
      {/* Floating "?" button — fixed bottom-right */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-110 transition-all"
        title={`${help.title} — সাহায্য`}
        aria-label="Help"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Off-canvas with Bangla documentation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="border-b p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <SheetTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {help.title}
                </SheetTitle>
                <SheetDescription className="mt-1">{help.subtitle}</SheetDescription>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>

          <div className="p-5 space-y-4">
            {/* Intro */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm leading-relaxed text-foreground">{help.intro}</p>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {help.sections.map((section, i) => (
                <div key={i} className="space-y-1.5">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    {section.heading}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Math note — "why it's math not magic" */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <Calculator className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    এটি জাদু নয় — এটি গণিত
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">{help.mathNote}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>পেজ: {help.title}</span>
              <Badge variant="outline" className="text-[10px]">
                <TrendingUp className="h-3 w-3 mr-1" />
                CreativeCast
              </Badge>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
