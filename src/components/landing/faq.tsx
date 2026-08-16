'use client';

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface FaqItem {
  id: string;
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
}

const faqItems: FaqItem[] = [
  {
    id: 'faq-1',
    questionEn: 'Do I need technical knowledge?',
    questionBn: 'আমার কি প্রযুক্তিগত জ্ঞান লাগবে?',
    answerEn:
      'No! Just upload your Excel files. TrimedCast handles all the complex math and forecasting automatically. If you can use Excel, you can use TrimedCast.',
    answerBn:
      'না, শুধু Excel ফাইল আপলোড করুন। ট্রিমেডকাস্ট সব কমপ্লেক্স কাজ অটোমেটিক করে।',
  },
  {
    id: 'faq-2',
    questionEn: 'How much data do I need?',
    questionBn: 'কতদিনের ডাটা লাগবে?',
    answerEn:
      'Minimum 12 months of sales data for accurate forecasts. More data = better predictions. Even 6 months works for basic seasonal patterns.',
    answerBn:
      'কমপক্ষে ১২ মাসের বিক্রি ডাটা। বেশি ডাটা = ভালো পূর্বাভাসন।',
  },
  {
    id: 'faq-3',
    questionEn: 'What about Chinese New Year?',
    questionBn: 'Chinese New Year এ কী হবে?',
    answerEn:
      "TrimedCast automatically calculates order deadlines based on CNY dates, sea freight lead time, and your forecast. You'll get alerts 90 days before factory closures.",
    answerBn:
      'অটোমেটিক অর্ডার ডেডলাইন অ্যালার্ট পাবেন, কারখানা বন্ধের ৯০ দিন আগে।',
  },
  {
    id: 'faq-4',
    questionEn: 'Why 12,000 BDT?',
    questionBn: '১২,০০০ টাকা কেন?',
    answerEn:
      'One wrong overstock order can cost you 50,000+ BDT in dead stock. TrimedCast costs less than one bad order per year. It pays for itself.',
    answerBn:
      'একটা ভুল অর্ডারের ক্ষতি থেকে অনেক কম। এক বছরে একটা ভুল অর্ডারও এড়ালে টাকা উঠে যায়।',
  },
  {
    id: 'faq-5',
    questionEn: 'What happens after trial?',
    questionBn: 'ট্রায়াল শেষে কী হবে?',
    answerEn:
      'After 14 days, you can subscribe to continue with full features, or keep limited read-only access to your forecasts. Your data is never deleted.',
    answerBn:
      'ফ্রি টায়ারে সীমিত ফোরকাস্ট দেখতে পাবেন। আপনার ডাটা কখনও মুছে ফেলা হয় না।',
  },
  {
    id: 'faq-6',
    questionEn: 'Can multiple users access it?',
    questionBn: 'একাধিক ইউজার পারব?',
    answerEn:
      'Yes! Up to 5 team members with role-based access. Admin, warehouse manager, sales manager, finance — each sees only what they need.',
    answerBn: 'হ্যাঁ, সর্বোচ্চ ৫ জন, রোল-ভিত্তিক অ্যাক্সেস সহ।',
  },
  {
    id: 'faq-7',
    questionEn: 'Is my data safe?',
    questionBn: 'ডাটা কি নিরাপদ?',
    answerEn:
      'Yes. All data is encrypted at rest and in transit. Automatic daily backups. Your data is isolated — no other tenant can access it.',
    answerBn:
      'হ্যাঁ, এনক্রিপ্টেড ও ব্যাকআপ করা হয়। আপনার ডাটা শুধু আপনার।',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-20 sm:py-28">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-950/5 to-background pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Frequently Asked{' '}
            <span className="text-emerald-500">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            প্রশ্ন আছে? আমরা উত্তর দিচ্ছি।
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-border/40 data-[state=open]:border-emerald-500/30 transition-colors"
              >
                <AccordionTrigger className="py-5 text-left hover:no-underline group">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm sm:text-base font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                      {item.questionEn}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground/70">
                      {item.questionBn}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed">
                  <div className="flex flex-col gap-2 pt-1 pb-2">
                    <p className="text-foreground">{item.answerEn}</p>
                    <p className="text-muted-foreground/70 text-xs sm:text-sm">
                      {item.answerBn}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
