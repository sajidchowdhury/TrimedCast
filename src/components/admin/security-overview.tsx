'use client';

// ============================================
// TrimedCast — Security Overview
// Session 24: Multi-Tenant Admin Panel
// ============================================

import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type SecurityEventSummary } from './types';

interface SecurityOverviewProps {
  security: SecurityEventSummary;
}

const eventTypeLabels: Record<string, string> = {
  rate_limit_exceeded: 'Rate Limit',
  suspicious_login: 'Suspicious Login',
  permission_denied: 'Permission Denied',
  invalid_token: 'Invalid Token',
  brute_force: 'Brute Force',
};

export function SecurityOverview({ security }: SecurityOverviewProps) {
  const maxCount = Math.max(...security.topTypes.map((t) => t.count), 1);

  const barColors = [
    'bg-red-400 dark:bg-red-500',
    'bg-amber-400 dark:bg-amber-500',
    'bg-sky-400 dark:bg-sky-500',
    'bg-slate-400 dark:bg-slate-500',
    'bg-orange-400 dark:bg-orange-500',
  ];

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="pb-0 pt-0">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Security Overview</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-0 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold">{security.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{security.critical}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Critical</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <p className="text-lg font-bold">{security.resolved}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Resolved</p>
          </div>
          <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3 text-amber-500" />
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{security.unresolved}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Unresolved</p>
          </div>
        </div>

        {/* Top Event Types - Horizontal Bars */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Event Types
          </p>
          {security.topTypes.map((evt, idx) => {
            const pct = Math.round((evt.count / maxCount) * 100);
            const label = eventTypeLabels[evt.type] || evt.type;
            return (
              <div key={evt.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">{evt.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
