'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bike, Mail, MessageCircle } from 'lucide-react';

const linkColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'API Docs', href: '#' },
      { label: 'Status', href: '#' },
      { label: 'WhatsApp', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Data Protection', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
] as const;

const paymentMethods = [
  { name: 'bKash', className: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { name: 'Nagad', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { name: 'SSLCommerz', className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  { name: 'Bank Transfer', className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Logo + Tagline */}
        <motion.div
          className="pt-12 sm:pt-16 pb-10 sm:pb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
              <Bike className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Trimed<span className="text-emerald-500">Cast</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Seasonal Demand &amp; Inventory Forecasting for Bangladesh
          </p>
        </motion.div>

        {/* Link Columns */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 pb-10 sm:pb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {linkColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Contact + Payment Methods */}
        <motion.div
          className="border-t border-border/40 pt-8 pb-8 flex flex-col md:flex-row items-center justify-between gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <a
              href="mailto:support@trimedcast.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4 text-emerald-500" />
              support@trimedcast.com
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              +880 1XXX-XXXXXX
            </a>
          </div>

          {/* Payment Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method.name}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${method.className}`}
              >
                {method.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Copyright */}
        <div className="border-t border-border/40 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 TrimedCast. All rights reserved. Made in Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    </footer>
  );
}
