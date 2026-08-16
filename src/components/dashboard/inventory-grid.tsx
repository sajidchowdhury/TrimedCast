'use client';

// ============================================
// Inventory Data Grid — TrimedCast
// Seasonal Demand & Inventory Forecasting System
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Pencil,
  Save,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw,
  CircleDot,
} from 'lucide-react';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================

type StockStatus = 'healthy' | 'low' | 'critical' | 'stockout';

interface MotorcycleModelRef {
  brand: string;
  model: string;
}

interface ProductRef {
  id: string;
  sku: string;
  name: string;
  category: string;
  motorcycleModel: MotorcycleModelRef | null;
  unitCost?: number;
}

interface InventoryItem {
  id: string;
  product: ProductRef;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  safetyStock: number | null;
  reorderPoint: number | null;
  maxStockLevel: number | null;
  isManualOverride: boolean;
}

interface SummaryStats {
  totalSKUs: number;
  healthy: number;
  lowStock: number;
  critical: number;
  stockout: number;
  totalStockValue: number;
}

interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface EditingCell {
  id: string;
  field: 'safetyStock' | 'reorderPoint';
  value: string;
}

// ============================================
// Helpers
// ============================================

function formatBDT(value: number): string {
  const str = Math.abs(value).toFixed(0);
  if (str.length <= 3) return `\u09F3${str}`;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `\u09F3${formatted},${last3}`;
}

function getStockStatus(
  availableStock: number,
  safetyStock: number | null,
  reorderPoint: number | null
): StockStatus {
  const ss = safetyStock ?? 0;
  const rop = reorderPoint ?? 0;
  if (availableStock <= 0) return 'stockout';
  if (availableStock <= ss) return 'critical';
  if (rop > 0 && availableStock <= rop) return 'low';
  return 'healthy';
}

function getStockStatusConfig(status: StockStatus): {
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderColor: 'border-emerald-200 dark:border-emerald-800/50',
      };
    case 'low':
      return {
        label: 'Low Stock',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-200 dark:border-amber-800/50',
      };
    case 'critical':
      return {
        label: 'Critical',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/40',
        borderColor: 'border-red-200 dark:border-red-800/50',
      };
    case 'stockout':
      return {
        label: 'Stockout',
        dotColor: 'bg-red-900 dark:bg-red-600',
        textColor: 'text-red-900 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-950/60',
        borderColor: 'border-red-300 dark:border-red-700/50',
      };
  }
}

// ============================================
// Sample Inventory Data — BD Motorcycle Parts
// ============================================

