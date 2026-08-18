'use client';

// ============================================
// TrimedCast — Tenant Detail Dialog
// Session 24: Multi-Tenant Admin Panel
// ============================================

import {
  Building2,
  Users,
  Package,
  DollarSign,
  Calendar,
  Clock,
  Ban,
  PlayCircle,
  TimerReset,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  type AdminTenant,
  formatBDT,
  getPlanBadgeClasses,
  getStatusBadgeClasses,
  PLAN_CONFIG,
  TENANT_STATUS_CONFIG,
  getDivisionLabel,
} from './types';

interface TenantDetailDialogProps {
  tenant: AdminTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onExtendTrial: (id: string, days: number) => void;
}

export function TenantDetailDialog({
  tenant,
  open,
  onOpenChange,
  onSuspend,
  onReactivate,
  onExtendTrial,
}: TenantDetailDialogProps) {
  if (!tenant) return null;

  const planConfig = PLAN_CONFIG[tenant.plan as keyof typeof PLAN_CONFIG];
  const statusConfig = TENANT_STATUS_CONFIG[tenant.status as keyof typeof TENANT_STATUS_CONFIG];

  const createdDate = new Date(tenant.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const trialExpiry = tenant.trialEndsAt
    ? new Date(tenant.trialEndsAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const trialDaysLeft = tenant.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {tenant.name}
          </DialogTitle>
          <DialogDescription>{tenant.acId}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getPlanBadgeClasses(tenant.plan)}`}
            >
              {planConfig?.label ?? tenant.plan}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadgeClasses(tenant.status)}`}
            >
              {statusConfig?.label ?? tenant.status}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={Building2} label="AC ID" value={tenant.acId} />
            <InfoItem icon={Building2} label="Slug" value={tenant.slug} />
            <InfoItem icon={Building2} label="Division" value={getDivisionLabel(tenant.division)} />
            <InfoItem icon={Users} label="Users" value={String(tenant.userCount)} />
            <InfoItem icon={Package} label="Products" value={tenant.productCount.toLocaleString('en-IN')} />
            <InfoItem icon={DollarSign} label="MRR" value={formatBDT(tenant.mrr)} />
          </div>

          <Separator />

          {/* Trial Info */}
          {tenant.status === 'trial' && (
            <div className="p-3 rounded-md bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-300">
                <Clock className="h-4 w-4" />
                Trial Period
              </div>
              {trialExpiry && (
                <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                  Expires: {trialExpiry}
                  {trialDaysLeft !== null && ` (${trialDaysLeft} days left)`}
                </p>
              )}
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Created: {createdDate}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* Action Buttons */}
          {tenant.status === 'active' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onSuspend(tenant.id)}
              className="gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" />
              Suspend
            </Button>
          )}
          {tenant.status === 'suspended' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onReactivate(tenant.id)}
              className="gap-1.5"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Reactivate
            </Button>
          )}
          {tenant.status === 'past_due' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onReactivate(tenant.id)}
              className="gap-1.5"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Reactivate
            </Button>
          )}
          {tenant.status === 'trial' && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtendTrial(tenant.id, 7)}
                className="gap-1.5"
              >
                <TimerReset className="h-3.5 w-3.5" />
                +7d
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtendTrial(tenant.id, 14)}
                className="gap-1.5"
              >
                <TimerReset className="h-3.5 w-3.5" />
                +14d
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtendTrial(tenant.id, 30)}
                className="gap-1.5"
              >
                <TimerReset className="h-3.5 w-3.5" />
                +30d
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm font-medium pl-4">{value}</p>
    </div>
  );
}
