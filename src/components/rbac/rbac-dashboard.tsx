// ============================================
// TrimedCast - RBAC Dashboard Component
// Session 16: Role-Based Access Control
// Main RBAC management dashboard with 5 tabs
// ============================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_HIERARCHY,
  FIELD_SECURITY,
  ROLE_RATE_LIMITS,
  getAllRoles,
  type Role,
} from '@/lib/api/rbac';
import { ROLE_COLORS, BENGALI_ROLE_LABELS } from './types';
import { RoleSelector } from './role-selector';
import { PermissionMatrix } from './permission-matrix';
import { FieldSecurityTable } from './field-security-table';
import { RateLimitPanel } from './rate-limit-panel';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Users,
  FileText,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// --- Constants ---

const ALL_ROLES: Role[] = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];

// --- Governance Note Operations ---

const GOVERNANCE_OPERATIONS = [
  {
    permission: 'forecast.approve',
    label: 'Approve Forecast Results',
    description: 'Approve calculated forecast values for production planning',
  },
  {
    permission: 'forecast.update',
    label: 'Override Forecast Values',
    description: 'Manually override calculated forecast values',
  },
  {
    permission: 'sop.advance',
    label: 'Advance S&OP Stage',
    description: 'Move S&OP process to the next stage',
  },
  {
    permission: 'sop.override',
    label: 'Override S&OP Calculations',
    description: 'Manually override S&OP calculated values',
  },
  {
    permission: 'sop.approve',
    label: 'Approve S&OP Stage',
    description: 'Approve current S&OP stage for implementation',
  },
];

const MIN_NOTE_LENGTH = 10;

// --- Role Details Helpers ---

function getKeyCapabilities(role: Role): string[] {
  const perms = ROLE_PERMISSIONS[role];
  const caps: string[] = [];

  if (perms.includes('product.create') && perms.includes('product.update') && perms.includes('product.delete')) {
    caps.push('Full product CRUD');
  } else if (perms.includes('product.read')) {
    caps.push('Product read access');
  }

  if (perms.includes('inventory.create') && perms.includes('inventory.update')) {
    caps.push('Full inventory management');
  } else if (perms.includes('inventory.read')) {
    caps.push('Inventory read access');
  }

  if (perms.includes('sales_order.create') && perms.includes('sales_order.update') && perms.includes('sales_order.delete')) {
    caps.push('Full sales order CRUD');
  } else if (perms.includes('sales_order.read')) {
    caps.push('Sales order read access');
  }

  if (perms.includes('purchase_order.create') && perms.includes('purchase_order.update')) {
    caps.push('Full purchase order management');
  } else if (perms.includes('purchase_order.read')) {
    caps.push('Purchase order read access');
  }

  if (perms.includes('forecast.create') && perms.includes('forecast.update')) {
    caps.push('Full forecast management');
  } else if (perms.includes('forecast.approve')) {
    caps.push('Forecast approval authority');
  } else if (perms.includes('forecast.create')) {
    caps.push('Forecast generation');
  } else if (perms.includes('forecast.read')) {
    caps.push('Forecast read access');
  }

  if (perms.includes('promo_event.create') && perms.includes('promo_event.update') && perms.includes('promo_event.delete')) {
    caps.push('Full promo event management');
  } else if (perms.includes('promo_event.read')) {
    caps.push('Promo event read access');
  }

  if (perms.includes('sop.advance') && perms.includes('sop.approve')) {
    caps.push('S&OP advancement & approval');
  } else if (perms.includes('sop.read')) {
    caps.push('S&OP read access');
  }

  if (perms.includes('user.create') && perms.includes('user.delete')) {
    caps.push('Full user management');
  } else if (perms.includes('user.read')) {
    caps.push('User read access');
  }

  if (perms.includes('financial_data.read')) {
    caps.push('Financial data access');
  }

  if (perms.includes('audit_log.read')) {
    caps.push('Audit log access');
  }

  if (perms.includes('import.execute')) {
    caps.push('Data import capability');
  }

  return caps.slice(0, 5);
}

