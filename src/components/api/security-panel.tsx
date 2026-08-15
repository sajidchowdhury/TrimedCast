'use client';

// ============================================
// SecurityPanel - Security Dashboard Component
// Shows RBAC model, field-level security,
// rate limits, audit summary, and best practices
// ============================================

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Unlock,
  Eye, EyeOff, User, Users, Activity, CheckCircle2,
  AlertTriangle, Info, Key, Gauge, FileText, Zap,
} from 'lucide-react';

// --- Static Data Model ---

const ROLES = [
  {
    key: 'warehouse_manager',
    label: 'Warehouse Manager',
    level: 1,
    type: 'admin',
    description: 'Full system access. Can manage all entities, users, imports, and approve forecasts.',
    permissions: [
      'products.crud', 'inventory.crud', 'suppliers.crud', 'motorcycle_models.crud',
      'sales_orders.crud', 'purchase_orders.crud', 'forecasts.crud', 'forecasts.approve',
      'recommended_orders.crud', 'settings.crud', 'imports.crud', 'users.manage',
      'sop_cycles.crud', 'promo_events.crud', 'audit_log.read',
    ],
    restrictedFields: [] as string[],
    rateLimits: { api: 1000, forecast: 50, import: 20 },
  },
  {
    key: 'sales_manager',
    label: 'Sales Manager',
    level: 2,
    type: 'operational',
    description: 'Can create/edit sales orders, view products and inventory, read purchase orders.',
    permissions: [
      'products.read', 'inventory.read', 'suppliers.read', 'motorcycle_models.read',
      'sales_orders.crud', 'purchase_orders.read', 'forecasts.read',
      'recommended_orders.read', 'settings.read', 'promo_events.read',
    ],
    restrictedFields: [
      'unit_cost_bdt', 'margin_bdt', 'margin_pct', 'total_cost_bdt',
      'supplier_contract_terms', 'supplier_reliability', 'supplier_lead_time',
      'purchase_history.unit_cost', 'forecast.confidence_interval',
    ],
    rateLimits: { api: 500, forecast: 20, import: 0 },
  },
  {
    key: 'marketing_manager',
    label: 'Marketing Manager',
    level: 3,
    type: 'operational',
    description: 'Can manage promo events, generate forecasts, view products and inventory.',
    permissions: [
      'products.read', 'inventory.read', 'suppliers.read',
      'forecasts.read', 'forecasts.generate', 'recommended_orders.read',
      'settings.read', 'promo_events.crud',
    ],
    restrictedFields: [
      'unit_cost_bdt', 'margin_bdt', 'margin_pct', 'total_cost_bdt',
      'supplier_contract_terms', 'supplier_reliability',
      'purchase_history.unit_cost', 'sales_orders.total_amount',
      'purchase_orders.total_amount',
    ],
    rateLimits: { api: 500, forecast: 30, import: 5 },
  },
  {
    key: 'finance',
    label: 'Finance',
    level: 4,
    type: 'read_only',
    description: 'Can view all financial data, costs, margins, supplier contracts, and audit logs.',
    permissions: [
      'products.read', 'inventory.read', 'suppliers.read',
      'sales_orders.read', 'purchase_orders.read', 'forecasts.read',
      'recommended_orders.read', 'settings.read', 'audit_log.read',
    ],
    restrictedFields: [] as string[],
    rateLimits: { api: 300, forecast: 10, import: 0 },
  },
  {
    key: 'executive',
    label: 'Executive',
    level: 5,
    type: 'read_only',
    description: 'Can view all data, approve forecasts, manage SOP cycles, and read audit logs.',
    permissions: [
      'products.read', 'inventory.read', 'suppliers.read', 'motorcycle_models.read',
      'sales_orders.read', 'purchase_orders.read', 'forecasts.read', 'forecasts.approve',
      'recommended_orders.read', 'settings.read', 'sop_cycles.crud', 'audit_log.read',
    ],
    restrictedFields: [] as string[],
    rateLimits: { api: 200, forecast: 15, import: 0 },
  },
] as const;

