'use client';

// ============================================
// Floating Help Button — "?" button that opens
// an off-canvas Sheet with page-specific Bangla help
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useDashboardStore } from '@/lib/dashboard/store';
import { PAGE_HELP } from '@/lib/help/page-help-content';

export function FloatingHelpButton() {
  const [open, setOpen] = useState(false);
  const activePage = useDashboardStore((s) => s.activePage);
  const help = PAGE_HELP[activePage];

  // Gracefully handle pages without help content
  if (!help) return null;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Open help panel"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          <HelpCircle className="h-5 w-5" />
        </motion.span>
      </motion.button>

      {/* Off-canvas Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-lg">
              {help.title} / {help.titleBn}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Page-specific help in Bangla
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
            <div className="p-4 space-y-5">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Summary / সারসংক্ষেপ
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {help.summaryBn}
                </p>
              </div>

              <Separator />

              {/* Sections */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Sections / বিভাগসমূহ
                </h3>
                {help.sections.map((section, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">
                      {section.titleBn}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.contentBn}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tips */}
              {help.tipsBn.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Tips / টিপস
                    </h3>
                    <ul className="space-y-1.5">
                      {help.tipsBn.map((tip, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2"
                        >
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
