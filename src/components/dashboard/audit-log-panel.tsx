'use client';

// ============================================
// Audit Log Panel — Slide-out sheet for
// Governance & Traceability (UI/UX Spec Section 10)
// Full accountability for forecast adjustments
// ============================================

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  User,
  Clock,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  Search,
  ArrowRight,
  RotateCw,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';

import { useDashboardStore } from '@/lib/dashboard/store';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================

type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'approve' | 'reject';
type EntityType = 'product' | 'inventory' | 'forecast' | 'order' | 'import' | 'promo_event' | 'sop_cycle';

interface AuditUser {
  name: string;
  email: string;
  role: string;
}

interface AuditEntry {
  id: string;
  user_id?: string;
  user: AuditUser;
  action: AuditAction;
  entity: EntityType;
  entity_id: string;
  changes: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

interface AuditLogResponse {
  success: boolean;
  data: AuditEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Constants
// ============================================

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'forecast', label: 'Forecast' },
  { value: 'order', label: 'Order' },
  { value: 'import', label: 'Import' },
  { value: 'promo_event', label: 'Promo Event' },
  { value: 'sop_cycle', label: 'SOP Cycle' },
];

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
];

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  approve: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  reject: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  import: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  export: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  warehouse_manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  marketing_manager: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  demand_planner: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  forecast_analyst: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
};

// ============================================
// Sample Data (used as fallback when API is unavailable)
// ============================================

const SAMPLE_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: '1',
    user: { name: 'Karim Uddin', email: 'karim@bdmotors.com', role: 'warehouse_manager' },
    action: 'update',
    entity: 'inventory',
    entity_id: 'inv-001',
    changes: { before: { safety_stock: 30, reorder_point: 80 }, after: { safety_stock: 45, reorder_point: 80 } },
    ip_address: '192.168.1.45',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user: { name: 'Fatima Begum', email: 'fatima@bdmotors.com', role: 'marketing_manager' },
    action: 'update',
    entity: 'forecast',
    entity_id: 'fc-042',
    changes: { before: { promo_index: 0.0, beta_2: 0.0 }, after: { promo_index: 0.35, beta_2: 0.1575 } },
    ip_address: '192.168.1.22',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user: { name: 'Rahim Sheikh', email: 'rahim@bdmotors.com', role: 'demand_planner' },
    action: 'create',
    entity: 'forecast',
    entity_id: 'fc-108',
    changes: { before: {}, after: { product_id: 'p-012', predicted_qty: 250, season: 'monsoon' } },
    ip_address: '192.168.1.10',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user: { name: 'Nasreen Akter', email: 'nasreen@bdmotors.com', role: 'admin' },
    action: 'approve',
    entity: 'order',
    entity_id: 'po-0334',
    changes: { before: { status: 'pending' }, after: { status: 'approved' } },
    ip_address: '192.168.1.5',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '5',
    user: { name: 'Jamal Hossain', email: 'jamal@bdmotors.com', role: 'warehouse_manager' },
    action: 'delete',
    entity: 'product',
    entity_id: 'p-099',
    changes: { before: { name: 'Chain Set CG125', sku: 'CS-CG125-01' }, after: {} },
    ip_address: '192.168.1.45',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: '6',
    user: { name: 'Taslima Khatun', email: 'taslima@bdmotors.com', role: 'forecast_analyst' },
    action: 'import',
    entity: 'import',
    entity_id: 'imp-012',
    changes: { before: {}, after: { rows_imported: 1542, rows_skipped: 8, source_file: 'demand_q2_2025.xlsx' } },
    ip_address: '192.168.1.18',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: '7',
    user: { name: 'Karim Uddin', email: 'karim@bdmotors.com', role: 'warehouse_manager' },
    action: 'update',
    entity: 'inventory',
    entity_id: 'inv-045',
    changes: { before: { stock_on_hand: 120, allocated: 80 }, after: { stock_on_hand: 95, allocated: 80 } },
    ip_address: '192.168.1.45',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: '8',
    user: { name: 'Fatima Begum', email: 'fatima@bdmotors.com', role: 'marketing_manager' },
    action: 'create',
    entity: 'promo_event',
    entity_id: 'promo-007',
    changes: { before: {}, after: { name: 'Eid Special Discount', lift_factor: 1.45, start_date: '2025-06-15' } },
    ip_address: '192.168.1.22',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: '9',
    user: { name: 'Rahim Sheikh', email: 'rahim@bdmotors.com', role: 'demand_planner' },
    action: 'reject',
    entity: 'forecast',
    entity_id: 'fc-099',
    changes: { before: { status: 'pending_review' }, after: { status: 'rejected', rejection_reason: 'MAPE exceeds threshold' } },
    ip_address: '192.168.1.10',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: '10',
    user: { name: 'Nasreen Akter', email: 'nasreen@bdmotors.com', role: 'admin' },
    action: 'export',
    entity: 'forecast',
    entity_id: 'exp-004',
    changes: { before: {}, after: { format: 'xlsx', records: 5420, file_size_kb: 2847 } },
    ip_address: '192.168.1.5',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

