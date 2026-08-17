'use client';

// ============================================
// TrimedCast — Module Quick Links Grid
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Sun,
  TrendingUp,
  Users,
  Shield,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MODULE_LINKS, type ModuleLink } from './types';
import { toast } from 'sonner';

interface ModuleLinksGridProps {
  links?: ModuleLink[];
}

const iconMap: Record<string, React.ElementType> = {
  Package,
  ShoppingCart,
  Sun,
  TrendingUp,
  Users,
  Shield,
  CreditCard,
  Wallet,
};

const borderColorMap: Record<string, string> = {
  emerald: 'border-l-emerald-500 hover:shadow-emerald-500/10',
  violet: 'border-l-violet-500 hover:shadow-violet-500/10',
  amber: 'border-l-amber-500 hover:shadow-amber-500/10',
  sky: 'border-l-sky-500 hover:shadow-sky-500/10',
  rose: 'border-l-rose-500 hover:shadow-rose-500/10',
  slate: 'border-l-slate-500 hover:shadow-slate-500/10',
  indigo: 'border-l-indigo-500 hover:shadow-indigo-500/10',
  pink: 'border-l-pink-500 hover:shadow-pink-500/10',
};

const iconBgMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600',
  violet: 'bg-violet-500/10 text-violet-600',
  amber: 'bg-amber-500/10 text-amber-600',
  sky: 'bg-sky-500/10 text-sky-600',
  rose: 'bg-rose-500/10 text-rose-600',
  slate: 'bg-slate-500/10 text-slate-600',
  indigo: 'bg-indigo-500/10 text-indigo-600',
  pink: 'bg-pink-500/10 text-pink-600',
};

const sessionBadgeMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  sky: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export function ModuleLinksGrid({ links }: ModuleLinksGridProps) {
  const items = links || MODULE_LINKS;

  const handleClick = (link: ModuleLink) => {
    toast.info(`Navigate to ${link.label} — available in sidebar`, {
      description: `Session ${link.session} module`,
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((link, i) => {
        const Icon = iconMap[link.icon] || Package;
        return (
          <motion.div
            key={link.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
          >
            <Card
              className={`border-l-4 ${borderColorMap[link.color] || borderColorMap.sky} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
              onClick={() => handleClick(link)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${iconBgMap[link.color] || iconBgMap.sky}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 px-1 ${sessionBadgeMap[link.color] || sessionBadgeMap.sky}`}
                  >
                    S{link.session}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">{link.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{link.labelBn}</p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{link.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
