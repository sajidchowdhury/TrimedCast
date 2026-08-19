'use client';

// ============================================
// TrimedCast — Product Catalog Component
// Session 28: Product Catalog & Inventory Intelligence Dashboard
// ============================================

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  TrendingUp,
  AlertTriangle,
  Skull,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
  BarChart3,
  DollarSign,
  Layers,
  Tag,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type {
  Product,
  ABCClass,
  StockHealth,
  LifecycleStage,
} from '@/components/catalog/types';
import {
  formatBDT,
  getABCClasses,
  getXYZClasses,
  getLifecycleClasses,
  getStockHealthClasses,
  getDaysOfSupplyColor,
  STOCK_HEALTH_CONFIG,
  LIFECECYCLE_CONFIG,
  BD_PRODUCT_CATEGORIES,
} from '@/components/catalog/types';
import {
  useCatalogStore,
  selectFilteredProducts,
  selectTotalProducts,
  selectTotalStockValue,
  selectCriticalCount,
} from '@/stores/catalog-store';

// ─── Sort Types ──────────────────────────────────────────────

type SortField = 'name' | 'stock' | 'revenue' | 'margin' | 'turnover';
type SortDir = 'asc' | 'desc';

// ─── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

// ─── Helper: Margin color ────────────────────────────────────

