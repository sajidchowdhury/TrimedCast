'use client';

// ============================================
// TrimedCast - Onboarding Step 2: Download Templates
// All 7 CSV import types with download buttons
// ============================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, SkipForward, Download, CheckCircle2 } from 'lucide-react';
import {
  useOnboardingStore,
  CSV_TEMPLATES,
} from '@/lib/onboarding/store';

// Minimal CSV content for each template type
const CSV_CONTENT: Record<string, string> = {
  'motorcycle-models': 'brand,model,cc,category,year\nBajaj,Pulsar 150,150,commuter,2024\nTVS,Apache RTR 160,160,sport,2024',
  suppliers: 'name,contact_person,email,phone,country,lead_time_days\nShenzhen Parts Co.,Li Wei,liwei@example.com,+8613912345678,China,30',
  products: 'sku,name,category,motorcycle_model,cost_price,selling_price,unit\nBP-ENG-001,Piston Kit,Engine,Bajaj Pulsar 150,850,1200,piece',
  inventory: 'sku,quantity_on_hand,warehouse_location,reorder_point,safety_stock\nBP-ENG-001,50,A-1-01,20,10',
  'sales-history': 'date,sku,quantity,revenue,customer_type\n2024-01-15,BP-ENG-001,5,6000,retail',
  'purchase-history': 'date,sku,supplier,quantity,cost,lead_time_days,actual_delivery_date\n2024-01-01,BP-ENG-001,Shenzhen Parts Co.,100,85000,30,2024-02-02',
  'seasonal-events': 'name,type,start_month,end_month,demand_multiplier,description\neid_peak,holiday,3,4,1.5,Eid ul-Fitr demand spike',
};

export function StepDownloadTemplates() {
  const {
    downloadedTemplates,
    markTemplateDownloaded,
    nextStep,
    prevStep,
    skipStep,
  } = useOnboardingStore();

  const handleDownload = (templateId: string, filename: string) => {
    const content = CSV_CONTENT[templateId] || 'placeholder';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    markTemplateDownloaded(templateId);
  };

  const allDownloaded = downloadedTemplates.length === CSV_TEMPLATES.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Download CSV templates
        </h2>
        <p className="text-sm text-muted-foreground">
          সিএসভি টেমপ্লেট ডাউনলোড করুন — আপনার ডাটা এই ফরম্যাটে দিন
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          These templates show the exact format TrimedCast expects for each data type.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CSV_TEMPLATES.map((template, i) => {
          const isDownloaded = downloadedTemplates.includes(template.id);
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                isDownloaded
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-background hover:border-emerald-500/20'
              }`}
            >
              <span className="text-2xl">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{template.label}</p>
                <p className="text-xs text-muted-foreground truncate">{template.labelBn}</p>
              </div>
              <Button
                variant={isDownloaded ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => handleDownload(template.id, template.filename)}
                className={isDownloaded
                  ? 'text-emerald-500 hover:bg-emerald-500/10'
                  : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                }
              >
                {isDownloaded ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(downloadedTemplates.length / CSV_TEMPLATES.length) * 100}%` }}
          />
        </div>
        <span>{downloadedTemplates.length}/{CSV_TEMPLATES.length} downloaded</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={skipStep}
          className="text-muted-foreground hover:text-foreground ml-auto"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Skip
        </Button>
        <Button
          onClick={nextStep}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
        >
          {allDownloaded ? 'All Downloaded!' : 'Continue'}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