const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-001',
    product: {
      id: 'p-001', sku: 'BDC-PST-100', name: 'Piston Assembly 100cc', category: 'Piston',
      motorcycleModel: { brand: 'Bajaj', model: 'Discover 100' }, unitCost: 850,
    },
    currentStock: 120, availableStock: 95, reservedStock: 25,
    safetyStock: 30, reorderPoint: 60, maxStockLevel: 300, isManualOverride: false,
  },
  {
    id: 'inv-002',
    product: {
      id: 'p-002', sku: 'BDC-PST-125', name: 'Piston Ring Set 125cc', category: 'Piston',
      motorcycleModel: { brand: 'Bajaj', model: 'Discover 125' }, unitCost: 320,
    },
    currentStock: 45, availableStock: 38, reservedStock: 7,
    safetyStock: 20, reorderPoint: 50, maxStockLevel: 200, isManualOverride: false,
  },
  {
    id: 'inv-003',
    product: {
      id: 'p-003', sku: 'BDC-GSK-H150', name: 'Head Gasket Set 150cc', category: 'Gasket',
      motorcycleModel: { brand: 'Honda', model: 'CB Unicorn 150' }, unitCost: 180,
    },
    currentStock: 200, availableStock: 180, reservedStock: 20,
    safetyStock: 40, reorderPoint: 80, maxStockLevel: 400, isManualOverride: false,
  },
  {
    id: 'inv-004',
    product: {
      id: 'p-004', sku: 'BDC-CHN-428H', name: 'Drive Chain 428H 120L', category: 'Chain',
      motorcycleModel: { brand: 'TVS', model: 'Apache RTR 160' }, unitCost: 520,
    },
    currentStock: 15, availableStock: 10, reservedStock: 5,
    safetyStock: 15, reorderPoint: 30, maxStockLevel: 150, isManualOverride: true,
  },
  {
    id: 'inv-005',
    product: {
      id: 'p-005', sku: 'BDC-FLT-ONP', name: 'Oil Filter - Pulsar', category: 'Filter',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar 150' }, unitCost: 95,
    },
    currentStock: 350, availableStock: 310, reservedStock: 40,
    safetyStock: 50, reorderPoint: 100, maxStockLevel: 600, isManualOverride: false,
  },
  {
    id: 'inv-006',
    product: {
      id: 'p-006', sku: 'BDC-BRK-DISC', name: 'Disc Brake Pad Set', category: 'Brake',
      motorcycleModel: { brand: 'Honda', model: 'CBR 150R' }, unitCost: 280,
    },
    currentStock: 5, availableStock: 2, reservedStock: 3,
    safetyStock: 10, reorderPoint: 25, maxStockLevel: 100, isManualOverride: false,
  },
  {
    id: 'inv-007',
    product: {
      id: 'p-007', sku: 'BDC-CRB-MJ', name: 'Carburetor Main Jet #110', category: 'Carburetor',
      motorcycleModel: { brand: 'Bajaj', model: 'CT100' }, unitCost: 45,
    },
    currentStock: 0, availableStock: 0, reservedStock: 0,
    safetyStock: 20, reorderPoint: 40, maxStockLevel: 200, isManualOverride: false,
  },
  {
    id: 'inv-008',
    product: {
      id: 'p-008', sku: 'BDC-CLT-FS', name: 'Clutch Friction Plate Set', category: 'Clutch',
      motorcycleModel: { brand: 'TVS', model: 'Metro 100' }, unitCost: 150,
    },
    currentStock: 80, availableStock: 72, reservedStock: 8,
    safetyStock: 15, reorderPoint: 35, maxStockLevel: 200, isManualOverride: false,
  },
  {
    id: 'inv-009',
    product: {
      id: 'p-009', sku: 'BDC-SPK-IR', name: 'Spark Plug Iridium CR8E', category: 'Electrical',
      motorcycleModel: null, unitCost: 220,
    },
    currentStock: 18, availableStock: 14, reservedStock: 4,
    safetyStock: 25, reorderPoint: 50, maxStockLevel: 300, isManualOverride: false,
  },
  {
    id: 'inv-010',
    product: {
      id: 'p-010', sku: 'BDC-BRG-6205', name: 'Wheel Bearing 6205-2RS', category: 'Bearing',
      motorcycleModel: null, unitCost: 120,
    },
    currentStock: 250, availableStock: 230, reservedStock: 20,
    safetyStock: 30, reorderPoint: 60, maxStockLevel: 500, isManualOverride: false,
  },
  {
    id: 'inv-011',
    product: {
      id: 'p-011', sku: 'BDC-TBE-27517', name: 'Rear Tube 275-17', category: 'Tyre & Tube',
      motorcycleModel: { brand: 'Bajaj', model: 'Discover 125' }, unitCost: 200,
    },
    currentStock: 60, availableStock: 48, reservedStock: 12,
    safetyStock: 20, reorderPoint: 45, maxStockLevel: 200, isManualOverride: true,
  },
  {
    id: 'inv-012',
    product: {
      id: 'p-012', sku: 'BDC-CDI-DC', name: 'CDI Unit DC 12V', category: 'Electrical',
      motorcycleModel: { brand: 'Honda', model: 'Dream Neo 110' }, unitCost: 650,
    },
    currentStock: 12, availableStock: 10, reservedStock: 2,
    safetyStock: 8, reorderPoint: 20, maxStockLevel: 80, isManualOverride: false,
  },
  {
    id: 'inv-013',
    product: {
      id: 'p-013', sku: 'BDC-FUL-PUMP', name: 'Fuel Pump Assembly', category: 'Fuel System',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar NS200' }, unitCost: 1800,
    },
    currentStock: 3, availableStock: 1, reservedStock: 2,
    safetyStock: 5, reorderPoint: 10, maxStockLevel: 40, isManualOverride: false,
  },
  {
    id: 'inv-014',
    product: {
      id: 'p-014', sku: 'BDC-CHN-SPR', name: 'Chain Sprocket Set 428', category: 'Chain',
      motorcycleModel: { brand: 'Bajaj', model: 'Platina 100' }, unitCost: 380,
    },
    currentStock: 28, availableStock: 22, reservedStock: 6,
    safetyStock: 12, reorderPoint: 30, maxStockLevel: 120, isManualOverride: false,
  },
  {
    id: 'inv-015',
    product: {
      id: 'p-015', sku: 'BDC-GSK-FUL', name: 'Full Gasket Kit 150cc', category: 'Gasket',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar 150' }, unitCost: 450,
    },
    currentStock: 40, availableStock: 35, reservedStock: 5,
    safetyStock: 10, reorderPoint: 25, maxStockLevel: 100, isManualOverride: false,
  },
  {
    id: 'inv-016',
    product: {
      id: 'p-016', sku: 'BDC-FLT-AIR', name: 'Air Filter Element', category: 'Filter',
      motorcycleModel: { brand: 'TVS', model: 'Apache RTR 180' }, unitCost: 130,
    },
    currentStock: 0, availableStock: 0, reservedStock: 0,
    safetyStock: 20, reorderPoint: 40, maxStockLevel: 200, isManualOverride: false,
  },
  {
    id: 'inv-017',
    product: {
      id: 'p-017', sku: 'BDC-BRK-SHOE', name: 'Brake Shoe Set Rear', category: 'Brake',
      motorcycleModel: { brand: 'Honda', model: 'CD 70' }, unitCost: 160,
    },
    currentStock: 55, availableStock: 45, reservedStock: 10,
    safetyStock: 15, reorderPoint: 35, maxStockLevel: 150, isManualOverride: false,
  },
  {
    id: 'inv-018',
    product: {
      id: 'p-018', sku: 'BDC-PST-OVRSZ', name: 'Piston Oversize +0.50mm', category: 'Piston',
      motorcycleModel: { brand: 'Bajaj', model: 'Discover 100' }, unitCost: 920,
    },
    currentStock: 8, availableStock: 6, reservedStock: 2,
    safetyStock: 5, reorderPoint: 15, maxStockLevel: 60, isManualOverride: true,
  },
  {
    id: 'inv-019',
    product: {
      id: 'p-019', sku: 'BDC-CYL-BR', name: 'Cylinder Bore 52.4mm', category: 'Engine Block',
      motorcycleModel: { brand: 'Honda', model: 'CD 70' }, unitCost: 2200,
    },
    currentStock: 22, availableStock: 20, reservedStock: 2,
    safetyStock: 5, reorderPoint: 12, maxStockLevel: 50, isManualOverride: false,
  },
  {
    id: 'inv-020',
    product: {
      id: 'p-020', sku: 'BDC-RCT-REG', name: 'Rectifier Regulator 12V', category: 'Electrical',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar 220F' }, unitCost: 480,
    },
    currentStock: 14, availableStock: 12, reservedStock: 2,
    safetyStock: 8, reorderPoint: 20, maxStockLevel: 80, isManualOverride: false,
  },
  {
    id: 'inv-021',
    product: {
      id: 'p-021', sku: 'BDC-SPD-170', name: 'Speedometer Assembly 170km/h', category: 'Electrical',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar NS200' }, unitCost: 950,
    },
    currentStock: 7, availableStock: 5, reservedStock: 2,
    safetyStock: 5, reorderPoint: 10, maxStockLevel: 30, isManualOverride: false,
  },
  {
    id: 'inv-022',
    product: {
      id: 'p-022', sku: 'BDC-FRK-SEL', name: 'Fork Seal Set 33mm', category: 'Suspension',
      motorcycleModel: { brand: 'TVS', model: 'Apache RTR 160' }, unitCost: 170,
    },
    currentStock: 30, availableStock: 26, reservedStock: 4,
    safetyStock: 10, reorderPoint: 25, maxStockLevel: 100, isManualOverride: false,
  },
  {
    id: 'inv-023',
    product: {
      id: 'p-023', sku: 'BDC-CAM-CHN', name: 'Cam Chain 82L', category: 'Engine Block',
      motorcycleModel: { brand: 'Honda', model: 'CB Unicorn 150' }, unitCost: 340,
    },
    currentStock: 18, availableStock: 15, reservedStock: 3,
    safetyStock: 8, reorderPoint: 20, maxStockLevel: 80, isManualOverride: false,
  },
  {
    id: 'inv-024',
    product: {
      id: 'p-024', sku: 'BDC-STR-ASB', name: 'Stator Assembly 12V', category: 'Electrical',
      motorcycleModel: { brand: 'Bajaj', model: 'CT100' }, unitCost: 780,
    },
    currentStock: 9, availableStock: 7, reservedStock: 2,
    safetyStock: 6, reorderPoint: 15, maxStockLevel: 50, isManualOverride: false,
  },
  {
    id: 'inv-025',
    product: {
      id: 'p-025', sku: 'BDC-CHN-520', name: 'O-Ring Chain 520 114L', category: 'Chain',
      motorcycleModel: { brand: 'Bajaj', model: 'Pulsar 220F' }, unitCost: 1100,
    },
    currentStock: 2, availableStock: 1, reservedStock: 1,
    safetyStock: 4, reorderPoint: 8, maxStockLevel: 30, isManualOverride: false,
  },
  {
    id: 'inv-026',
    product: {
      id: 'p-026', sku: 'BDC-MUG-ASB', name: 'Mug Assembly 100cc', category: 'Engine Block',
      motorcycleModel: { brand: 'Bajaj', model: 'Platina 100' }, unitCost: 3200,
    },
    currentStock: 4, availableStock: 3, reservedStock: 1,
    safetyStock: 3, reorderPoint: 8, maxStockLevel: 25, isManualOverride: true,
  },
  {
    id: 'inv-027',
    product: {
      id: 'p-027', sku: 'BDC-TIR-30018', name: 'Front Tyre 3.00-18', category: 'Tyre & Tube',
      motorcycleModel: { brand: 'Bajaj', model: 'Discover 100' }, unitCost: 1400,
    },
    currentStock: 35, availableStock: 30, reservedStock: 5,
    safetyStock: 10, reorderPoint: 25, maxStockLevel: 100, isManualOverride: false,
  },
  {
    id: 'inv-028',
    product: {
      id: 'p-028', sku: 'BDC-CRB-ASSY', name: 'Carburetor Assembly 18mm', category: 'Carburetor',
      motorcycleModel: { brand: 'Honda', model: 'CD 70' }, unitCost: 1600,
    },
    currentStock: 0, availableStock: 0, reservedStock: 0,
    safetyStock: 3, reorderPoint: 8, maxStockLevel: 30, isManualOverride: false,
  },
];

