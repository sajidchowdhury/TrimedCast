// ============================================
// TrimedCast - RBAC Rate Limit Panel Component
// Session 16: Role-Based Access Control
// Per-role rate limit visualization with progress bars
// ============================================

'use client';

import React from 'react';
import {
  ROLE_RATE_LIMITS,
  ROLE_LABELS,
  type Role,
} from '@/lib/api/rbac';
import { ROLE_COLORS, BENGALI_ROLE_LABELS } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, X } from 'lucide-react';

// --- Rate Limit Categories ---

interface RateLimitCategory {
  key: string;
  label: string;
  description: string;
  unit: string;
}

const RATE_LIMIT_CATEGORIES: RateLimitCategory[] = [
  { key: 'api', label: 'API Requests', description: 'General API endpoint calls', unit: 'req/min' },
  { key: 'ai', label: 'AI Queries', description: 'AI/ML prediction requests', unit: 'req/min' },
  { key: 'forecast', label: 'Forecast Runs', description: 'Forecast generation requests', unit: 'req/min' },
  { key: 'import', label: 'Data Imports', description: 'Bulk data import operations', unit: 'req/min' },
];

const ALL_ROLES: Role[] = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];

// --- Props ---

interface RateLimitPanelProps {
  /** Show Bengali labels */
  showBn?: boolean;
}

// --- Component ---

export function RateLimitPanel({ showBn = false }: RateLimitPanelProps) {
  const getRoleLabel = (role: Role): string => {
    if (showBn) return BENGALI_ROLE_LABELS[role] ?? ROLE_LABELS[role];
    return ROLE_LABELS[role];
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="warehouse_manager" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {ALL_ROLES.map((role) => {
            const colors = ROLE_COLORS[role];
            return (
              <TabsTrigger
                key={role}
                value={role}
                className="gap-1.5 text-xs data-[state=active]:shadow-sm"
              >
                <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
                <span className="hidden sm:inline">{getRoleLabel(role)}</span>
                <span className="sm:hidden">{getRoleLabel(role).split(' ').slice(-1)[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ALL_ROLES.map((role) => {
          const limits = ROLE_RATE_LIMITS[role];
          const colors = ROLE_COLORS[role];
          const totalLimit = Object.values(limits).reduce((sum, v) => sum + v, 0);

          return (
            <TabsContent key={role} value={role} className="mt-4">
              {/* Role summary */}
              <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${colors.bg} ${colors.text}`}>
                <span className={`inline-block h-3 w-3 rounded-full ${colors.dot}`} />
                <span className="font-semibold text-sm">{getRoleLabel(role)}</span>
                <span className="text-xs opacity-80">
                  Total: {totalLimit} req/min across all categories
                </span>
              </div>

              {/* Rate limit cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RATE_LIMIT_CATEGORIES.map((category) => {
                  const limit = limits[category.key] ?? 0;
                  const isAllowed = limit > 0;
                  // Simulate some usage for visualization (random-ish but deterministic)
                  const simulatedUsage = isAllowed
                    ? Math.round(limit * (role === 'warehouse_manager' ? 0.35 : 0.2))
                    : 0;
                  const usagePercent = isAllowed ? Math.round((simulatedUsage / limit) * 100) : 0;

                  return (
                    <Card
                      key={category.key}
                      className={`transition-all duration-200 ${
                        !isAllowed ? 'opacity-60 border-red-200 dark:border-red-800' : ''
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            {category.label}
                          </CardTitle>
                          {!isAllowed ? (
                            <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 dark:text-red-400 dark:border-red-700">
                              <X className="h-3 w-3 mr-0.5" />
                              Not Allowed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {limit} {category.unit}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {category.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isAllowed ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Usage: {simulatedUsage} / {limit}</span>
                              <span>{usagePercent}%</span>
                            </div>
                            <Progress
                              value={usagePercent}
                              className={`h-2 ${
                                usagePercent > 80
                                  ? '[&>[data-slot=progress-indicator]]:bg-red-500'
                                  : usagePercent > 60
                                    ? '[&>[data-slot=progress-indicator]]:bg-amber-500'
                                    : '[&>[data-slot=progress-indicator]]:bg-emerald-500'
                              }`}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Remaining: {limit - simulatedUsage}</span>
                              <span>Resets every 60s</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 py-2">
                            <X className="h-4 w-4" />
                            <span>This role does not have access to {category.label.toLowerCase()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
