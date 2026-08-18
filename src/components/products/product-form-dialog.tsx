'use client';

// ============================================
// TrimedCast - Product Form Dialog
// Session 18: Product & Supplier Management
// Create/Edit product with all BD-specific fields
// ============================================

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  MotorcycleModel,
  Supplier,
  SeasonalityOption,
} from './types';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './types';
import { MOCK_MOTORCYCLE_MODELS, MOCK_SUPPLIERS } from './types';

// --- Props ---
interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProduct?: Product | null;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<boolean>;
  suppliers?: Supplier[];
  motorcycleModels?: MotorcycleModel[];
  seasonalityTypes?: SeasonalityOption[];
}

// --- Main Component ---
export function ProductFormDialog({
  open,
  onOpenChange,
  editProduct,
  onSubmit,
  suppliers: propSuppliers,
  motorcycleModels: propModels,
  seasonalityTypes: propSeasonTypes,
}: ProductFormDialogProps) {
  const isEdit = !!editProduct;

  // Form state
  const [skuCode, setSkuCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [motorcycleModelId, setMotorcycleModelId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unitCostBdt, setUnitCostBdt] = useState('');
  const [sellingPriceBdt, setSellingPriceBdt] = useState('');
  const [unit, setUnit] = useState('piece');
  const [minOrderQty, setMinOrderQty] = useState('');
  const [eoq, setEoq] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [seasonType, setSeasonType] = useState('');
  const [seasonWeight, setSeasonWeight] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Dropdown data
  const [models, setModels] = useState<MotorcycleModel[]>(propModels ?? []);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(propSuppliers ?? []);
  const [seasonTypes, setSeasonTypes] = useState<SeasonalityOption[]>(propSeasonTypes ?? []);

  // Load dropdown data from API if not provided
  useEffect(() => {
    const loadModels = propModels && propModels.length > 0
      ? Promise.resolve(propModels)
      : fetch('/api/v1/motorcycle-models', { credentials: 'include' })
          .then((r) => r.json())
          .then((json) => (json.data ?? json ?? MOCK_MOTORCYCLE_MODELS) as MotorcycleModel[])
          .catch(() => MOCK_MOTORCYCLE_MODELS);
    loadModels.then(setModels);

    const loadSuppliers = propSuppliers && propSuppliers.length > 0
      ? Promise.resolve(propSuppliers)
      : fetch('/api/v1/suppliers', { credentials: 'include' })
          .then((r) => r.json())
          .then((json) => (json.data ?? json ?? MOCK_SUPPLIERS) as Supplier[])
          .catch(() => MOCK_SUPPLIERS);
    loadSuppliers.then(setSuppliersList);

    const loadSeason = propSeasonTypes && propSeasonTypes.length > 0
      ? Promise.resolve(propSeasonTypes)
      : fetch('/api/v1/seasonality-types', { credentials: 'include' })
          .then((r) => r.json())
          .then((json) => (json.data ?? json ?? []) as SeasonalityOption[])
          .catch(() => [] as SeasonalityOption[]);
    loadSeason.then(setSeasonTypes);
  }, [propModels, propSuppliers, propSeasonTypes]);

  // Prefill form when editing — wrapped in microtask to avoid cascading render lint
  useEffect(() => {
    queueMicrotask(() => {
      if (editProduct) {
        setSkuCode(editProduct.sku_code);
        setName(editProduct.name);
        setCategory(editProduct.category);
        setSubCategory(editProduct.sub_category ?? '');
        setMotorcycleModelId(editProduct.motorcycle_model?.id ?? '');
        setSupplierId(editProduct.supplier?.id ?? '');
        setUnitCostBdt(editProduct.unit_cost_bdt != null ? String(editProduct.unit_cost_bdt) : '');
        setSellingPriceBdt(editProduct.selling_price_bdt != null ? String(editProduct.selling_price_bdt) : '');
        setUnit(editProduct.unit);
        setMinOrderQty(String(editProduct.min_order_qty));
        setEoq(String(editProduct.eoq));
        setMaxStock(String(editProduct.max_stock));
        setLeadTimeDays(editProduct.lead_time_days != null ? String(editProduct.lead_time_days) : '');
        setIsSeasonal(editProduct.is_seasonal);
        setSeasonType(editProduct.season_type ?? '');
        setSeasonWeight(editProduct.season_weight ?? 1.0);
      } else {
        setSkuCode('');
        setName('');
        setCategory('');
        setSubCategory('');
        setMotorcycleModelId('');
        setSupplierId('');
        setUnitCostBdt('');
        setSellingPriceBdt('');
        setUnit('piece');
        setMinOrderQty('50');
        setEoq('200');
        setMaxStock('1000');
        setLeadTimeDays('30');
        setIsSeasonal(false);
        setSeasonType('');
        setSeasonWeight(1.0);
      }
      setValidationError('');
    });
  }, [editProduct, open]);

  // Auto-generate SKU suggestion
  const generateSkuSuggestion = () => {
    const catPrefix = category ? category.substring(0, 2).toUpperCase() : 'XX';
    const namePrefix = name ? name.substring(0, 3).toUpperCase() : 'NEW';
    const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `${catPrefix}-${namePrefix}-${num}`;
  };

  // Validate
  const validate = (): boolean => {
    if (!skuCode.trim()) {
      setValidationError('SKU Code is required');
      return false;
    }
    if (!name.trim()) {
      setValidationError('Product Name is required');
      return false;
    }
    if (!category) {
      setValidationError('Category is required');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    const data: CreateProductInput | UpdateProductInput = {
      sku_code: skuCode,
      name,
      category,
      sub_category: subCategory || undefined,
      motorcycle_model_id: motorcycleModelId || undefined,
      supplier_id: supplierId || undefined,
      unit_cost_bdt: unitCostBdt ? Number(unitCostBdt) : undefined,
      selling_price_bdt: sellingPriceBdt ? Number(sellingPriceBdt) : undefined,
      unit: unit || undefined,
      min_order_qty: minOrderQty ? Number(minOrderQty) : undefined,
      eoq: eoq ? Number(eoq) : undefined,
      max_stock: maxStock ? Number(maxStock) : undefined,
      lead_time_days: leadTimeDays ? Number(leadTimeDays) : undefined,
      is_seasonal: isSeasonal,
      season_type: isSeasonal && seasonType ? seasonType : undefined,
      season_weight: isSeasonal ? seasonWeight : undefined,
    };

    const success = await onSubmit(data);
    setIsSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update product details below.'
              : 'Fill in product details for the BD motorcycle parts catalog.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Validation Error */}
          {validationError && (
            <div className="p-2 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
              {validationError}
            </div>
          )}

          {/* Row: SKU + Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku-code" className="text-xs">
                SKU Code <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-1">
                <Input
                  id="sku-code"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="EP-HON-001"
                  className="h-8 text-sm font-mono"
                />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] shrink-0"
                    onClick={() => setSkuCode(generateSkuSuggestion())}
                  >
                    Auto
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-name" className="text-xs">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Honda Piston Ring Set"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Row: Category + Sub-category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-category" className="text-xs">Sub-category</Label>
              <Input
                id="sub-category"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="piston, pads, etc."
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Row: Motorcycle Model + Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Motorcycle Model</Label>
              <Select value={motorcycleModelId} onValueChange={setMotorcycleModelId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.brand} {m.model} {m.ccRating ? `(${m.ccRating}cc)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Unit Cost + Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit-cost" className="text-xs">Unit Cost (BDT)</Label>
              <Input
                id="unit-cost"
                type="number"
                value={unitCostBdt}
                onChange={(e) => setUnitCostBdt(e.target.value)}
                placeholder="850"
                min="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="selling-price" className="text-xs">Selling Price (BDT)</Label>
              <Input
                id="selling-price"
                type="number"
                value={sellingPriceBdt}
                onChange={(e) => setSellingPriceBdt(e.target.value)}
                placeholder="1200"
                min="0"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Row: Unit + Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-time" className="text-xs">Lead Time (days)</Label>
              <Input
                id="lead-time"
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="30"
                min="0"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Row: Min Order Qty + EOQ + Max Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-order-qty" className="text-xs">Min Order Qty</Label>
              <Input
                id="min-order-qty"
                type="number"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
                min="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eoq" className="text-xs">EOQ</Label>
              <Input
                id="eoq"
                type="number"
                value={eoq}
                onChange={(e) => setEoq(e.target.value)}
                min="0"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-stock" className="text-xs">Max Stock</Label>
              <Input
                id="max-stock"
                type="number"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                min="0"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Seasonal toggle */}
          <div className="flex items-center gap-3 border rounded-md p-3">
            <Switch
              checked={isSeasonal}
              onCheckedChange={setIsSeasonal}
              id="is-seasonal"
            />
            <Label htmlFor="is-seasonal" className="text-sm cursor-pointer">
              Seasonal Product
            </Label>
          </div>

          {/* Seasonality fields (only when seasonal) */}
          {isSeasonal && (
            <div className="space-y-3 border rounded-md p-3 bg-amber-50/50 dark:bg-amber-500/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Seasonality Type</Label>
                  <Select value={seasonType} onValueChange={setSeasonType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonTypes.map((st) => (
                        <SelectItem key={st.id} value={st.name}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Season Weight: {seasonWeight.toFixed(1)}
                  </Label>
                  <Slider
                    value={[seasonWeight]}
                    onValueChange={([v]) => setSeasonWeight(v)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0.1</span>
                    <span>3.0</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
