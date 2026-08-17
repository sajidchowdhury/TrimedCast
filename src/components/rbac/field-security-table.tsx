// ============================================
// TrimedCast - RBAC Field Security Table Component
// Session 16: Role-Based Access Control
// Table showing restricted fields vs roles
// ============================================

'use client';

import React from 'react';
import {
  FIELD_SECURITY,
  FINANCIAL_FIELDS,
  ROLE_LABELS,
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
import { Check, X, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Field Categories ---

interface FieldCategory {
  category: string;
  description: string;
  fields: { name: string; label: string }[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    category: 'Product Cost Fields',
    description: 'Cost and margin data visible only to roles with financial access',
    fields: [
      { name: 'unit_cost_bdt', label: 'Unit Cost (BDT)' },
      { name: 'margin_bdt', label: 'Margin (BDT)' },
      { name: 'margin_pct', label: 'Margin (%)' },
    ],
  },
  {
    category: 'Supplier Contract Fields',
    description: 'Contract terms hidden from non-procurement roles',
    fields: [
      { name: 'supplier_unit_price', label: 'Supplier Unit Price' },
      { name: 'supplier_contract_terms', label: 'Contract Terms' },
      { name: 'supplier_payment_terms', label: 'Payment Terms' },
    ],
  },
  {
    category: 'Order Value Fields',
    description: 'Financial value fields restricted from sales & marketing',
    fields: [
      { name: 'eoq_total_cost', label: 'EOQ Total Cost' },
      { name: 'po_total_value_bdt', label: 'PO Total Value (BDT)' },
      { name: 'inventory_value_bdt', label: 'Inventory Value (BDT)' },
    ],
  },
];

const RESTRICTED_ROLES: Role[] = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];

// --- Field Access Status ---

type FieldAccess = 'visible' | 'hidden' | 'masked';

function getFieldAccess(role: Role, fieldName: string): FieldAccess {
  const restricted = FIELD_SECURITY[role];
  if (!restricted || !restricted.includes(fieldName)) return 'visible';

  // Finance can see values but contract terms are hidden (not masked)
  if (role === 'finance') return 'hidden';

  // Sales & marketing: cost fields are masked (show ####)
  if (role === 'sales_manager' || role === 'marketing_manager') {
    // Contract terms are hidden, cost fields are masked
    if (fieldName.startsWith('supplier_')) return 'hidden';
    return 'masked';
  }

  return 'hidden';
}

function getFieldAccessIcon(status: FieldAccess): React.ReactNode {
  switch (status) {
    case 'visible':
      return <Check className="h-3.5 w-3.5" />;
    case 'hidden':
      return <X className="h-3.5 w-3.5" />;
    case 'masked':
      return <EyeOff className="h-3.5 w-3.5" />;
  }
}

function getFieldAccessClasses(status: FieldAccess): string {
  switch (status) {
    case 'visible':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    case 'hidden':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    case 'masked':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  }
}

function getFieldAccessLabel(status: FieldAccess): string {
  switch (status) {
    case 'visible': return 'Visible';
    case 'hidden': return 'Hidden';
    case 'masked': return 'Masked (•••)';
  }
}

// --- Props ---

interface FieldSecurityTableProps {
  /** Show Bengali labels */
  showBn?: boolean;
}

// --- Component ---

export function FieldSecurityTable({ showBn = false }: FieldSecurityTableProps) {
  const getRoleLabel = (role: Role): string => {
    if (showBn) return BENGALI_ROLE_LABELS[role] ?? ROLE_LABELS[role];
    return ROLE_LABELS[role];
  };

  // Count restricted fields per role for summary
  const restrictedCount = (role: Role): number => {
    return FIELD_SECURITY[role]?.length ?? 0;
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
            Visible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              <X className="h-3 w-3" />
            </span>
            Hidden
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <EyeOff className="h-3 w-3" />
            </span>
            Masked
          </span>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-2">
          {RESTRICTED_ROLES.map((role) => {
            const colors = ROLE_COLORS[role];
            const count = restrictedCount(role);
            return (
              <div
                key={role}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${colors.bg} ${colors.text}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${colors.dot}`} />
                <span className="font-medium">{getRoleLabel(role)}</span>
                <span className="opacity-70">({count} restricted)</span>
              </div>
            );
          })}
        </div>

        {/* Field Security Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[180px]">Field Name</TableHead>
                {RESTRICTED_ROLES.map((role) => {
                  const colors = ROLE_COLORS[role];
                  return (
                    <TableHead key={role} className="min-w-[110px] text-center">
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
              {FIELD_CATEGORIES.map((category) => (
                <React.Fragment key={category.category}>
                  {/* Category header */}
                  <TableRow className="bg-muted/30">
                    <TableCell
                      colSpan={1 + RESTRICTED_ROLES.length}
                      className="py-2"
                    >
                      <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        {category.category}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground/70">
                        — {category.description}
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Field rows */}
                  {category.fields.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell className="font-medium text-xs">
                        <div>
                          <span>{field.label}</span>
                          <span className="ml-2 text-muted-foreground font-mono text-[10px]">
                            {field.name}
                          </span>
                        </div>
                      </TableCell>
                      {RESTRICTED_ROLES.map((role) => {
                        const access = getFieldAccess(role, field.name);
                        return (
                          <TableCell key={role} className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${getFieldAccessClasses(access)} cursor-default transition-all duration-200`}
                                >
                                  {getFieldAccessIcon(access)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <span className="font-medium">{getRoleLabel(role)}</span>
                                {' → '}{field.label}: {getFieldAccessLabel(access)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Financial Fields Reference */}
        <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/30 border">
          <span className="font-medium">All financial fields:</span>{' '}
          {FINANCIAL_FIELDS.join(', ')}
        </div>
      </div>
    </TooltipProvider>
  );
}