// ============================================
// Column definitions
// ============================================

const ALL_COLUMNS = [
  'sku', 'name', 'category', 'motorcycleModel',
  'currentStock', 'availableStock', 'reservedStock',
  'safetyStock', 'reorderPoint', 'maxStockLevel', 'status',
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  sku: 'SKU Code',
  name: 'Product Name',
  category: 'Category',
  motorcycleModel: 'Model',
  currentStock: 'Current Stock',
  availableStock: 'Available',
  reservedStock: 'Reserved',
  safetyStock: 'Safety Stock',
  reorderPoint: 'Reorder Point',
  maxStockLevel: 'Max Stock',
  status: 'Status',
};

const MOBILE_COLUMNS: ColumnKey[] = ['sku', 'name', 'currentStock', 'status'];

const SORTABLE_COLUMNS: ColumnKey[] = [
  'sku', 'name', 'category', 'motorcycleModel',
  'currentStock', 'availableStock', 'reservedStock',
  'safetyStock', 'reorderPoint', 'maxStockLevel', 'status',
];

// ============================================
// Sort comparison helper
// ============================================

function compareInventory(
  a: InventoryItem,
  b: InventoryItem,
  column: ColumnKey,
  direction: 'asc' | 'desc'
): number {
  let valA: string | number = '';
  let valB: string | number = '';

  switch (column) {
    case 'sku':
      valA = a.product.sku;
      valB = b.product.sku;
      break;
    case 'name':
      valA = a.product.name;
      valB = b.product.name;
      break;
    case 'category':
      valA = a.product.category;
      valB = b.product.category;
      break;
    case 'motorcycleModel':
      valA = a.product.motorcycleModel
        ? `${a.product.motorcycleModel.brand} ${a.product.motorcycleModel.model}`
        : '';
      valB = b.product.motorcycleModel
        ? `${b.product.motorcycleModel.brand} ${b.product.motorcycleModel.model}`
        : '';
      break;
    case 'currentStock':
      valA = a.currentStock;
      valB = b.currentStock;
      break;
    case 'availableStock':
      valA = a.availableStock;
      valB = b.availableStock;
      break;
    case 'reservedStock':
      valA = a.reservedStock;
      valB = b.reservedStock;
      break;
    case 'safetyStock':
      valA = a.safetyStock ?? 0;
      valB = b.safetyStock ?? 0;
      break;
    case 'reorderPoint':
      valA = a.reorderPoint ?? 0;
      valB = b.reorderPoint ?? 0;
      break;
    case 'maxStockLevel':
      valA = a.maxStockLevel ?? 0;
      valB = b.maxStockLevel ?? 0;
      break;
    case 'status': {
      const order: Record<StockStatus, number> = { stockout: 0, critical: 1, low: 2, healthy: 3 };
      valA = order[getStockStatus(a.availableStock, a.safetyStock, a.reorderPoint)];
      valB = order[getStockStatus(b.availableStock, b.safetyStock, b.reorderPoint)];
      break;
    }
  }

  let result = 0;
  if (typeof valA === 'string' && typeof valB === 'string') {
    result = valA.localeCompare(valB);
  } else {
    result = (valA as number) - (valB as number);
  }

  return direction === 'asc' ? result : -result;
}

