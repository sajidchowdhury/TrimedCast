'use client';

// ============================================
// TrimedCast — Alert Center
// Session 20: Control Tower Dashboard
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AlertItem } from './types';
import { MOCK_ALERTS } from './types';

interface AlertCenterProps {
  alerts?: AlertItem[];
}

const severityConfig: Record<string, { icon: React.ElementType; iconColor: string; iconBg: string; dotColor: string }> = {
  critical: {
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-500/10',
    dotColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
    dotColor: 'bg-amber-500',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-500/10',
    dotColor: 'bg-sky-500',
  },
};

export function AlertCenter({ alerts: initialAlerts }: AlertCenterProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts || MOCK_ALERTS);

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-500/10">
              <Bell className="h-3.5 w-3.5 text-rose-600" />
            </div>
            Alert Center
            {activeAlerts.length > 0 && (
              <Badge variant="outline" className="text-xs py-0 px-1.5 bg-rose-500/10 text-rose-700 border-rose-500/20">
                {activeAlerts.length}
              </Badge>
            )}
            {criticalCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                <Bell className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-600">No Active Alerts</p>
              <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {activeAlerts.map((alert, i) => {
                  const config = severityConfig[alert.severity] || severityConfig.info;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-muted transition-colors group"
                    >
                      <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${config.iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{alert.message}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      <span className={`h-2 w-2 rounded-full shrink-0 mt-2 ${config.dotColor} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
