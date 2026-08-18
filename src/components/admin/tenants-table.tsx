'use client';

// ============================================
// TrimedCast — Tenants Table
// Session 24: Multi-Tenant Admin Panel
// ============================================

import { useState } from 'react';
import { Search, Eye, Ban, PlayCircle, TimerReset } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type AdminTenant, formatBDT, getPlanBadgeClasses, getStatusBadgeClasses, PLAN_CONFIG, TENANT_STATUS_CONFIG, getDivisionLabel } from './types';
import { TenantDetailDialog } from './tenant-detail-dialog';

interface TenantsTableProps {
  tenants: AdminTenant[];
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
}

export function TenantsTable({ tenants, onSuspend, onReactivate }: TenantsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<AdminTenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.acId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Trial countdown
  function getTrialCountdown(trialEndsAt: string | null | undefined): string {
    if (!trialEndsAt) return '—';
    const days = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return `${days}d left`;
  }

  function openDetail(t: AdminTenant) {
    setSelectedTenant(t);
    setDialogOpen(true);
  }

  function handleExtendTrial(id: string, days: number) {
    // In a real app, this would call the API
    // For now, just close the dialog
    void id;
    void days;
    setDialogOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or AC ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AC ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Division</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Users</TableHead>
              <TableHead className="hidden lg:table-cell">Products</TableHead>
              <TableHead className="hidden sm:table-cell">MRR</TableHead>
              <TableHead className="hidden lg:table-cell">Trial</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((tenant) => {
                const planConfig = PLAN_CONFIG[tenant.plan as keyof typeof PLAN_CONFIG];
                const statusConfig = TENANT_STATUS_CONFIG[tenant.status as keyof typeof TENANT_STATUS_CONFIG];
                return (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(tenant)}
                  >
                    <TableCell className="font-mono text-xs">{tenant.acId}</TableCell>
                    <TableCell className="font-medium text-sm">{tenant.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {getDivisionLabel(tenant.division)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPlanBadgeClasses(tenant.plan)}`}
                      >
                        {planConfig?.label ?? tenant.plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClasses(tenant.status)}`}
                      >
                        {statusConfig?.label ?? tenant.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{tenant.userCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {tenant.productCount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-medium">
                      {formatBDT(tenant.mrr)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {getTrialCountdown(tenant.trialEndsAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDetail(tenant)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {tenant.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => onSuspend(tenant.id)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {tenant.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-emerald-600"
                            onClick={() => onReactivate(tenant.id)}
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {tenant.status === 'trial' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-sky-500 hover:text-sky-600"
                            onClick={() => openDetail(tenant)}
                          >
                            <TimerReset className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredTenants.length} of {tenants.length} tenants
      </p>

      {/* Detail Dialog */}
      <TenantDetailDialog
        tenant={selectedTenant}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuspend={onSuspend}
        onReactivate={onReactivate}
        onExtendTrial={handleExtendTrial}
      />
    </div>
  );
}