const FINANCIAL_FIELDS = [
  { key: 'unit_cost_bdt', label: 'Unit Cost (BDT)', category: 'Product' },
  { key: 'margin_bdt', label: 'Margin (BDT)', category: 'Product' },
  { key: 'margin_pct', label: 'Margin %', category: 'Product' },
  { key: 'total_cost_bdt', label: 'Total Cost (BDT)', category: 'Order' },
  { key: 'supplier_contract_terms', label: 'Supplier Contract Terms', category: 'Supplier' },
  { key: 'supplier_reliability', label: 'Supplier Reliability', category: 'Supplier' },
  { key: 'supplier_lead_time', label: 'Supplier Lead Time', category: 'Supplier' },
  { key: 'purchase_history.unit_cost', label: 'Purchase Unit Cost', category: 'Purchase History' },
  { key: 'sales_orders.total_amount', label: 'Sales Order Total', category: 'Sales Order' },
  { key: 'purchase_orders.total_amount', label: 'Purchase Order Total', category: 'Purchase Order' },
  { key: 'forecast.confidence_interval', label: 'Forecast Confidence Interval', category: 'Forecast' },
];

const BEST_PRACTICES = [
  {
    title: 'Principle of Least Privilege',
    description: 'Users should only have access to the minimum resources needed for their role.',
    status: 'enforced' as const,
    icon: ShieldCheck,
  },
  {
    title: 'Field-Level Data Masking',
    description: 'Sensitive financial fields are automatically hidden from non-authorized roles in API responses.',
    status: 'enforced' as const,
    icon: EyeOff,
  },
  {
    title: 'Tenant Isolation',
    description: 'All queries are scoped by tenantId. Cross-tenant data access is blocked at the API layer.',
    status: 'enforced' as const,
    icon: Lock,
  },
  {
    title: 'Audit Trail Integrity',
    description: 'All mutations (create, update, delete, approve) are logged with before/after snapshots.',
    status: 'enforced' as const,
    icon: FileText,
  },
  {
    title: 'Rate Limiting Per Role',
    description: 'API calls are rate-limited per role with configurable windows (1-hour sliding window).',
    status: 'enforced' as const,
    icon: Gauge,
  },
  {
    title: 'Separation of Duties',
    description: 'Operational roles (sales, marketing) cannot approve forecasts. Approval requires warehouse_manager or executive.',
    status: 'enforced' as const,
    icon: Users,
  },
  {
    title: 'No Password in Responses',
    description: 'Password hashes are stored in audit metadata only. API responses never include credentials.',
    status: 'enforced' as const,
    icon: Key,
  },
  {
    title: 'Immutable Audit Logs',
    description: 'Audit log entries are append-only. No update or delete operations are exposed on audit records.',
    status: 'enforced' as const,
    icon: Shield,
  },
];

// --- Helper Components ---

function RoleTypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'admin':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">Admin</Badge>;
    case 'operational':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">Operational</Badge>;
    case 'read_only':
      return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800">Read-Only</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function PermissionBadge({ perm }: { perm: string }) {
  const isCrud = perm.endsWith('.crud');
  const isRead = perm.endsWith('.read');
  const isManage = perm.endsWith('.manage');
  const isApprove = perm.endsWith('.approve');
  const isGenerate = perm.endsWith('.generate');

  if (isCrud) {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">{perm}</Badge>;
  }
  if (isApprove) {
    return <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800 text-[10px]">{perm}</Badge>;
  }
  if (isManage) {
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-[10px]">{perm}</Badge>;
  }
  if (isGenerate) {
    return <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800 text-[10px]">{perm}</Badge>;
  }
  if (isRead) {
    return <Badge variant="outline" className="text-[10px]">{perm}</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">{perm}</Badge>;
}

function HierarchyIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-3 w-2 rounded-sm ${
            i < level
              ? 'bg-emerald-500'
              : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

// --- Main Component ---

export function SecurityPanel() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Security Model</h2>
          <p className="text-sm text-muted-foreground">
            RBAC hierarchy, field-level security, rate limits & audit controls
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="roles" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />
            Field Security
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Rate Limits
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Audit Summary
          </TabsTrigger>
          <TabsTrigger value="practices" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Best Practices
          </TabsTrigger>
        </TabsList>

        {/* --- Tab: Roles & Permissions --- */}
        <TabsContent value="roles" className="space-y-4">
          {/* Role Hierarchy Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role Hierarchy
              </CardTitle>
              <CardDescription>
                5-role model with decreasing privilege levels. Admin at level 1 has full access; read-only roles at levels 4-5 have view-only access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {ROLES.map((role) => (
                  <div
                    key={role.key}
                    className="rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{role.label}</span>
                      <RoleTypeBadge type={role.type} />
                    </div>
                    <HierarchyIndicator level={role.level} />
                    <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                    <div className="flex items-center gap-1">
                      {role.restrictedFields.length === 0 ? (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Unlock className="h-2.5 w-2.5" />
                          Full field access
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600">
                          <Lock className="h-2.5 w-2.5" />
                          {role.restrictedFields.length} restricted
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Permissions Per Role */}
          {ROLES.map((role) => (
            <Card key={role.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    {role.label}
                    <RoleTypeBadge type={role.type} />
                  </CardTitle>
                  <Badge variant="outline">Level {role.level}</Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Permissions ({role.permissions.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((perm) => (
                        <PermissionBadge key={perm} perm={perm} />
                      ))}
                    </div>
                  </div>
                  {role.restrictedFields.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Restricted Fields ({role.restrictedFields.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.restrictedFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-[10px] gap-0.5 text-amber-600 border-amber-300 dark:border-amber-700">
                            <EyeOff className="h-2.5 w-2.5" />
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      API: {role.rateLimits.api}/hr
                    </span>
                    <span>Forecast: {role.rateLimits.forecast}/hr</span>
                    <span>Import: {role.rateLimits.import}/hr</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* --- Tab: Field Security --- */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Field-Level Security Matrix
              </CardTitle>
              <CardDescription>
                Which sensitive fields each role can access. Marked cells indicate the field is RESTRICTED (hidden from API responses).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Field</TableHead>
                      <TableHead className="min-w-[80px]">Category</TableHead>
                      {ROLES.map((role) => (
                        <TableHead key={role.key} className="text-center min-w-[100px]">
                          <span className="text-[10px]">{role.label}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FINANCIAL_FIELDS.map((field) => (
                      <TableRow key={field.key}>
                        <TableCell className="font-mono text-xs">{field.key}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{field.category}</Badge>
                        </TableCell>
                        {ROLES.map((role) => {
                          const isRestricted = role.restrictedFields.includes(field.key);
                          return (
                            <TableCell key={role.key} className="text-center">
                              {isRestricted ? (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px] gap-0.5">
                                  <EyeOff className="h-2.5 w-2.5" />
                                  Hidden
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] gap-0.5">
                                  <Eye className="h-2.5 w-2.5" />
                                  Visible
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Capability Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Can View Financials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const canView = role.restrictedFields.filter(f =>
                      f.includes('cost') || f.includes('margin') || f.includes('amount')
                    ).length === 0;
                    return (
                      <Badge key={role.key} variant={canView ? 'default' : 'outline'} className={canView ? 'bg-emerald-600' : ''}>
                        {role.label}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  Can View Supplier Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const canView = !role.restrictedFields.includes('supplier_contract_terms');
                    return (
                      <Badge key={role.key} variant={canView ? 'default' : 'outline'} className={canView ? 'bg-amber-600' : ''}>
                        {role.label}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-violet-600" />
                  Can Approve Forecasts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const canApprove = role.permissions.includes('forecasts.approve');
                    return (
                      <Badge key={role.key} variant={canApprove ? 'default' : 'outline'} className={canApprove ? 'bg-violet-600' : ''}>
                        {role.label}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Tab: Rate Limits --- */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Rate Limit Configuration
              </CardTitle>
              <CardDescription>
                Per-role API rate limits using a 1-hour sliding window. Limits prevent abuse while ensuring fair resource allocation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">API Calls/hr</TableHead>
                    <TableHead className="text-center">Forecast/hr</TableHead>
                    <TableHead className="text-center">Import/hr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLES.map((role) => (
                    <TableRow key={role.key}>
                      <TableCell className="font-medium">{role.label}</TableCell>
                      <TableCell><RoleTypeBadge type={role.type} /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-mono">{role.rateLimits.api}</span>
                          <Progress value={(role.rateLimits.api / 1000) * 100} className="h-1.5 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-mono">{role.rateLimits.forecast}</span>
                          <Progress value={(role.rateLimits.forecast / 50) * 100} className="h-1.5 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {role.rateLimits.import > 0 ? (
                            <>
                              <span className="text-sm font-mono">{role.rateLimits.import}</span>
                              <Progress value={(role.rateLimits.import / 20) * 100} className="h-1.5 w-16" />
                            </>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Blocked</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rate Limit Details */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  General API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ROLES.map((role) => (
                  <div key={role.key} className="flex items-center justify-between text-xs">
                    <span>{role.label}</span>
                    <span className="font-mono font-medium">{role.rateLimits.api}/hr</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-500" />
                  Forecast Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ROLES.map((role) => (
                  <div key={role.key} className="flex items-center justify-between text-xs">
                    <span>{role.label}</span>
                    <span className="font-mono font-medium">{role.rateLimits.forecast}/hr</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-pink-500" />
                  Data Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ROLES.map((role) => (
                  <div key={role.key} className="flex items-center justify-between text-xs">
                    <span>{role.label}</span>
                    <span className="font-mono font-medium">
                      {role.rateLimits.import > 0 ? `${role.rateLimits.import}/hr` : 'Blocked'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Tab: Audit Summary --- */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Audit Trail Architecture
              </CardTitle>
              <CardDescription>
                All data mutations are tracked with before/after snapshots, user context, and IP addresses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tracked Actions */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tracked Action Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {['create', 'update', 'delete', 'import', 'export', 'approve', 'reject', 'fulfill', 'status_change'].map((action) => (
                    <Badge key={action} className={
                      action === 'create' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      action === 'update' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      action === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      action === 'approve' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' :
                      action === 'reject' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                    }>
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tracked Entities */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tracked Entities</p>
                <div className="flex flex-wrap gap-1.5">
                  {['product', 'inventory', 'forecast', 'order', 'import', 'supplier', 'purchase_order', 'sales_order', 'user', 'sop_cycle', 'promo_event'].map((entity) => (
                    <Badge key={entity} variant="outline" className="text-[10px]">{entity}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Audit Data Schema */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Audit Record Fields</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { field: 'tenantId', desc: 'Tenant isolation key', required: true },
                    { field: 'userId', desc: 'Actor who performed the action', required: true },
                    { field: 'action', desc: 'Type of mutation (create/update/delete...)', required: true },
                    { field: 'entity', desc: 'Target entity type (product/inventory...)', required: true },
                    { field: 'entityId', desc: 'Specific record identifier', required: false },
                    { field: 'changes', desc: 'JSON: {before, after} snapshot', required: false },
                    { field: 'metadata', desc: 'Additional context (IP, user agent...)', required: false },
                    { field: 'ipAddress', desc: 'Client IP address', required: false },
                  ].map((item) => (
                    <div key={item.field} className="flex items-start gap-2 text-xs">
                      <code className="font-mono bg-muted px-1 py-0.5 rounded">{item.field}</code>
                      <span className="text-muted-foreground">{item.desc}</span>
                      {item.required && <Badge variant="secondary" className="text-[9px] h-4">required</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Who Can View Audit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Audit Log Access Control
              </CardTitle>
              <CardDescription>
                Only roles with audit_log.read permission can access the audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const hasAccess = role.permissions.includes('audit_log.read');
                  return (
                    <div key={role.key} className="flex items-center gap-1.5">
                      {hasAccess ? (
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <Badge variant={hasAccess ? 'default' : 'outline'} className={hasAccess ? 'bg-emerald-600' : ''}>
                        {role.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Tab: Best Practices --- */}
        <TabsContent value="practices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Security Best Practices Checklist
              </CardTitle>
              <CardDescription>
                All security controls currently enforced in the TrimedCast system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {BEST_PRACTICES.map((practice, i) => {
                const Icon = practice.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="mt-0.5 rounded-md bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
                      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{practice.title}</p>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          Enforced
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{practice.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Additional Security Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-sky-500" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Bearer token-based authentication with 24-hour expiry.</p>
                <p>Tokens are verified on every API request via Authorization header.</p>
                <p>Session tokens are stored in-memory on the server with revocation support.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Production Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Migrate from base64 tokens to signed JWT (RS256) with proper key rotation.</p>
                <p>Add bcrypt password hashing (currently base64 for demo).</p>
                <p>Implement HTTPS-only with HSTS headers.</p>
                <p>Add CSRF protection for cookie-based sessions.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
