'use client';

// ============================================
// Activity Log — User activity/audit trail
// ============================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserManagementStore } from './user-store';
import type { ActivityEntry } from './types';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const ENTITY_ICONS: Record<string, string> = {
  user: '👤',
  forecast: '📊',
  product: '📦',
  inventory: '🏪',
  subscription: '💳',
  data_import: '📥',
  audit_log: '🔍',
};

export function ActivityLog() {
  const { activity, activityLoading, activityPage, activityTotal, fetchActivity } = useUserManagementStore();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (entityFilter !== 'all') filters.entity = entityFilter;
    if (actionFilter !== 'all') filters.action = actionFilter;
    fetchActivity(1, filters);
  }, [entityFilter, actionFilter, fetchActivity]);

  const totalPages = Math.ceil(activityTotal / 20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </CardTitle>
            <CardDescription className="text-xs">
              Recent actions across your team
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-7 w-[100px] text-[10px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="forecast">Forecasts</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="subscription">Billing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-7 w-[90px] text-[10px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No activity recorded yet</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {activity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              Page {activityPage} of {totalPages} ({activityTotal} entries)
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                disabled={activityPage <= 1}
                onClick={() => fetchActivity(activityPage - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                disabled={activityPage >= totalPages}
                onClick={() => fetchActivity(activityPage + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const actionColor = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  const entityIcon = ENTITY_ICONS[entry.entity] || '📋';

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
      <span className="text-xs shrink-0 mt-0.5">{entityIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`${actionColor} border-0 text-[9px] px-1 py-0`}>
            {entry.action}
          </Badge>
          <span className="text-xs font-medium">{entry.entity}</span>
          {entry.user_name && (
            <span className="text-[10px] text-muted-foreground ml-auto">by {entry.user_name}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatActivityDate(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

function formatActivityDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
