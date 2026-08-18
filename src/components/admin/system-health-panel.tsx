'use client';

// ============================================
// TrimedCast — System Health Panel
// Session 24: Multi-Tenant Admin Panel
// ============================================

import { Server, RefreshCw, Clock, Database, HardDrive, Cpu, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type SystemHealth } from './types';

interface SystemHealthPanelProps {
  health: SystemHealth;
  onRefresh: () => void;
}

const serviceIconMap: Record<string, React.ElementType> = {
  Database: Database,
  Queue: HardDrive,
  Cache: Cpu,
  API: Globe,
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'healthy'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-red-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

function OverallStatusBadge({ status }: { status: SystemHealth['status'] }) {
  const config = {
    healthy: { emoji: '🟢', label: 'Healthy', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    degraded: { emoji: '🟡', label: 'Degraded', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
    unhealthy: { emoji: '🔴', label: 'Unhealthy', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${c.cls}`}>
      {c.emoji} {c.label}
    </span>
  );
}

export function SystemHealthPanel({ health, onRefresh }: SystemHealthPanelProps) {
  const lastChecked = new Date(health.lastChecked).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="pb-0 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">System Health</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-0 space-y-4">
        {/* Overall Status */}
        <div className="flex items-center gap-3">
          <OverallStatusBadge status={health.status} />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last: {lastChecked}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold">{health.uptime}%</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold">{health.dbLatencyMs}ms</p>
            <p className="text-xs text-muted-foreground">DB Latency</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-bold">{health.queueDepth}</p>
            <p className="text-xs text-muted-foreground">Queue Jobs</p>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Services</p>
          {health.services.map((svc) => {
            const Icon = serviceIconMap[svc.name] || Server;
            return (
              <div
                key={svc.name}
                className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30"
              >
                <div className="flex items-center gap-2.5">
                  <StatusDot status={svc.status} />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{svc.latencyMs}ms</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
