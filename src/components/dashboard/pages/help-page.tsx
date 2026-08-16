'use client';

// ============================================
// Help Page — Full help page with three tabs:
// Step-by-Step, Import Guide, Page Guide
// ============================================

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  PAGE_HELP,
  IMPORT_HELP,
  PLATFORM_GUIDE,
} from '@/lib/help/page-help-content';
import type { DashboardPage } from '@/lib/dashboard/store';

// ---------- Tab 1: Step-by-Step Guide ----------

function StepByStepTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Follow these phases to get the most out of TrimedCast. / 
        TrimedCast থেকে সর্বোত্তম ফল পেতে এই ধাপগুলো অনুসরণ করুন।
      </p>
      <Accordion type="multiple" className="w-full">
        {PLATFORM_GUIDE.map((phase, phaseIdx) => (
          <AccordionItem key={phaseIdx} value={`phase-${phaseIdx}`}>
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {phaseIdx + 1}
                </span>
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    {phase.phase}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {phase.phaseBn}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-3 ml-2">
                {phase.steps.map((step, stepIdx) => (
                  <li key={stepIdx} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
                      {stepIdx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {step.actionBn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.whereBn}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ---------- Tab 2: Import Guide ----------

function ImportGuideTab() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <p className="text-sm font-medium text-foreground">
            Import Order / ইম্পোর্ট ক্রম:
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Motorcycle Models &gt; Suppliers &gt; Products/Parts &gt; Inventory &gt; Sales History &gt; Purchase History &gt; Promo Events
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            মটরসাইকেল মডেল &gt; সাপ্লায়ার &gt; প্রোডাক্ট/পার্ট &gt; ইনভেন্ট্রি &gt; সেলস হিস্ট্রি &gt; পারচেস হিস্ট্রি &gt; প্রোমো ইভেন্ট
          </p>
        </CardContent>
      </Card>

      {IMPORT_HELP.map((importType) => (
        <Card key={importType.type} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {importType.labelBn}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {importType.type}
              </Badge>
            </div>
            <CardDescription className="text-sm">
              {importType.descriptionBn}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Min columns: <code className="bg-muted px-1 py-0.5 rounded text-xs">{importType.minColumns}</code>
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Field</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Label (BN)</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Req</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Example</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Note (BN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importType.columns.map((col) => (
                      <tr key={col.field} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 font-mono text-foreground">{col.field}</td>
                        <td className="px-3 py-2 text-foreground">{col.labelBn}</td>
                        <td className="px-3 py-2">
                          {col.required ? (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              Optional
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{col.type}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{col.example}</td>
                        <td className="px-3 py-2 text-muted-foreground">{col.noteBn || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Tab 3: Page Guide ----------

function PageGuideTab() {
  const pages = Object.keys(PAGE_HELP) as DashboardPage[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Detailed help for every page in the platform. / 
        প্ল্যাটফর্মের প্রতিটি পেজের বিস্তারিত সাহায্য।
      </p>
      <Accordion type="multiple" className="w-full">
        {pages.map((pageKey) => {
          const pageHelp = PAGE_HELP[pageKey];
          return (
            <AccordionItem key={pageKey} value={pageKey}>
              <AccordionTrigger className="text-left">
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    {pageHelp.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pageHelp.titleBn}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pageHelp.summaryBn}
                  </p>

                  <Separator />

                  {/* Sections */}
                  <div className="space-y-3">
                    {pageHelp.sections.map((section, idx) => (
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
                  {pageHelp.tipsBn.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-medium text-foreground">
                          Tips / টিপস
                        </h4>
                        <ul className="space-y-1">
                          {pageHelp.tipsBn.map((tip, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

// ---------- Main Help Page ----------

export function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Platform Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          প্ল্যাটফর্ম গাইড — TrimedCast-এর সম্পূর্ণ ব্যবহার নির্দেশিকা
        </p>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="step-by-step" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="step-by-step" className="text-xs sm:text-sm">
            Step-by-Step
          </TabsTrigger>
          <TabsTrigger value="import-guide" className="text-xs sm:text-sm">
            Import Guide
          </TabsTrigger>
          <TabsTrigger value="page-guide" className="text-xs sm:text-sm">
            Page Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="step-by-step" className="mt-4">
          <StepByStepTab />
        </TabsContent>

        <TabsContent value="import-guide" className="mt-4">
          <ImportGuideTab />
        </TabsContent>

        <TabsContent value="page-guide" className="mt-4">
          <PageGuideTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