function getMarginColor(margin: number): string {
  if (margin > 30) return 'text-emerald-600 dark:text-emerald-400';
  if (margin > 20) return 'text-sky-600 dark:text-sky-400';
  if (margin > 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Helper: Lifecycle label ─────────────────────────────────

function getLifecycleLabel(stage: LifecycleStage): string {
  const labels: Record<LifecycleStage, string> = {
    introduction: 'Introduction',
    growth: 'Growth',
    maturity: 'Maturity',
    decline: 'Decline',
    discontinued: 'Discontinued',
  };
  return labels[stage];
}

// ─── Helper: Stock Health label ──────────────────────────────

function getStockHealthLabel(health: StockHealth): string {
  const labels: Record<StockHealth, string> = {
    healthy: 'Healthy',
    low: 'Low',
    critical: 'Critical',
    overstock: 'Overstock',
    dead: 'Dead',
  };
  return labels[health];
}

// ─── Summary Card Component ──────────────────────────────────

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">{title}</p>
              <p className="text-lg font-bold truncate">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Product Detail Row ──────────────────────────────────────

function ProductDetailRow({ product }: { product: Product }) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t bg-muted/30"
    >
      <TableCell colSpan={11} className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Supplier:</span>{' '}
            <span className="font-medium">{product.supplier}</span>
            <span className="text-xs text-muted-foreground ml-1">({product.supplierBn})</span>
          </div>
          <div>
            <span className="text-muted-foreground">Subcategory:</span>{' '}
            <span className="font-medium">{product.subcategory}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Reorder Point:</span>{' '}
            <span className="font-medium">{product.reorderPoint}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max Stock:</span>{' '}
            <span className="font-medium">{product.maxStock}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Lead Time:</span>{' '}
            <span className="font-medium">{product.leadTimeDays} days</span>
          </div>
          <div>
            <span className="text-muted-foreground">Cost Price:</span>{' '}
            <span className="font-medium">{formatBDT(product.costPrice)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">12M Revenue:</span>{' '}
            <span className="font-medium">{formatBDT(product.totalRevenue12m)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">12M Sold:</span>{' '}
            <span className="font-medium">{product.totalSold12m.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Monthly Demand:</span>{' '}
            <span className="font-medium">{product.avgMonthlyDemand}</span>
          </div>
          <div>
            <span className="text-muted-foreground">CV:</span>{' '}
            <span className="font-medium">{product.cv.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Sold:</span>{' '}
            <span className="font-medium">{product.lastSoldDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Received:</span>{' '}
            <span className="font-medium">{product.lastReceivedDate}</span>
          </div>
        </div>
      </TableCell>
    </motion.tr>
  );
}

// ─── Mobile Product Card ─────────────────────────────────────

function MobileProductCard({
  product,
  isExpanded,
  onToggle,
}: {
  product: Product;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const healthStyle = getStockHealthClasses(product.stockHealth);
  const abcStyle = getABCClasses(product.abcClass);
  const xyzStyle = getXYZClasses(product.xyzClass);
  const lifecycleStyle = getLifecycleClasses(product.lifecycleStage);

  return (
    <motion.div variants={rowVariants}>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={onToggle}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.nameBn}</p>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            </div>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <Badge variant="outline" className={`${abcStyle.bg} ${abcStyle.text} text-[10px] px-1`}>
                {product.abcClass}
              </Badge>
              <Badge variant="outline" className={`${xyzStyle.bg} ${xyzStyle.text} text-[10px] px-1`}>
                {product.xyzClass}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div>
              <span className="text-muted-foreground">Price</span>
              <p className="font-medium">{formatBDT(product.unitPrice)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stock</span>
              <p className="font-medium">{product.stockQty}</p>
            </div>
            <div>
              <span className="text-muted-foreground">DoS</span>
              <p className={`font-medium ${getDaysOfSupplyColor(product.daysOfSupply)}`}>
                {product.daysOfSupply}d
              </p>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline" className={`${healthStyle.bg} ${healthStyle.text} text-[10px]`}>
              {getStockHealthLabel(product.stockHealth)}
            </Badge>
            <Badge variant="outline" className={`${lifecycleStyle.bg} ${lifecycleStyle.text} text-[10px]`}>
              {getLifecycleLabel(product.lifecycleStage)}
            </Badge>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t text-xs grid grid-cols-2 gap-2"
              >
                <div><span className="text-muted-foreground">Category:</span> {product.category}</div>
                <div><span className="text-muted-foreground">Turnover:</span> {product.turnoverRate}</div>
                <div><span className="text-muted-foreground">Margin:</span> <span className={getMarginColor(product.margin)}>{product.margin}%</span></div>
                <div><span className="text-muted-foreground">Supplier:</span> {product.supplier}</div>
                <div><span className="text-muted-foreground">Revenue 12M:</span> {formatBDT(product.totalRevenue12m)}</div>
                <div><span className="text-muted-foreground">CV:</span> {product.cv.toFixed(2)}</div>
                <div><span className="text-muted-foreground">Lead Time:</span> {product.leadTimeDays}d</div>
                <div><span className="text-muted-foreground">Last Sold:</span> {product.lastSoldDate}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function ProductCatalog() {
  const store = useCatalogStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Compute summary metrics ──────────────────────────────
  const summary = useMemo(() => {
    const products = store.products;
    if (products.length === 0) return null;

    const totalProducts = products.length;
    const totalStockValue = products.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
    const avgMargin = products.reduce((s, p) => s + p.margin, 0) / totalProducts;
    const criticalCount = products.filter((p) => p.stockHealth === 'critical').length;
    const deadCount = products.filter((p) => p.stockHealth === 'dead').length;

    return { totalProducts, totalStockValue, avgMargin, criticalCount, deadCount };
  }, [store.products]);

  // ── Filter and sort products ─────────────────────────────
  const filteredProducts = useMemo(() => {
    let products = selectFilteredProducts(store);

    // Sort
    products = [...products].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'stock':
          cmp = a.stockQty - b.stockQty;
          break;
        case 'revenue':
          cmp = a.totalRevenue12m - b.totalRevenue12m;
          break;
        case 'margin':
          cmp = a.margin - b.margin;
          break;
        case 'turnover':
          cmp = a.turnoverRate - b.turnoverRate;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return products;
  }, [store, sortField, sortDir]);

  // ── Sort toggle ──────────────────────────────────────────
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir(field === 'stock' ? 'asc' : 'desc');
      }
    },
    [sortField]
  );

  // ── Sort icon ────────────────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // ── Unique categories from products ──────────────────────
  const categories = useMemo(() => {
    return BD_PRODUCT_CATEGORIES.map((c) => c.name);
  }, []);

  // ── Reset filters ────────────────────────────────────────
  const resetFilters = useCallback(() => {
    store.setSearchQuery('');
    store.setCategoryFilter(null);
    store.setAbcFilter(null);
    store.setHealthFilter(null);
    store.setLifecycleFilter(null);
  }, [store]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">পণ্য ক্যাটালগ</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            {store.products.length} products
          </Badge>
        </div>
      </motion.div>

      {/* ── Summary Cards ──────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            title="Total Products"
            value={summary.totalProducts.toString()}
            icon={Package}
            iconColor="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
          />
          <SummaryCard
            title="Total Stock Value"
            value={formatBDT(summary.totalStockValue)}
            subtitle="at cost price"
            icon={DollarSign}
            iconColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            title="Avg Margin %"
            value={`${summary.avgMargin.toFixed(1)}%`}
            icon={TrendingUp}
            iconColor="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
          />
          <SummaryCard
            title="Critical Stock"
            value={summary.criticalCount.toString()}
            subtitle="requires reorder"
            icon={AlertTriangle}
            iconColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
          <SummaryCard
            title="Dead Stock"
            value={summary.deadCount.toString()}
            subtitle="no recent sales"
            icon={Skull}
            iconColor="bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400"
          />
        </div>
      )}

      {/* ── Filters Row ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name / SKU..."
                  value={store.searchQuery}
                  onChange={(e) => store.setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Category */}
              <Select
                value={store.categoryFilter ?? '__all__'}
                onValueChange={(v) => store.setCategoryFilter(v === '__all__' ? null : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ABC Class */}
              <Select
                value={store.abcFilter ?? '__all__'}
                onValueChange={(v) => store.setAbcFilter(v === '__all__' ? null : (v as ABCClass))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="ABC Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Classes</SelectItem>
                  <SelectItem value="A">A — High Value</SelectItem>
                  <SelectItem value="B">B — Medium Value</SelectItem>
                  <SelectItem value="C">C — Low Value</SelectItem>
                </SelectContent>
              </Select>

              {/* Health */}
              <Select
                value={store.healthFilter ?? '__all__'}
                onValueChange={(v) => store.setHealthFilter(v === '__all__' ? null : (v as StockHealth))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Stock Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Health</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                </SelectContent>
              </Select>

              {/* Lifecycle */}
              <Select
                value={store.lifecycleFilter ?? '__all__'}
                onValueChange={(v) => store.setLifecycleFilter(v === '__all__' ? null : (v as LifecycleStage))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Lifecycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Stages</SelectItem>
                  <SelectItem value="introduction">Introduction</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="maturity">Maturity</SelectItem>
                  <SelectItem value="decline">Decline</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Product Count ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {filteredProducts.length}
          </span>{' '}
          of {store.products.length} products
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sort by:</span>
          {(['name', 'stock', 'revenue', 'margin', 'turnover'] as SortField[]).map(
            (field) => (
              <Button
                key={field}
                variant={sortField === field ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleSort(field)}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                <SortIcon field={field} />
              </Button>
            )
          )}
        </div>
      </motion.div>

      {/* ── Desktop Table ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="hidden lg:block">
        <Card>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price (৳)</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">DoS</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>ABC</TableHead>
                  <TableHead>XYZ</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead className="text-right">Turnover</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProducts.map((product, idx) => {
                    const healthStyle = getStockHealthClasses(product.stockHealth);
                    const abcStyle = getABCClasses(product.abcClass);
                    const xyzStyle = getXYZClasses(product.xyzClass);
                    const lcStyle = getLifecycleClasses(product.lifecycleStage);
                    const isExpanded = expandedId === product.id;

                    return (
                      <motion.tr
                        key={product.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: idx * 0.02 }}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : product.id)
                        }
                      >
                        <TableCell className="font-mono text-xs">
                          {product.sku}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.nameBn}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{product.category}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatBDT(product.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {product.stockQty}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${getDaysOfSupplyColor(product.daysOfSupply)}`}
                        >
                          {product.daysOfSupply}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${healthStyle.bg} ${healthStyle.text} text-[10px] ${
                              product.stockHealth === 'critical' ? 'animate-pulse' : ''
                            }`}
                          >
                            {getStockHealthLabel(product.stockHealth)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${abcStyle.bg} ${abcStyle.text} text-[10px]`}
                          >
                            {product.abcClass}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${xyzStyle.bg} ${xyzStyle.text} text-[10px]`}
                          >
                            {product.xyzClass}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${lcStyle.bg} ${lcStyle.text} text-[10px]`}
                          >
                            {getLifecycleLabel(product.lifecycleStage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {product.turnoverRate.toFixed(1)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${getMarginColor(product.margin)}`}
                        >
                          {product.margin.toFixed(1)}%
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Expanded detail row */}
          <AnimatePresence>
            {expandedId && (
              <ProductDetailRow
                product={filteredProducts.find((p) => p.id === expandedId)!}
              />
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── Mobile Cards ───────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="lg:hidden space-y-3"
      >
        {filteredProducts.map((product) => (
          <MobileProductCard
            key={product.id}
            product={product}
            isExpanded={expandedId === product.id}
            onToggle={() =>
              setExpandedId(expandedId === product.id ? null : product.id)
            }
          />
        ))}
      </motion.div>

      {/* ── Empty state ────────────────────────────────── */}
      {filteredProducts.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products match your filters</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ProductCatalog;