function getKeyRestrictions(role: Role): string[] {
  const restrictions: string[] = [];
  const restrictedFields = FIELD_SECURITY[role];

  if (role === 'finance') {
    restrictions.push('Strictly read-only — no create/update/delete');
  }

  if (role === 'executive') {
    restrictions.push('Cannot perform CRUD operations');
    restrictions.push('Approve/advance require governance notes');
  }

  if (restrictedFields.length > 0) {
    if (restrictedFields.some((f) => f.startsWith('unit_cost') || f.startsWith('margin'))) {
      restrictions.push('Cost & margin fields hidden');
    }
    if (restrictedFields.some((f) => f.startsWith('supplier_'))) {
      restrictions.push('Supplier contract details hidden');
    }
    if (restrictedFields.some((f) => f.includes('_value_') || f.includes('_cost'))) {
      restrictions.push('Order/inventory values hidden');
    }
  }

  if (role === 'sales_manager') {
    restrictions.push('No forecast generation or modification');
    restrictions.push('No promo event management');
  }

  if (role === 'marketing_manager') {
    restrictions.push('No inventory or PO management');
    restrictions.push('No supplier access');
  }

  const limits = ROLE_RATE_LIMITS[role];
  if (limits.import === 0) {
    restrictions.push('No data import capability');
  }
  if (limits.forecast === 0) {
    restrictions.push('No forecast run capability');
  }

  return restrictions.slice(0, 3);
}

// --- Permission count by action type ---

function getPermissionCounts(role: Role): { total: number; read: number; write: number; approve: number } {
  const perms = ROLE_PERMISSIONS[role];
  const read = perms.filter((p) => p.endsWith('.read')).length;
  const approve = perms.filter((p) => p.endsWith('.approve')).length;
  const write = perms.filter((p) => {
    const action = p.split('.')[1];
    return action !== 'read' && action !== 'approve' && action !== 'export';
  }).length;
  return { total: perms.length, read, write, approve };
}

// --- Main Component ---

