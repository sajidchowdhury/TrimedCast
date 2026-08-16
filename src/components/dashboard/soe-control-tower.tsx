'use client';

// ============================================
// S&OE Control Tower — 0-3 month horizon
// Stockout alerts, MAPE breaches, deliveries,
// demand forecast, critical actions, notifications
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  TrendingDown,
  Package,
  Truck,
  Brain,
  Zap,
  ShieldAlert,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  CircleDollarSign,
  Ship,
  Plane,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// --- Types ---

interface StockoutAlert {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  safetyStock: number;
  dailyConsumption: number;
  daysUntilStockout: number;
  urgency: 'critical' | 'high' | 'normal';
  recommendedAction: string;
  canAutoOrder: boolean;
}

interface MAPEBreach {
  productId: string;
  sku: string;
  productName: string;
  currentMAPE: number;
  threshold: number;
  lastRecalibratedAt: string | null;
  suggestedAction: string;
}

interface UpcomingDelivery {
  purchaseOrderId: string;
  productName: string;
  expectedDate: string;
  quantity: number;
  status: string;
  daysUntilArrival: number;
}

interface MonthlyDemandRow {
  month: string;
  season: string;
  totalForecastDemand: number;
  totalActualDemand: number;
  forecastAccuracy: number;
  gap: number;
}

interface CriticalAction {
  id: string;
  type: 'stockout_order' | 'recalibrate' | 'cny_reroute' | 'overstock_reduction' | 'sop_stage_advance';
  priority: 'critical' | 'high' | 'normal';
  title: string;
  description: string;
  productId?: string;
  impactBDT?: number;
  dueDate: string;
  isActionable: boolean;
}

interface SOENotification {
  id: string;
  type: 'stockout_risk' | 'mape_breach' | 'cny_risk' | 'overstock' | 'delivery_delay';
  severity: 'critical' | 'high' | 'normal';
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  sku?: string;
  relatedEntityId?: string;
  createdAt: string;
  isRead: boolean;
}

interface ControlTowerData {
  horizon: { startMonth: string; endMonth: string; totalMonths: number };
  summary: {
    totalSKUs: number;
    stockoutRiskCount: number;
    overstockCount: number;
    pendingOrdersCount: number;
    mapeBreachesCount: number;
    totalRecommendedSpendBDT: number;
    criticalActionsCount: number;
  };
  stockoutAlerts: StockoutAlert[];
  mapeBreaches: MAPEBreach[];
  upcomingDeliveries: UpcomingDelivery[];
  monthlyDemandForecast: MonthlyDemandRow[];
  criticalActions: CriticalAction[];
}

interface NotificationsData {
  notifications: SOENotification[];
  summary: {
    total: number;
    unread: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// --- Severity/Status Helpers ---

function severityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'text-red-600';
    case 'high': return 'text-amber-600';
    default: return 'text-sky-600';
  }
}

function severityBg(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 border-red-500/20';
    case 'high': return 'bg-amber-500/10 border-amber-500/20';
    default: return 'bg-sky-500/10 border-sky-500/20';
  }
}

function severityBadgeVariant(severity: string): 'destructive' | 'secondary' | 'outline' {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'secondary';
    default: return 'outline';
  }
}

function actionTypeIcon(type: string) {
  switch (type) {
    case 'stockout_order': return ShieldAlert;
    case 'recalibrate': return Brain;
    case 'cny_reroute': return Ship;
    case 'overstock_reduction': return Package;
    case 'sop_stage_advance': return ArrowRight;
    default: return Zap;
  }
}

function notificationTypeIcon(type: string) {
  switch (type) {
    case 'stockout_risk': return AlertTriangle;
    case 'mape_breach': return Brain;
    case 'cny_risk': return Ship;
    case 'overstock': return Package;
    case 'delivery_delay': return Clock;
    default: return Bell;
  }
}

function seasonLabel(season: string) {
  switch (season) {
    case 'winter': return 'Winter';
    case 'summer': return 'Summer';
    case 'monsoon': return 'Monsoon';
    case 'pre_winter': return 'Pre-Winter';
    default: return season;
  }
}

function formatBDT(amount: number): string {
  return `BDT ${(amount || 0).toLocaleString('en-BD')}`;
}

// --- Main Component ---