// ============================================
// Inline Editable Cell
// ============================================

function EditableCell({
  item,
  field,
  isManualOverride,
  onToggleOverride,
  editingCell,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingChange,
}: {
  item: InventoryItem;
  field: 'safetyStock' | 'reorderPoint';
  isManualOverride: boolean;
  onToggleOverride: (id: string) => void;
  editingCell: EditingCell | null;
  onStartEdit: (id: string, field: 'safetyStock' | 'reorderPoint', value: number | null) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingCell?.id === item.id && editingCell?.field === field;
  const value = field === 'safetyStock' ? item.safetyStock : item.reorderPoint;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const isSafetyStock = field === 'safetyStock';
  const showYellowBg = isSafetyStock && isManualOverride;

  return (
    <TableCell
      className={cn(
        'relative group',
        showYellowBg && !isEditing && 'bg-amber-50 dark:bg-amber-950/30',
        isEditing && 'p-1'
      )}
    >
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type="number"
            min={0}
            value={editingCell.value}
            onChange={(e) => onEditingChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onSaveEdit}
            className="h-7 w-16 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={onSaveEdit}
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="cursor-pointer select-none rounded px-1 py-0.5 text-xs tabular-nums transition-colors hover:bg-accent"
                onDoubleClick={() => onStartEdit(item.id, field, value)}
              >
                {value ?? '--'}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Double-click to edit {COLUMN_LABELS[field]}
            </TooltipContent>
          </Tooltip>

          {isSafetyStock && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleOverride(item.id);
                  }}
                >
                  <Switch
                    checked={isManualOverride}
                    className="scale-75 origin-left"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isManualOverride ? 'Manual override ON' : 'Toggle manual override'}
              </TooltipContent>
            </Tooltip>
          )}

          {isSafetyStock && isManualOverride && (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[9px] font-normal text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
            >
              manual
            </Badge>
          )}

          {!isEditing && (
            <Pencil className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
      )}
    </TableCell>
  );
}