export function RbacDashboard() {
  const [selectedRole, setSelectedRole] = useState<string>('warehouse_manager');
  const [showBn, setShowBn] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [governanceNote, setGovernanceNote] = useState('');

  const getRoleLabel = (role: Role): string => {
    if (showBn) return BENGALI_ROLE_LABELS[role] ?? ROLE_LABELS[role];
    return ROLE_LABELS[role];
  };

  const governanceNoteValid = governanceNote.trim().length >= MIN_NOTE_LENGTH;

  const currentColors = ROLE_COLORS[selectedRole as Role];

  return (
    <div className="space-y-6">
      {/* === Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground">
            TrimedCast Security Model — 5 roles, granular permissions, field-level security
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bengali toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBn(!showBn)}
            className="text-xs gap-1.5"
          >
            {showBn ? 'EN' : 'বাং'}
          </Button>
          {/* Role selector */}
          <RoleSelector
            currentRole={selectedRole}
            onRoleChange={setSelectedRole}
            showBn={showBn}
          />
          {/* Current role badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${currentColors.bg} ${currentColors.text} ${currentColors.border} border`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${currentColors.dot}`} />
            {getRoleLabel(selectedRole as Role)}
          </div>
        </div>
      </div>

      <Separator />

      {/* === Tabs === */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
          <TabsTrigger value="matrix" className="gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Permission Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Role Details</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Field Security</span>
            <span className="sm:hidden">Fields</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rate Limits</span>
            <span className="sm:hidden">Limits</span>
          </TabsTrigger>
          <TabsTrigger value="governance" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Governance</span>
            <span className="sm:hidden">Gov</span>
          </TabsTrigger>
        </TabsList>

        {/* === Tab 1: Permission Matrix === */}
        <TabsContent value="matrix" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Permission Matrix</h2>
              <Badge variant="outline" className="text-xs">
                {ALL_ROLES.length} roles × {getAllRoles().length} resource groups
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Visual overview of all permissions across roles. Highlighted column shows the currently selected role.
            </p>
            <PermissionMatrix highlightRole={selectedRole} showBn={showBn} />
          </div>
        </TabsContent>

        {/* === Tab 2: Role Details === */}
        <TabsContent value="roles" className="mt-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Role Details</h2>
            <p className="text-sm text-muted-foreground">
              Detailed breakdown of each role&apos;s capabilities, restrictions, and permission count.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ALL_ROLES.map((role) => {
                const colors = ROLE_COLORS[role];
                const hierarchy = ROLE_HIERARCHY[role];
                const counts = getPermissionCounts(role);
                const capabilities = getKeyCapabilities(role);
                const restrictions = getKeyRestrictions(role);
                const isExpanded = expandedRole === role;

                return (
                  <Card
                    key={role}
                    className={`transition-all duration-200 hover:shadow-md cursor-pointer border ${colors.border}`}
                    onClick={() => setExpandedRole(isExpanded ? null : role)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-3 w-3 rounded-full ${colors.dot}`} />
                          <CardTitle className="text-base">
                            {getRoleLabel(role)}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            L{hierarchy}
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 ${colors.bg} ${colors.text} border-0`}>
                            {counts.total} perms
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {showBn
                          ? ROLE_LABELS[role]
                          : BENGALI_ROLE_LABELS[role]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>

                      {/* Permission breakdown */}
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                          {counts.read} read
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          {counts.write} write
                        </span>
                        {counts.approve > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            {counts.approve} approve
                          </span>
                        )}
                      </div>

                      {/* Key Capabilities */}
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Key Capabilities
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {capabilities.map((cap) => (
                            <Badge
                              key={cap}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            >
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Key Restrictions */}
                      {restrictions.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Key Restrictions
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {restrictions.map((rest) => (
                              <Badge
                                key={rest}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                              >
                                <X className="h-2.5 w-2.5 mr-0.5" />
                                {rest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expand/collapse indicator */}
                      <div className="flex items-center justify-center pt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {isExpanded ? 'Collapse' : 'View all permissions'}
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </span>
                      </div>

                      {/* Expanded: full permission list */}
                      {isExpanded && (
                        <div className="pt-2 border-t space-y-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            All Permissions ({counts.total})
                          </span>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {ROLE_PERMISSIONS[role].map((perm) => {
                              const [resource, action] = perm.split('.');
                              return (
                                <div
                                  key={perm}
                                  className="flex items-center gap-2 text-xs py-0.5"
                                >
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    <Check className="h-2.5 w-2.5" />
                                  </span>
                                  <span className="font-mono text-muted-foreground">{resource}</span>
                                  <span className="text-muted-foreground/50">.</span>
                                  <span className="font-medium">{action}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Restricted fields */}
                          {FIELD_SECURITY[role].length > 0 && (
                            <div className="pt-2 space-y-1">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                Restricted Fields ({FIELD_SECURITY[role].length})
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {FIELD_SECURITY[role].map((field) => (
                                  <Badge
                                    key={field}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                                  >
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* === Tab 3: Field Security === */}
        <TabsContent value="fields" className="mt-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Field-Level Security</h2>
            <p className="text-sm text-muted-foreground">
              Which financial and contract fields are hidden or masked per role. Protects sensitive cost, margin, and contract data.
            </p>
            <FieldSecurityTable showBn={showBn} />
          </div>
        </TabsContent>

        {/* === Tab 4: Rate Limits === */}
        <TabsContent value="limits" className="mt-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Rate Limits</h2>
            <p className="text-sm text-muted-foreground">
              Per-role rate limits for API, AI, forecast, and import operations. Prevents abuse and ensures fair resource allocation.
            </p>
            <RateLimitPanel showBn={showBn} />
          </div>
        </TabsContent>

        {/* === Tab 5: Governance Rules === */}
        <TabsContent value="governance" className="mt-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Governance Rules</h2>
            <p className="text-sm text-muted-foreground">
              Operations requiring governance notes for audit trail and compliance.
            </p>

            {/* Governance policy alert */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Governance Note Policy</AlertTitle>
              <AlertDescription>
                Certain high-impact operations require a governance note explaining the rationale.
                Notes must be at least <strong>{MIN_NOTE_LENGTH} characters</strong> long.
                This ensures accountability and creates an audit trail for regulatory compliance.
              </AlertDescription>
            </Alert>

            {/* Governance operations table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="relative w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap">
                        Operation
                      </th>
                      <th className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap">
                        Permission
                      </th>
                      <th className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap">
                        Description
                      </th>
                      <th className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap">
                        Roles with Access
                      </th>
                      <th className="text-foreground h-10 px-4 text-center align-middle font-medium whitespace-nowrap">
                        Note Required
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {GOVERNANCE_OPERATIONS.map((op) => {
                      const rolesWithAccess = ALL_ROLES.filter(
                        (role) => ROLE_PERMISSIONS[role].includes(op.permission),
                      );
                      return (
                        <tr
                          key={op.permission}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-3 align-middle whitespace-nowrap font-medium">
                            {op.label}
                          </td>
                          <td className="p-3 align-middle whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {op.permission}
                            </Badge>
                          </td>
                          <td className="p-3 align-middle text-xs text-muted-foreground">
                            {op.description}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {rolesWithAccess.map((role) => {
                                const colors = ROLE_COLORS[role];
                                return (
                                  <span
                                    key={role}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${colors.bg} ${colors.text}`}
                                  >
                                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                                    {getRoleLabel(role)}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Governance note requirements summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Min Note Length</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{MIN_NOTE_LENGTH}</div>
                  <p className="text-xs text-muted-foreground">characters minimum</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Governed Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{GOVERNANCE_OPERATIONS.length}</div>
                  <p className="text-xs text-muted-foreground">require governance notes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Roles with Governed Ops</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {useMemo(() => {
                      const governedPerms = GOVERNANCE_OPERATIONS.map((op) => op.permission);
                      return ALL_ROLES.filter((role) =>
                        governedPerms.some((perm) => ROLE_PERMISSIONS[role].includes(perm)),
                      ).length;
                    }, [])}
                  </div>
                  <p className="text-xs text-muted-foreground">roles with governed access</p>
                </CardContent>
              </Card>
            </div>

            {/* Test Governance Note */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Test Governance Note Validation
                </CardTitle>
                <CardDescription className="text-xs">
                  Type a note to test if it meets the minimum length requirement ({MIN_NOTE_LENGTH} characters).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    value={governanceNote}
                    onChange={(e) => setGovernanceNote(e.target.value)}
                    placeholder={`Enter governance note (min ${MIN_NOTE_LENGTH} chars)...`}
                    className={`transition-all duration-200 ${
                      governanceNote.length > 0 && !governanceNoteValid
                        ? 'border-red-300 focus-visible:ring-red-300 dark:border-red-700'
                        : governanceNoteValid
                          ? 'border-emerald-300 focus-visible:ring-emerald-300 dark:border-emerald-700'
                          : ''
                    }`}
                  />
                  <div className={`flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${
                    governanceNote.length === 0
                      ? 'bg-muted text-muted-foreground'
                      : governanceNoteValid
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  }`}>
                    {governanceNote.length === 0 ? (
                      <FileText className="h-4 w-4" />
                    ) : governanceNoteValid ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`transition-all duration-200 ${
                    governanceNote.length === 0
                      ? 'text-muted-foreground'
                      : governanceNoteValid
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {governanceNote.length === 0
                      ? 'Waiting for input...'
                      : governanceNoteValid
                        ? '✓ Valid governance note'
                        : `✗ Note too short (${governanceNote.trim().length}/${MIN_NOTE_LENGTH} characters)`}
                  </span>
                  <span className="text-muted-foreground">
                    {governanceNote.trim().length} / {MIN_NOTE_LENGTH} chars
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