export function SOEControlTower() {
  const [data, setData] = useState<ControlTowerData | null>(null);
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ctRes, notifRes] = await Promise.all([
        fetch('/api/soe/control-tower'),
        fetch('/api/soe/notifications'),
      ]);
      const ctJson = await ctRes.json();
      const notifJson = await notifRes.json();

      if (ctJson.success) setData(ctJson.data);
      else setError(ctJson.errors?.[0]?.message || 'Failed to load control tower');

      if (notifJson.success) setNotifications(notifJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirmOrder = async (alert: StockoutAlert) => {
    if (!alert.canAutoOrder) return;
    setConfirming(alert.productId);
    setConfirmResult(null);
    try {
      const res = await fetch('/api/soe/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: alert.productId,
          quantity: Math.max(100, Math.ceil(alert.dailyConsumption * 90)),
          shipmentMode: alert.urgency === 'critical' ? 'air' : 'sea',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfirmResult(`Order confirmed: ${json.data.poNumber}`);
        // Refresh data
        setTimeout(fetchData, 1500);
      } else {
        setConfirmResult(`Error: ${json.errors?.[0]?.message || 'Failed'}`);
      }
    } catch {
      setConfirmResult('Network error');
    } finally {
      setConfirming(null);
    }
  };

  const handleMarkRead = async (ids: string[]) => {
    try {
      await fetch('/api/soe/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      // Refresh
      fetchData();
    } catch { /* ignore */ }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading S&OE Control Tower...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Failed to load S&OE data</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <Button size="sm" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || {
    totalSKUs: 0, stockoutRiskCount: 0, overstockCount: 0,
    pendingOrdersCount: 0, mapeBreachesCount: 0,
    totalRecommendedSpendBDT: 0, criticalActionsCount: 0,
  };

  const unreadNotifs = notifications?.summary.unread || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            S&OE Control Tower
            <Badge variant="outline" className="text-[10px] ml-1">
              {data?.horizon.startMonth} - {data?.horizon.endMonth}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">0-3 month execution horizon: stockout prevention, forecast health, critical actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard label="Total SKUs" value={summary.totalSKUs} icon={Package} color="text-sky-600" bg="bg-sky-500/10" />
        <KPICard label="Stockout Risk" value={summary.stockoutRiskCount} icon={AlertTriangle} color="text-red-600" bg="bg-red-500/10" highlight={summary.stockoutRiskCount > 0} />
        <KPICard label="Overstock" value={summary.overstockCount} icon={TrendingDown} color="text-amber-600" bg="bg-amber-500/10" />
        <KPICard label="Pending Orders" value={summary.pendingOrdersCount} icon={Clock} color="text-purple-600" bg="bg-purple-500/10" />
        <KPICard label="MAPE Breaches" value={summary.mapeBreachesCount} icon={Brain} color="text-orange-600" bg="bg-orange-500/10" highlight={summary.mapeBreachesCount > 0} />
        <KPICard label="Rec. Spend" value={formatBDT(summary.totalRecommendedSpendBDT)} icon={CircleDollarSign} color="text-emerald-600" bg="bg-emerald-500/10" small />
        <KPICard label="Critical Actions" value={summary.criticalActionsCount} icon={Zap} color="text-red-600" bg="bg-red-500/10" highlight={summary.criticalActionsCount > 0} />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="w-full flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="alerts" className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Stockout Alerts
            {data?.stockoutAlerts && data.stockoutAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1 h-4">{data.stockoutAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mape" className="text-xs">
            <Brain className="h-3.5 w-3.5 mr-1" />
            MAPE Breaches
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="text-xs">
            <Truck className="h-3.5 w-3.5 mr-1" />
            Deliveries
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            <Zap className="h-3.5 w-3.5 mr-1" />
            Critical Actions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="h-3.5 w-3.5 mr-1" />
            Notifications
            {unreadNotifs > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1 h-4">{unreadNotifs}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Stockout Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Stockout Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.stockoutAlerts || data.stockoutAlerts.length === 0) ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" />
                  No stockout risks detected. All SKUs are above safety stock levels.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {data.stockoutAlerts.map((alert, i) => (
                        <motion.div
                          key={alert.productId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-3 rounded-lg border ${severityBg(alert.urgency)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium truncate">{alert.productName}</span>
                                <Badge variant={severityBadgeVariant(alert.urgency)} className="text-[10px] capitalize">
                                  {alert.urgency}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{alert.sku}</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Current: </span>
                                  <span className={`font-medium ${alert.currentStock <= alert.safetyStock ? 'text-red-600' : ''}`}>{alert.currentStock}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Safety: </span>
                                  <span className="font-medium">{alert.safetyStock}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Daily Use: </span>
                                  <span className="font-medium">{alert.dailyConsumption}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Days Left: </span>
                                  <span className={`font-medium ${severityColor(alert.urgency)}`}>{alert.daysUntilStockout}</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{alert.recommendedAction}</p>
                            </div>
                            <div className="shrink-0">
                              {alert.canAutoOrder ? (
                                <Button
                                  size="sm"
                                  variant={alert.urgency === 'critical' ? 'default' : 'outline'}
                                  className="text-xs"
                                  disabled={confirming === alert.productId}
                                  onClick={() => handleConfirmOrder(alert)}
                                >
                                  {confirming === alert.productId ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Truck className="h-3 w-3 mr-1" />
                                  )}
                                  {alert.urgency === 'critical' ? 'Expidite' : 'Order'}
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Manual</Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
              {confirmResult && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700">
                  {confirmResult}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAPE Breaches Tab */}
        <TabsContent value="mape">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-500" />
                MAPE Threshold Breaches (&gt;10%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.mapeBreaches || data.mapeBreaches.length === 0) ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" />
                  All forecasts within acceptable MAPE threshold.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.mapeBreaches.map((breach, i) => (
                    <motion.div
                      key={breach.productId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-lg border bg-orange-500/10 border-orange-500/20"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{breach.productName}</span>
                          <span className="text-xs text-muted-foreground">{breach.sku}</span>
                          <Badge variant="destructive" className="text-[10px]">
                            MAPE {breach.currentMAPE}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Current MAPE: </span>
                            <span className="font-medium text-orange-600">{breach.currentMAPE}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Threshold: </span>
                            <span className="font-medium">{breach.threshold}%</span>
                          </div>
                        </div>
                        {breach.lastRecalibratedAt && (
                          <p className="text-xs text-muted-foreground">
                            Last recalibrated: {format(new Date(breach.lastRecalibratedAt), 'yyyy-MM-dd')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{breach.suggestedAction}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Deliveries Tab */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-teal-500" />
                Upcoming Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.upcomingDeliveries || data.upcomingDeliveries.length === 0) ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No upcoming deliveries in the pipeline.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.upcomingDeliveries.map((del, i) => (
                    <motion.div
                      key={del.purchaseOrderId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{del.productName}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{del.status}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Qty: </span>
                              <span className="font-medium">{del.quantity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expected: </span>
                              <span className="font-medium">{del.expectedDate}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Arrives in: </span>
                              <span className={`font-medium ${del.daysUntilArrival <= 7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {del.daysUntilArrival}d
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {del.daysUntilArrival <= 7 ? (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Arriving Soon</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">In Transit</Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Demand Forecast Tab */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Monthly Demand Forecast (0-3 Month Horizon)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Month</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Season</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Forecast Demand</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Actual Demand</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Accuracy</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.monthlyDemandForecast.map((row) => (
                      <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{row.month}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[10px]">{seasonLabel(row.season)}</Badge>
                        </td>
                        <td className="py-2 px-2 text-right">{row.totalForecastDemand.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{row.totalActualDemand.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={row.forecastAccuracy >= 85 ? 'text-emerald-600' : row.forecastAccuracy >= 70 ? 'text-amber-600' : 'text-red-600'}>
                            {row.forecastAccuracy > 0 ? `${row.forecastAccuracy}%` : '--'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={row.gap > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            {row.gap > 0 ? `+${row.gap.toLocaleString()}` : row.gap.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Gap</span> = Forecast - Actual. Positive gap means forecast overestimated demand.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Critical Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.criticalActions || data.criticalActions.length === 0) ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" />
                  No critical actions pending.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {data.criticalActions.map((action, i) => {
                      const Icon = actionTypeIcon(action.type);
                      return (
                        <motion.div
                          key={action.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-3 rounded-lg border ${severityBg(action.priority)}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${severityBg(action.priority)}`}>
                              <Icon className={`h-4 w-4 ${severityColor(action.priority)}`} />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{action.title}</span>
                                <Badge variant={severityBadgeVariant(action.priority)} className="text-[10px] capitalize">
                                  {action.priority}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {action.type.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>Due: {action.dueDate}</span>
                                {action.impactBDT != null && action.impactBDT > 0 && (
                                  <span>Impact: {formatBDT(action.impactBDT)}</span>
                                )}
                                {action.isActionable ? (
                                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Actionable</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Review Only</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-500" />
                  S&OE Notifications
                </CardTitle>
                {unreadNotifs > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const ids = notifications?.notifications
                        .filter((n) => !n.isRead)
                        .map((n) => n.id) || [];
                      if (ids.length > 0) handleMarkRead(ids);
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(!notifications?.notifications || notifications.notifications.length === 0) ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" />
                  No active notifications.
                </div>
              ) : (
                <>
                  {/* Notification summary chips */}
                  {notifications?.summary && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(notifications.summary.byType).filter(([, v]) => v > 0).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-[10px]">
                          {type.replace(/_/g, ' ')}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {notifications.notifications.map((notif, i) => {
                        const Icon = notificationTypeIcon(notif.type);
                        return (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`p-2.5 rounded-lg border ${notif.isRead ? 'border-border/50 opacity-60' : severityBg(notif.severity)}`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor(notif.severity)}`} />
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium truncate">{notif.title}</span>
                                  <Badge variant={severityBadgeVariant(notif.severity)} className="text-[10px] capitalize">
                                    {notif.severity}
                                  </Badge>
                                  {!notif.isRead && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{notif.description}</p>
                              </div>
                              {!notif.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-6 px-2 shrink-0"
                                  onClick={() => handleMarkRead([notif.id])}
                                >
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- KPI Card Sub-component ---

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  highlight,
  small,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${highlight ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className={`font-semibold ${small ? 'text-sm' : 'text-lg'} ${highlight ? 'text-red-600' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </motion.div>
  );
}