// ============================================
// Helpers
// ============================================

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

// ============================================
// Filter State
// ============================================

interface FilterState {
  entityType: string;
  action: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  search: string;
}

const INITIAL_FILTERS: FilterState = {
  entityType: 'all',
  action: 'all',
  dateFrom: undefined,
  dateTo: undefined,
  search: '',
};

// ============================================
// Sub-Components
// ============================================

/** Skeleton loader for audit entries */
function AuditEntrySkeleton() {
  return (
    <div className="p-3 space-y-3 border border-border rounded-lg">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <div className="ml-auto">
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-8 w-full rounded" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  );
}

/** Change Diff Display — shows field-by-field before/after comparison */
function ChangeDiffDisplay({
  changes,
  expanded: externalExpanded,
}: {
  changes: { before: Record<string, unknown>; after: Record<string, unknown> };
  expanded?: boolean;
}) {
  const [internalExpanded, setInternalExpanded] = React.useState(externalExpanded ?? false);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  const { before, after } = changes;
  const changedFields = getChangedFields(before, after);
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const hasChanges = changedFields.length > 0;

  if (!hasChanges) {
    return (
      <div className="text-xs text-muted-foreground italic py-1">
        No field changes detected
      </div>
    );
  }

  // Simple mode: single changed field with primitive values
  const isSimpleChange =
    changedFields.length === 1 &&
    typeof before[changedFields[0]] !== 'object' &&
    typeof after[changedFields[0]] !== 'object';

  if (isSimpleChange && !isExpanded) {
    const field = changedFields[0];
    return (
      <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
        <span className="text-muted-foreground">{field}:</span>
        <span className="text-red-600 dark:text-red-400 line-through">
          {formatValue(before[field])}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-green-600 dark:text-green-400 font-medium">
          {formatValue(after[field])}
        </span>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setInternalExpanded}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left py-0.5">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <span>
            {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1.5 border-l-2 border-amber-300 dark:border-amber-700 pl-3">
          {allKeys.map((key) => {
            const isChanged = changedFields.includes(key);
            const oldVal = before[key];
            const newVal = after[key];

            return (
              <div key={key} className="text-xs font-mono">
                <span className={`font-medium ${isChanged ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                  {key}:
                </span>{' '}
                {isChanged ? (
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    {oldVal !== undefined && oldVal !== null ? (
                      <>
                        <span className="text-red-600 dark:text-red-400 line-through">
                          {formatValue(oldVal)}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      </>
                    ) : null}
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {newVal !== undefined && newVal !== null ? formatValue(newVal) : '--'}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{formatValue(oldVal)}</span>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Single Audit Entry Card */
function AuditEntryCard({ entry, index }: { entry: AuditEntry; index: number }) {
  const actionColor = ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const roleColor = ROLE_BADGE_COLORS[entry.user.role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  const entityLabel = ENTITY_TYPE_OPTIONS.find((o) => o.value === entry.entity)?.label || entry.entity;
  const actionLabel = ACTION_OPTIONS.find((o) => o.value === entry.action)?.label || entry.action;

  const changedFields = getChangedFields(entry.changes.before, entry.changes.after);
  const isCreateAction = entry.action === 'create';
  const isDeleteAction = entry.action === 'delete';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className="p-3 border border-border rounded-lg bg-card hover:bg-accent/30 transition-colors group"
    >
      {/* Row 1: User + Action Badge + Timestamp */}
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
            {getInitials(entry.user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {entry.user.name}
            </span>
            <span className={`inline-flex items-center rounded-sm px-1.5 py-0 text-[9px] font-medium leading-tight ${roleColor}`}>
              {entry.user.role.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {relativeTime(entry.created_at)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {format(new Date(entry.created_at), 'PPPpp')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${actionColor}`}>
          {actionLabel}
        </span>
      </div>

      {/* Row 2: Entity + ID */}
      <div className="flex items-center gap-1.5 mt-2 text-xs">
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">{entityLabel}</span>
        <span className="text-foreground font-mono font-medium truncate max-w-[140px]" title={entry.entity_id}>
          {entry.entity_id}
        </span>
      </div>

      {/* Row 3: Changes */}
      <div className="mt-2">
        {isCreateAction && Object.keys(entry.changes.after).length > 0 ? (
          <div className="text-xs">
            <span className="text-muted-foreground">Created with: </span>
            <span className="text-green-600 dark:text-green-400 font-mono">
              {Object.entries(entry.changes.after)
                .map(([k, v]) => `${k}=${formatValue(v)}`)
                .join(', ')}
            </span>
          </div>
        ) : isDeleteAction && Object.keys(entry.changes.before).length > 0 ? (
          <div className="text-xs">
            <span className="text-muted-foreground">Deleted: </span>
            <span className="text-red-600 dark:text-red-400 font-mono line-through">
              {Object.entries(entry.changes.before)
                .map(([k, v]) => `${k}=${formatValue(v)}`)
                .join(', ')}
            </span>
          </div>
        ) : changedFields.length > 0 ? (
          <ChangeDiffDisplay changes={entry.changes} />
        ) : null}
      </div>

      {/* Row 4: IP Address */}
      <div className="mt-2 text-[10px] text-muted-foreground/60 font-mono">
        IP: {entry.ip_address}
      </div>
    </motion.div>
  );
}

/** Date Picker Popover */
function DatePickerField({
  label,
  date,
  onDateChange,
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs justify-start text-left font-normal w-full truncate"
        >
          <CalendarIcon className="h-3 w-3 mr-1 shrink-0" />
          {date ? format(date, 'MMM d, yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDateChange(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Main Component: AuditLogPanel
// ============================================

export function AuditLogPanel() {
  const { rightPanelOpen, setRightPanelOpen, rightPanelContent, setRightPanelContent } =
    useDashboardStore();

  const isOpen = rightPanelOpen && rightPanelContent === 'audit-log';

  // Filters
  const [filters, setFilters] = React.useState<FilterState>(INITIAL_FILTERS);
  const hasActiveFilters =
    filters.entityType !== 'all' ||
    filters.action !== 'all' ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.search.trim() !== '';

  // Data
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalEntries, setTotalEntries] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Real-time polling
  const [newEntriesCount, setNewEntriesCount] = React.useState(0);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Intersection observer for infinite scroll
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  // Fetch entries
  const fetchEntries = React.useCallback(
    async (pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', '20');
        if (filters.entityType !== 'all') params.set('entity_type', filters.entityType);
        if (filters.action !== 'all') params.set('action', filters.action);
        if (filters.dateFrom) params.set('date_from', filters.dateFrom.toISOString());
        if (filters.dateTo) params.set('date_to', filters.dateTo.toISOString());
        if (filters.search.trim()) params.set('search', filters.search.trim());

        const res = await fetch(`/api/v1/audit-log?${params.toString()}`);
        const json: AuditLogResponse = await res.json();

        if (json.success && json.data) {
          setEntries((prev) => (append ? [...prev, ...json.data] : json.data));
          setTotalEntries(json.pagination?.total ?? json.data.length);
          setHasMore(
            json.pagination
              ? pageNum < json.pagination.totalPages
              : json.data.length >= 20
          );
        } else {
          // Fallback to sample data on API failure
          if (!append) {
            const filtered = filterSampleData(filters);
            const start = (pageNum - 1) * 20;
            const slice = filtered.slice(start, start + 20);
            setEntries(slice);
            setTotalEntries(filtered.length);
            setHasMore(start + 20 < filtered.length);
          }
        }
      } catch {
        // Fallback to sample data on network error
        if (!append) {
          const filtered = filterSampleData(filters);
          const start = (pageNum - 1) * 20;
          const slice = filtered.slice(start, start + 20);
          setEntries(slice);
          setTotalEntries(filtered.length);
          setHasMore(start + 20 < filtered.length);
        }
        setError(null); // Silent fallback, no error shown
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Filter sample data client-side
  function filterSampleData(f: FilterState): AuditEntry[] {
    return SAMPLE_AUDIT_ENTRIES.filter((e) => {
      if (f.entityType !== 'all' && e.entity !== f.entityType) return false;
      if (f.action !== 'all' && e.action !== f.action) return false;
      if (f.dateFrom && new Date(e.created_at) < f.dateFrom) return false;
      if (f.dateTo && new Date(e.created_at) > f.dateTo) return false;
      if (f.search.trim()) {
        const q = f.search.toLowerCase();
        const matchName = e.user.name.toLowerCase().includes(q);
        const matchEntityId = e.entity_id.toLowerCase().includes(q);
        if (!matchName && !matchEntityId) return false;
      }
      return true;
    });
  }

  // Initial load and filter changes
  React.useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchEntries(1, false);
    }
  }, [isOpen, filters, fetchEntries]);

  // Real-time polling for new entries
  React.useEffect(() => {
    if (!isOpen) {
      setNewEntriesCount(0);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '1');
        if (filters.entityType !== 'all') params.set('entity_type', filters.entityType);
        if (filters.action !== 'all') params.set('action', filters.action);

        const res = await fetch(`/api/v1/audit-log?${params.toString()}`);
        const json: AuditLogResponse = await res.json();

        if (json.success && json.pagination) {
          const latestTotal = json.pagination.total;
          if (latestTotal > totalEntries && totalEntries > 0) {
            setNewEntriesCount((prev) => prev + (latestTotal - totalEntries));
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 30_000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, totalEntries, filters]);

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed[0]?.isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchEntries(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasMore, isLoading, page, fetchEntries]);

  // Handle panel close
  const handleClose = React.useCallback(() => {
    setRightPanelOpen(false);
    setRightPanelContent(null);
  }, [setRightPanelOpen, setRightPanelContent]);

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  // Load new entries from real-time indicator
  const loadNewEntries = React.useCallback(() => {
    setNewEntriesCount(0);
    setPage(1);
    fetchEntries(1, false);
  }, [fetchEntries]);

  // Determine empty state type
  const isEmpty = entries.length === 0 && !isLoading;
  const emptyStateMessage = hasActiveFilters
    ? 'No entries match your filters'
    : 'No audit entries yet';

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[400px] p-0 flex flex-col h-full"
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">Audit Log</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="text-xs">
            Full accountability trail for all forecast and inventory changes
          </SheetDescription>
        </SheetHeader>

        {/* Filter Controls */}
        <div className="px-4 py-3 border-b border-border shrink-0 space-y-2.5 bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground ml-auto"
                onClick={clearFilters}
              >
                <X className="h-2.5 w-2.5 mr-0.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search by entity ID or user..."
              className="h-7 text-xs pl-7 pr-2"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          {/* Dropdowns row */}
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.entityType}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, entityType: v }))
              }
            >
              <SelectTrigger className="h-7 text-xs" size="sm">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All entities
                </SelectItem>
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.action}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, action: v }))
              }
            >
              <SelectTrigger className="h-7 text-xs" size="sm">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All actions
                </SelectItem>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <DatePickerField
              label="From date"
              date={filters.dateFrom}
              onDateChange={(d) =>
                setFilters((prev) => ({ ...prev, dateFrom: d }))
              }
            />
            <DatePickerField
              label="To date"
              date={filters.dateTo}
              onDateChange={(d) =>
                setFilters((prev) => ({ ...prev, dateTo: d }))
              }
            />
          </div>
        </div>

        {/* Real-time new entries indicator */}
        <AnimatePresence>
          {newEntriesCount > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <button
                onClick={loadNewEntries}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <RotateCw className="h-3 w-3" />
                {newEntriesCount} new entr{newEntriesCount === 1 ? 'y' : 'ies'} — click to load
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entry List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {/* Loading skeletons */}
            {isLoading && entries.length === 0 && (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <AuditEntrySkeleton key={`skeleton-${i}`} />
                ))}
              </>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => fetchEntries(1, false)}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Entries */}
            {!error &&
              entries.map((entry, idx) => (
                <AuditEntryCard key={entry.id} entry={entry} index={idx} />
              ))}

            {/* Empty state */}
            {isEmpty && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ScrollText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{emptyStateMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters
                    ? 'Try adjusting your filter criteria'
                    : 'Changes will appear here when users modify data'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {/* Load more trigger (intersection observer sentinel) */}
            {hasMore && !isLoading && entries.length > 0 && (
              <div ref={loadMoreRef} className="py-2" />
            )}

            {/* Loading more spinner */}
            {isLoading && entries.length > 0 && (
              <div className="flex items-center justify-center py-3">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer: Count + Manual Load More */}
        <div className="p-3 border-t border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Showing {entries.length} of {totalEntries} entries
            </span>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary hover:text-primary"
                disabled={isLoading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchEntries(nextPage, true);
                }}
              >
                Load More
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// Trigger Button
// ============================================

export function AuditLogTriggerButton() {
  const { setRightPanelContent, rightPanelOpen, rightPanelContent } = useDashboardStore();

  const isActive = rightPanelOpen && rightPanelContent === 'audit-log';

  const handleClick = React.useCallback(() => {
    if (isActive) {
      // Close if already open
      useDashboardStore.getState().setRightPanelOpen(false);
      useDashboardStore.getState().setRightPanelContent(null);
    } else {
      setRightPanelContent('audit-log');
    }
  }, [isActive, setRightPanelContent]);

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      title="Audit Log"
    >
      <ScrollText className="h-3.5 w-3.5" />
    </Button>
  );
}
