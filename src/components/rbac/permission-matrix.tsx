// ============================================
// TrimedCast - RBAC Permission Matrix Component
// Session 16: Role-Based Access Control
// Visual grid showing all roles vs resources+actions
// ============================================

'use client';

import React from 'react';
import {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  FIELD_SECURITY,
  type Role,
} from '@/lib/api/rbac';
import { ROLE_COLORS, BENGALI_ROLE_LABELS } from './types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, Eye, Lock, AlertTriangle } from 'lucide-react';

// --- Resource Categories & Actions ---

interface ResourceGroup {
  category: string;
  resources: {
    name: string;
    key: string;
    actions: string[];
  }[];
}

const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    category: 'Products',
    resources: [
      { name: 'Product', key: 'product', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Inventory',
    resources: [
      { name: 'Inventory', key: 'inventory', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Sales Orders',
    resources: [
      { name: 'Sales Order', key: 'sales_order', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Purchase Orders',
    resources: [
      { name: 'Purchase Order', key: 'purchase_order', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Suppliers',
    resources: [
      { name: 'Supplier', key: 'supplier', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Forecasts',
    resources: [
      { name: 'Forecast', key: 'forecast', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { name: 'Forecast Settings', key: 'forecast_settings', actions: ['create', 'read', 'update', 'delete'] },
    ],
  },
  {
    category: 'Promo Events',
    resources: [
      { name: 'Promo Event', key: 'promo_event', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { name: 'Promo Index', key: 'promo_index', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'S&OP',
    resources: [
      { name: 'S&OP', key: 'sop', actions: ['read', 'advance', 'approve', 'override'] },
    ],
  },
  {
    category: 'Users',
    resources: [
      { name: 'User', key: 'user', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
    ],
  },
  {
    category: 'Audit',
    resources: [
      { name: 'Audit Log', key: 'audit_log', actions: ['read', 'export'] },
    ],
  },
  {
    category: 'Financial',
    resources: [
      { name: 'Financial Data', key: 'financial_data', actions: ['read', 'export'] },
    ],
  },
  {
    category: 'Other',
    resources: [
      { name: 'Import', key: 'import', actions: ['execute'] },
      { name: 'Dashboard', key: 'dashboard', actions: ['read'] },
      { name: 'Motorcycle Model', key: 'motorcycle_model', actions: ['create', 'read', 'update', 'delete'] },
      { name: 'Recommended Order', key: 'recommended_order', actions: ['read', 'update', 'create'] },
    ],
  },
];

const ALL_ROLES: Role[] = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];

// --- Permission Status Types ---

type PermStatus = 'full' | 'read' | 'field_restricted' | 'none' | 'conditional';

// Resources where sales_manager and marketing_manager have field-restricted read
const FIELD_RESTRICTED_RESOURCES = new Set(['product', 'inventory', 'purchase_order', 'supplier']);

function getPermissionStatus(
  role: Role,
  resourceKey: string,
  action: string,
): PermStatus {
  const perm = `${resourceKey}.${action}`;
  const rolePerms = ROLE_PERMISSIONS[role];
  const hasPerm = rolePerms.includes(perm);

  if (!hasPerm) return 'none';

  if (action === 'read') {
    // Check if this resource has field restrictions for this role
    const restrictedFields = FIELD_SECURITY[role];
    if (restrictedFields.length > 0 && FIELD_RESTRICTED_RESOURCES.has(resourceKey)) {
      // Field restriction only applies to product and inventory for sales/mkt managers
      if (
        (role === 'sales_manager' || role === 'marketing_manager') &&
        (resourceKey === 'product' || resourceKey === 'inventory' || resourceKey === 'purchase_order' || resourceKey === 'supplier')
      ) {
        return 'field_restricted';
      }
    }
    return 'read';
  }

  // For executive: approve/advance/override are conditional (require governance notes)
  if (role === 'executive' && (action === 'approve' || action === 'advance' || action === 'override')) {
    return 'conditional';
  }

  // For warehouse_manager: approve is conditional (requires governance notes for forecast/sop)
  if (role === 'warehouse_manager' && action === 'approve' && (resourceKey === 'forecast' || resourceKey === 'sop')) {
    return 'conditional';
  }

  return 'full';
}

function getStatusIcon(status: PermStatus): React.ReactNode {
  switch (status) {
    case 'full':
      return <Check className="h-3.5 w-3.5" />;
    case 'read':
      return <Eye className="h-3.5 w-3.5" />;
    case 'field_restricted':
      return <Lock className="h-3.5 w-3.5" />;
    case 'none':
      return <X className="h-3.5 w-3.5" />;
    case 'conditional':
      return <AlertTriangle className="h-3.5 w-3.5" />;
  }
}

function getStatusClasses(status: PermStatus): string {
  switch (status) {
    case 'full':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    case 'read':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400';
    case 'field_restricted':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    case 'none':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    case 'conditional':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
  }
}

function getStatusLabel(status: PermStatus): string {
  switch (status) {
    case 'full': return 'Full access';
    case 'read': return 'Read-only';
    case 'field_restricted': return 'Field-restricted read';
    case 'none': return 'No access';
    case 'conditional': return 'Conditional (governance note required)';
  }
}

// --- Props ---

interface PermissionMatrixProps {
  /** Currently highlighted role */
  highlightRole?: string;
  /** Show Bengali labels */
  showBn?: boolean;
}

// --- Component ---

export function PermissionMatrix({ highlightRole, showBn = false }: PermissionMatrixProps) {
  const getRoleLabel = (role: Role): string => {
    if (showBn) return BENGALI_ROLE_LABELS[role] ?? ROLE_LABELS[role];
    return ROLE_LABELS[role];
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Check className="h-3 w-3" />
            </span>
            Full access
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
              <Eye className="h-3 w-3" />
            </span>
            Read-only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <Lock className="h-3 w-3" />
            </span>
            Field-restricted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              <X className="h-3 w-3" />
            </span>
            No access
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
            </span>
            Conditional
          </span>
        </div>

        {/* Matrix Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[180px]">Resource</TableHead>
                <TableHead className="min-w-[60px] text-center">Action</TableHead>
                {ALL_ROLES.map((role) => {
                  const colors = ROLE_COLORS[role];
                  const isHighlighted = highlightRole === role;
                  return (
                    <TableHead
                      key={role}
                      className={`min-w-[100px] text-center transition-all duration-200 ${
                        isHighlighted ? `${colors.bg} ${colors.text} font-bold` : ''
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
                        <span className="text-xs">{getRoleLabel(role)}</span>
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESOURCE_GROUPS.map((group) => (
                <React.Fragment key={group.category}>
                  {/* Category header row */}
                  <TableRow className="bg-muted/30">
                    <TableCell
                      colSpan={2 + ALL_ROLES.length}
                      className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-2"
                    >
                      {group.category}
                    </TableCell>
                  </TableRow>
                  {/* Resource action rows */}
                  {group.resources.map((resource) =>
                    resource.actions.map((action) => {
                      const permKey = `${resource.key}.${action}`;
                      return (
                        <TableRow key={permKey}>
                          <TableCell className="sticky left-0 z-10 bg-background font-medium text-xs">
                            {resource.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {action}
                            </Badge>
                          </TableCell>
                          {ALL_ROLES.map((role) => {
                            const status = getPermissionStatus(role, resource.key, action);
                            const isHighlighted = highlightRole === role;
                            return (
                              <TableCell
                                key={role}
                                className={`text-center transition-all duration-200 ${
                                  isHighlighted ? 'ring-2 ring-inset ring-primary/30' : ''
                                }`}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${getStatusClasses(status)} cursor-default transition-all duration-200`}
                                    >
                                      {getStatusIcon(status)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <span className="font-medium">{getRoleLabel(role)}</span>
                                    {' → '}
                                    {resource.name}.{action}: {getStatusLabel(status)}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    }),
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