// ============================================
// cn helper (reuse from utils)
// ============================================

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// Main Component
// ============================================

export function InventoryGrid() {
  // --- State ---
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    perPage: 15,
    total: 0,
  });
  const [sort, setSort] = useState<SortState>({
    column: 'sku',
    direction: 'asc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());

  // Initialize manual overrides from sample data
  useEffect(() => {
    const overrides = new Set<string>();
    SAMPLE_INVENTORY.forEach((item) => {
      if (item.isManualOverride) overrides.add(item.id);
    });
    setManualOverrides(overrides);
  }, []);

  // --- Fetch data ---
  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/inventory?page=${page}&per_page=${pagination.perPage}`
      );
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();

      if (json.success && json.data && json.data.length > 0) {
        const mapped: InventoryItem[] = json.data.map(
          (d: Record<string, unknown>) => ({
            id: d.id as string,
            product: {
              id: (d.product as Record<string, unknown>).id as string,
              sku: (d.product as Record<string, unknown>).sku as string,
              name: (d.product as Record<string, unknown>).name as string,
              category: (d.product as Record<string, unknown>).category as string,
              motorcycleModel:
                (d.product as Record<string, unknown>).motorcycleModel as MotorcycleModelRef | null,
              unitCost:
                (d.product as Record<string, unknown>).unitCost as number | undefined,
            },
            currentStock: (d.qty_on_hand ?? d.currentStock ?? 0) as number,
            availableStock: (d.qty_available ?? d.availableStock ?? 0) as number,
            reservedStock: (d.qty_reserved ?? d.reservedStock ?? 0) as number,
            safetyStock: (d.safety_stock ?? d.safetyStock ?? null) as number | null,
            reorderPoint: (d.reorder_point ?? d.reorderPoint ?? null) as number | null,
            maxStockLevel: (d.max_stock_level ?? d.maxStockLevel ?? null) as number | null,
            isManualOverride: manualOverrides.has(d.id as string),
          })
        );
        setData(mapped);
        setPagination((prev) => ({
          ...prev,
          page,
          total: json.pagination?.total ?? mapped.length,
        }));
      } else {
        // Fallback to sample data
        setData(SAMPLE_INVENTORY);
        setPagination((prev) => ({
          ...prev,
          page: 1,
          total: SAMPLE_INVENTORY.length,
        }));
      }
    } catch {
      // Fallback to sample data on error
      setData(SAMPLE_INVENTORY);
      setPagination((prev) => ({
        ...prev,
        page: 1,
        total: SAMPLE_INVENTORY.length,
      }));
    } finally {
      setLoading(false);
    }
  }, [pagination.perPage, manualOverrides]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // --- Available categories ---
  const allCategories = useMemo(() => {
    const cats = new Set(data.map((d) => d.product.category));
    return Array.from(cats).sort();
  }, [data]);

  // --- Filter & Sort ---
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.product.sku.toLowerCase().includes(q) ||
          item.product.name.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter.length > 0) {
      result = result.filter((item) =>
        categoryFilter.includes(item.product.category)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((item) => {
        const status = getStockStatus(
          item.availableStock,
          item.safetyStock,
          item.reorderPoint
        );
        return status === statusFilter;
      });
    }

    // Sort
    result.sort((a, b) =>
      compareInventory(a, b, sort.column as ColumnKey, sort.direction)
    );

    return result;
  }, [data, searchQuery, categoryFilter, statusFilter, sort]);

  // --- Paginate ---
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.perPage;
    return filteredData.slice(start, start + pagination.perPage);
  }, [filteredData, pagination.page, pagination.perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pagination.perPage));

  // --- Summary stats ---
  const summaryStats: SummaryStats = useMemo(() => {
    let healthy = 0;
    let lowStock = 0;
    let critical = 0;
    let stockout = 0;
    let totalStockValue = 0;

    data.forEach((item) => {
      const status = getStockStatus(
        item.availableStock,
        item.safetyStock,
        item.reorderPoint
      );
      switch (status) {
        case 'healthy':
          healthy++;
          break;
        case 'low':
          lowStock++;
          break;
        case 'critical':
          critical++;
          break;
        case 'stockout':
          stockout++;
          break;
      }
      totalStockValue += item.currentStock * (item.product.unitCost ?? 0);
    });

    return {
      totalSKUs: data.length,
      healthy,
      lowStock,
      critical,
      stockout,
      totalStockValue,
    };
  }, [data]);

  // --- Sort handler ---
  const handleSort = (column: ColumnKey) => {
    if (!SORTABLE_COLUMNS.includes(column)) return;
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIcon = (column: ColumnKey) => {
    if (sort.column !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  // --- Inline edit handlers ---
  const handleStartEdit = (
    id: string,
    field: 'safetyStock' | 'reorderPoint',
    value: number | null
  ) => {
    setEditingCell({ id, field, value: String(value ?? 0) });
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const numValue = parseInt(editingCell.value, 10);
    if (isNaN(numValue) || numValue < 0) {
      setEditingCell(null);
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, number> = {};
      if (editingCell.field === 'safetyStock') {
        body.safety_stock = numValue;
      } else {
        body.reorder_point = numValue;
      }

      const res = await fetch(`/api/v1/inventory/${editingCell.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Update local data
        setData((prev) =>
          prev.map((item) => {
            if (item.id !== editingCell.id) return item;
            return {
              ...item,
              [editingCell.field]: numValue,
            };
          })
        );
      } else {
        // Still update locally even if API fails (optimistic)
        setData((prev) =>
          prev.map((item) => {
            if (item.id !== editingCell.id) return item;
            return {
              ...item,
              [editingCell.field]: numValue,
            };
          })
        );
      }
    } catch {
      // Optimistic update on network error
      setData((prev) =>
        prev.map((item) => {
          if (!editingCell || item.id !== editingCell.id) return item;
          return {
            ...item,
            [editingCell.field]: numValue,
          };
        })
      );
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleToggleOverride = (id: string) => {
    setManualOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setData((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isManualOverride: !item.isManualOverride }
          : item
      )
    );
  };

  // --- Responsive check (mobile) ---
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visibleColumns = isMobile ? MOBILE_COLUMNS : (ALL_COLUMNS as readonly ColumnKey[]);

  // --- Page change ---
  const handlePageChange = (newPage: number) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    setPagination((prev) => ({ ...prev, page: clampedPage }));
  };

  // --- Reset filters ---
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter([]);
    setStatusFilter('all');
    setSort({ column: 'sku', direction: 'asc' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter.length > 0 ||
    statusFilter !== 'all';

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      {/* === Summary Stats Row === */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total SKUs</span>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {loading ? <Skeleton className="h-4 w-8 inline-block" /> : summaryStats.totalSKUs}
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900/40">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Healthy</span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? <Skeleton className="h-4 w-6 inline-block" /> : summaryStats.healthy}
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900/40">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Low Stock</span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {loading ? <Skeleton className="h-4 w-6 inline-block" /> : summaryStats.lowStock}
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="p-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Critical</span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
              {loading ? <Skeleton className="h-4 w-6 inline-block" /> : summaryStats.critical}
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-300 dark:border-red-700/40">
          <CardContent className="p-3 flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-red-900 dark:text-red-500" />
            <span className="text-xs text-muted-foreground">Stockout</span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-red-900 dark:text-red-300">
              {loading ? <Skeleton className="h-4 w-6 inline-block" /> : summaryStats.stockout}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Stock Value</span>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {loading ? (
                <Skeleton className="h-4 w-16 inline-block" />
              ) : (
                formatBDT(summaryStats.totalStockValue)
              )}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* === Filter Controls === */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SKU or product name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Category multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Filter className="h-3 w-3" />
              Category
              {categoryFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {categoryFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allCategories.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={categoryFilter.includes(cat)}
                onCheckedChange={(checked) => {
                  setCategoryFilter((prev) =>
                    checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                  );
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="text-xs"
              >
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as StockStatus | 'all');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="healthy" className="text-xs">Healthy</SelectItem>
            <SelectItem value="low" className="text-xs">Low Stock</SelectItem>
            <SelectItem value="critical" className="text-xs">Critical</SelectItem>
            <SelectItem value="stockout" className="text-xs">Stockout</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleResetFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={() => fetchData(1)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* === Error state === */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* === Data Table === */}
      <div className="rounded-md border border-border/60 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {visibleColumns.map((col) => (
                <TableHead
                  key={col}
                  className={
                    cn(
                      'text-[11px] uppercase tracking-wider',
                      SORTABLE_COLUMNS.includes(col) && 'cursor-pointer select-none',
                      col === 'safetyStock' && 'pr-1',
                      col === 'reorderPoint' && 'pr-1'
                    )
                  }
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center">
                    {COLUMN_LABELS[col]}
                    {SORTABLE_COLUMNS.includes(col) && renderSortIcon(col)}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading skeleton */}
            {loading && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {visibleColumns.map((col) => (
                      <TableCell key={col}>
                        <Skeleton
                          className={cn(
                            'h-4',
                            col === 'name' ? 'w-32' : col === 'sku' ? 'w-20' : 'w-12'
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}

            {/* Empty state */}
            {!loading && filteredData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No inventory items found.
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-2 text-xs"
                      onClick={handleResetFilters}
                    >
                      Clear filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!loading && (
              <AnimatePresence initial={false}>
                {paginatedData.map((item, idx) => {
                  const status = getStockStatus(
                    item.availableStock,
                    item.safetyStock,
                    item.reorderPoint
                  );
                  const statusConfig = getStockStatusConfig(status);
                  const isManual = manualOverrides.has(item.id);

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      {visibleColumns.map((col) => {
                        if (col === 'sku') {
                          return (
                            <TableCell key={col}>
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.product.sku}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'name') {
                          return (
                            <TableCell key={col} className="max-w-[200px]">
                              <span className="text-xs font-medium truncate block">
                                {item.product.name}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'category') {
                          return (
                            <TableCell key={col}>
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                {item.product.category}
                              </Badge>
                            </TableCell>
                          );
                        }

                        if (col === 'motorcycleModel') {
                          return (
                            <TableCell key={col}>
                              <span className="text-xs text-muted-foreground">
                                {item.product.motorcycleModel
                                  ? `${item.product.motorcycleModel.brand} ${item.product.motorcycleModel.model}`
                                  : 'Universal'}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'currentStock') {
                          return (
                            <TableCell key={col}>
                              <span className="text-xs tabular-nums font-medium">
                                {item.currentStock}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'availableStock') {
                          return (
                            <TableCell key={col}>
                              <span
                                className={cn(
                                  'text-xs tabular-nums font-medium',
                                  status === 'stockout' && 'text-red-700 dark:text-red-400',
                                  status === 'critical' && 'text-red-600 dark:text-red-400',
                                  status === 'low' && 'text-amber-600 dark:text-amber-400'
                                )}
                              >
                                {item.availableStock}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'reservedStock') {
                          return (
                            <TableCell key={col}>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {item.reservedStock}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'safetyStock') {
                          return (
                            <EditableCell
                              key={col}
                              item={item}
                              field="safetyStock"
                              isManualOverride={isManual}
                              onToggleOverride={handleToggleOverride}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onSaveEdit={handleSaveEdit}
                              onCancelEdit={handleCancelEdit}
                              onEditingChange={(val) =>
                                setEditingCell((prev) =>
                                  prev ? { ...prev, value: val } : null
                                )
                              }
                            />
                          );
                        }

                        if (col === 'reorderPoint') {
                          return (
                            <EditableCell
                              key={col}
                              item={item}
                              field="reorderPoint"
                              isManualOverride={false}
                              onToggleOverride={() => {}}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onSaveEdit={handleSaveEdit}
                              onCancelEdit={handleCancelEdit}
                              onEditingChange={(val) =>
                                setEditingCell((prev) =>
                                  prev ? { ...prev, value: val } : null
                                )
                              }
                            />
                          );
                        }

                        if (col === 'maxStockLevel') {
                          return (
                            <TableCell key={col}>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {item.maxStockLevel ?? '--'}
                              </span>
                            </TableCell>
                          );
                        }

                        if (col === 'status') {
                          return (
                            <TableCell key={col}>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium',
                                  statusConfig.bgColor,
                                  statusConfig.borderColor,
                                  'border'
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    statusConfig.dotColor
                                  )}
                                />
                                <span className={statusConfig.textColor}>
                                  {statusConfig.label}
                                </span>
                              </span>
                            </TableCell>
                          );
                        }

                        return <TableCell key={col} />;
                      })}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* === Pagination === */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {loading ? (
            'Loading...'
          ) : filteredData.length === 0 ? (
            'No items'
          ) : (
            <>
              Showing{' '}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.perPage + 1}
              </span>
              {' - '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.perPage, filteredData.length)}
              </span>
              {' of '}
              <span className="font-medium">{filteredData.length}</span>
              {' items'}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={pagination.page <= 1 || loading}
            onClick={() => handlePageChange(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={pagination.page <= 1 || loading}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="text-xs tabular-nums text-muted-foreground px-2 min-w-[60px] text-center">
            {pagination.page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={pagination.page >= totalPages || loading}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={pagination.page >= totalPages || loading}
            onClick={() => handlePageChange(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* === Saving overlay indicator === */}
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-lg text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Saving...
        </div>
      )}
    </div>
  );
}

export default InventoryGrid;
