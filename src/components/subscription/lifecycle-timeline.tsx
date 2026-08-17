'use client';

// ============================================
// Lifecycle Timeline — Visual timeline of subscription events
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  CircleDot,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  TimerOff,
  TrendingDown,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubscriptionStore } from './subscription-store';
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  formatBDT,
  type EventType,
  type LifecycleEvent,
} from './types';

// --- Event Icon ---
function getEventIcon(type: EventType) {
  const iconMap: Record<EventType, React.ReactNode> = {
    created: <CircleDot className="h-4 w-4" />,
    activated: <Zap className="h-4 w-4" />,
    renewed: <RefreshCw className="h-4 w-4" />,
    payment_failed: <AlertTriangle className="h-4 w-4" />,
    payment_recovered: <CheckCircle2 className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
    resumed: <Play className="h-4 w-4" />,
    expired: <TimerOff className="h-4 w-4" />,
    downgraded: <TrendingDown className="h-4 w-4" />,
    plan_changed: <ArrowRightLeft className="h-4 w-4" />,
    grace_period_started: <Clock className="h-4 w-4" />,
  };
  return iconMap[type] || <CircleDot className="h-4 w-4" />;
}

// --- Event Description ---
function getEventDescription(event: LifecycleEvent): string {
  const meta = event.metadata ? (JSON.parse(event.metadata) as Record<string, unknown>) : {};
  switch (event.eventType) {
    case 'created':
      return `Subscription created on ${event.toTier || ''} plan`;
    case 'activated':
      return `Subscription activated — ${event.toTier || ''} plan is now live`;
    case 'renewed':
      return `Subscription renewed${meta.amount ? ` for ${formatBDT(meta.amount as number)}` : ''}`;
    case 'payment_failed':
      return 'Payment attempt failed';
    case 'payment_recovered':
      return 'Payment recovered successfully';
    case 'cancelled':
      return `Subscription cancelled${meta.reason ? ` — ${meta.reason}` : ''}`;
    case 'resumed':
      return 'Subscription resumed — access restored';
    case 'expired':
      return 'Subscription expired — access revoked';
    case 'downgraded':
      return `Plan downgraded from ${event.fromTier || ''} to ${event.toTier || ''}`;
    case 'plan_changed':
      return `Plan changed from ${event.fromTier || ''} to ${event.toTier || ''}`;
    case 'grace_period_started':
      return 'Grace period started — payment overdue';
    default:
      return event.eventType;
  }
}

// --- Metadata display ---
function EventMetadata({ metadata }: { metadata: string | null }) {
  const [entries, setEntries] = React.useState<[string, unknown][]>([]);

  React.useEffect(() => {
    if (!metadata) {
      setEntries([]);
      return;
    }
    try {
      const parsed = JSON.parse(metadata) as Record<string, unknown>;
      const filtered = Object.entries(parsed).filter(
        ([key]) => !['reason', 'feedback'].includes(key)
      );
      setEntries(filtered);
    } catch {
      setEntries([]);
    }
  }, [metadata]);

  if (entries.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.slice(0, 3).map(([key, value]) => (
        <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0">
          {key}: {typeof value === 'number' ? formatBDT(value) : String(value).slice(0, 30)}
        </Badge>
      ))}
    </div>
  );
}

// --- Single Timeline Item ---
function TimelineItem({ event, index }: { event: LifecycleEvent; index: number }) {
  const colorClass = EVENT_TYPE_COLORS[event.eventType] || 'bg-gray-500';
  const icon = getEventIcon(event.eventType);
  const label = EVENT_TYPE_LABELS[event.eventType] || event.eventType;
  const description = getEventDescription(event);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="flex gap-3"
    >
      {/* Dot + Line */}
      <div className="flex flex-col items-center">
        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${colorClass} text-white shadow-sm`}>
          {icon}
        </div>
        <div className="w-0.5 flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          <Badge
            variant={
              ['payment_failed', 'cancelled', 'expired'].includes(event.eventType)
                ? 'destructive'
                : ['renewed', 'activated', 'resumed'].includes(event.eventType)
                ? 'default'
                : 'secondary'
            }
            className="text-[10px]"
          >
            {event.fromStatus && `${event.fromStatus} → `}
            {event.toStatus || event.eventType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {event.performedBy && (
            <span className="text-xs text-muted-foreground">
              by {event.performedBy.slice(0, 8)}...
            </span>
          )}
        </div>
        <EventMetadata metadata={event.metadata} />
      </div>
    </motion.div>
  );
}

// --- Main Component ---
export function LifecycleTimeline() {
  const { events, isLoadingEvents, eventsError, fetchEvents } = useSubscriptionStore();

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (isLoadingEvents) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (eventsError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{eventsError}</AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CircleDot className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No subscription events yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Events will appear here as your subscription changes
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-96">
      <div className="p-4">
        {events.map((event, index) => (
          <TimelineItem key={event.id} event={event} index={index} />
        ))}
      </div>
    </ScrollArea>
  );
}
