'use client';

// ============================================
// TrimedCast - Products Dashboard
// Session 18: Product & Supplier Management
// Main dashboard with tabs, stats, CRUD flows
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  PackageCheck,
  AlertTriangle,
  Building2,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProductStore } from '@/stores/product-store';
import { useSupplierStore } from '@/stores/supplier-store';
import type {
  Product,
  Supplier,
  CreateProductInput,
  UpdateProductInput,
  CreateSupplierInput,
  UpdateSupplierInput,
} from './types';
import { MOCK_PRODUCTS, MOCK_SUPPLIERS } from './types';
import { ProductTable } from './product-table';
import { ProductFormDialog } from './product-form-dialog';
import { ProductDetailSheet } from './product-detail-sheet';
import { SupplierTable } from '@/components/suppliers/supplier-table';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { SupplierDetailSheet } from '@/components/suppliers/supplier-detail-sheet';

// --- Main Dashboard Component ---
export function ProductsDashboard() {
  // Product store
  const {
    products: storeProducts,
    isLoading: productsLoading,
    error: productError,
    searchQuery: productSearch,
    categoryFilter,
    lowStockFilter,
    activeOnly: activeOnlyProducts,
    pagination,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    setSearchQuery: setProductSearch,
    setCategoryFilter,
    setLowStockFilter,
    setActiveOnly: setActiveOnlyProducts,
    filteredProducts,
    stockSummary,
    clearError: clearProductError,
  } = useProductStore();

  // Supplier store
  const {
    suppliers: storeSuppliers,
    isLoading: suppliersLoading,
    error: supplierError,
    searchQuery: supplierSearch,
    countryFilter,
    cnyFilter,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    setSearchQuery: setSupplierSearch,
    setCountryFilter,
    setCnyFilter,
    filteredSuppliers,
    clearError: clearSupplierError,
  } = useSupplierStore();

  // Mock data fallback
  const [useMockProducts, setUseMockProducts] = useState(false);
  const [useMockSuppliers, setUseMockSuppliers] = useState(false);
  const [mockProducts, setMockProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [mockSuppliers, setMockSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);

  const products = useMockProducts ? mockProducts : storeProducts;
  const suppliers = useMockSuppliers ? mockSuppliers : storeSuppliers;

  // Local UI state
  const [activeTab, setActiveTab] = useState('products');
  const [productPage, setProductPage] = useState(1);

  // Product form/detail state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailProductOpen, setDetailProductOpen] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);

  // Supplier form/detail state
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailSupplierOpen, setDetailSupplierOpen] = useState(false);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [deleteSupplierDialogOpen, setDeleteSupplierDialogOpen] = useState(false);

  // Fetch on mount
  useEffect(() => {
    const load = async () => {
      try {
        await fetchProducts();
      } catch {
        setUseMockProducts(true);
      }
      try {
        await fetchSuppliers();
      } catch {
        setUseMockSuppliers(true);
      }
    };
    load();
  }, [fetchProducts, fetchSuppliers]);

  // Switch to mock data if API returns empty
  useEffect(() => {
    if (!productsLoading && storeProducts.length === 0 && !useMockProducts) {
      queueMicrotask(() => setUseMockProducts(true));
    }
  }, [productsLoading, storeProducts.length, useMockProducts]);

  useEffect(() => {
    if (!suppliersLoading && storeSuppliers.length === 0 && !useMockSuppliers) {
      queueMicrotask(() => setUseMockSuppliers(true));
    }
  }, [suppliersLoading, storeSuppliers.length, useMockSuppliers]);

  // --- Product Handlers ---
  const handleCreateProduct = useCallback(
    async (data: CreateProductInput | UpdateProductInput) => {
      if (useMockProducts) {
        const input = data as CreateProductInput;
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          sku_code: input.sku_code ?? '',
          name: input.name ?? '',
          category: input.category ?? 'engine_parts',
          sub_category: input.sub_category,
          season_type: input.season_type,
          motorcycle_model: null,
          supplier: null,
          unit_cost_bdt: input.unit_cost_bdt ?? null,
          selling_price_bdt: input.selling_price_bdt ?? null,
          unit: input.unit ?? 'piece',
          min_order_qty: input.min_order_qty ?? 50,
          eoq: input.eoq ?? 200,
          max_stock: input.max_stock ?? 1000,
          lead_time_days: input.lead_time_days ?? null,
          is_seasonal: input.is_seasonal ?? false,
          season_weight: input.season_weight ?? null,
          inventory: {
            qty_on_hand: 0,
            qty_available: 0,
            qty_reserved: 0,
            reorder_point: 50,
            safety_stock: 20,
          },
          is_active: true,
        };
        setMockProducts((prev) => [...prev, newProduct]);
        return true;
      }
      return createProduct(data as CreateProductInput);
    },
    [useMockProducts, createProduct],
  );

  const handleUpdateProduct = useCallback(
    async (data: CreateProductInput | UpdateProductInput) => {
      if (!editProduct) return false;
      if (useMockProducts) {
        setMockProducts((prev) =>
          prev.map((p) =>
            p.id === editProduct.id
              ? { ...p, ...data, updated_at: new Date().toISOString() }
              : p,
          ),
        );
        return true;
      }
      return updateProduct(editProduct.id, data as UpdateProductInput);
    },
    [editProduct, useMockProducts, updateProduct],
  );

  const handleDeleteProduct = useCallback(async () => {
    if (!deleteProductTarget) return;
    if (useMockProducts) {
      setMockProducts((prev) => prev.filter((p) => p.id !== deleteProductTarget.id));
      setDeleteProductDialogOpen(false);
      setDeleteProductTarget(null);
      return;
    }
    const success = await deleteProduct(deleteProductTarget.id);
    if (success) {
      setDeleteProductDialogOpen(false);
      setDeleteProductTarget(null);
    }
  }, [deleteProductTarget, useMockProducts, deleteProduct]);

  // --- Supplier Handlers ---
  const handleCreateSupplier = useCallback(
    async (data: CreateSupplierInput | UpdateSupplierInput) => {
      if (useMockSuppliers) {
        const input = data as CreateSupplierInput;
        const newSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          name: input.name ?? '',
          code: input.code ?? null,
          country: input.country ?? 'China',
          lead_time_days: input.lead_time_days ?? 30,
          reliability: input.reliability ?? 0.8,
          is_cny_affected: input.is_cny_affected ?? false,
          contact_email: input.contact_email ?? null,
          contact_phone: input.contact_phone ?? null,
          notes: input.notes ?? null,
          product_count: 0,
        };
        setMockSuppliers((prev) => [...prev, newSupplier]);
        return true;
      }
      return createSupplier(data as CreateSupplierInput);
    },
    [useMockSuppliers, createSupplier],
  );

  const handleUpdateSupplier = useCallback(
    async (data: CreateSupplierInput | UpdateSupplierInput) => {
      if (!editSupplier) return false;
      if (useMockSuppliers) {
        setMockSuppliers((prev) =>
          prev.map((s) =>
            s.id === editSupplier.id
              ? { ...s, ...data }
              : s,
          ),
        );
        return true;
      }
      return updateSupplier(editSupplier.id, data as UpdateSupplierInput);
    },
    [editSupplier, useMockSuppliers, updateSupplier],
  );

  const handleDeleteSupplier = useCallback(async () => {
    if (!deleteSupplierTarget) return;
    if (useMockSuppliers) {
      setMockSuppliers((prev) => prev.filter((s) => s.id !== deleteSupplierTarget.id));
      setDeleteSupplierDialogOpen(false);
      setDeleteSupplierTarget(null);
      return;
    }
    const success = await deleteSupplier(deleteSupplierTarget.id);
    if (success) {
      setDeleteSupplierDialogOpen(false);
      setDeleteSupplierTarget(null);
    }
  }, [deleteSupplierTarget, useMockSuppliers, deleteSupplier]);

  // --- Product filter handlers (with mock support) ---
  const displayProducts = React.useMemo(() => {
    let result = products;
    if (activeOnlyProducts) {
      result = result.filter((p) => p.is_active);
    }
    if (categoryFilter && categoryFilter !== '__all__') {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (lowStockFilter) {
      result = result.filter((p) => {
        const avail = p.inventory?.qty_available ?? 0;
        const reorder = p.inventory?.reorder_point ?? 0;
        return avail <= reorder;
      });
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku_code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [products, activeOnlyProducts, categoryFilter, lowStockFilter, productSearch]);

  const displaySuppliers = React.useMemo(() => {
    let result = suppliers;
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter((s) => s.country === countryFilter);
    }
    if (cnyFilter !== null) {
      result = result.filter((s) => s.is_cny_affected === cnyFilter);
    }
    if (supplierSearch.trim()) {
      const q = supplierSearch.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.country.toLowerCase().includes(q),
      );
    }
    return result;
  }, [suppliers, countryFilter, cnyFilter, supplierSearch]);

  // Stats
  const stats = React.useMemo(() => {
    const activeCount = products.filter((p) => p.is_active).length;
    let lowStockCount = 0;
    for (const p of products) {
      const avail = p.inventory?.qty_available ?? 0;
      const reorder = p.inventory?.reorder_point ?? 0;
      if (avail <= reorder) lowStockCount++;
    }
    return {
      totalProducts: products.length,
      activeProducts: activeCount,
      lowStock: lowStockCount,
      totalSuppliers: suppliers.length,
    };
  }, [products, suppliers]);

  const isLoading = productsLoading || suppliersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Package className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Product & Supplier Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              পণ্য ও সরবরাহকারী ব্যবস্থাপনা — Manage BD motorcycle parts inventory & supply chain
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Total Products</span>
          </div>
          <p className="text-lg font-bold font-mono">{stats.totalProducts}</p>
        </div>
        <div className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <PackageCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Active Products</span>
          </div>
          <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.activeProducts}
          </p>
        </div>
        <div className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Low Stock</span>
          </div>
          <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats.lowStock}
          </p>
        </div>
        <div className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Total Suppliers</span>
          </div>
          <p className="text-lg font-bold font-mono">{stats.totalSuppliers}</p>
        </div>
      </div>

      {/* Error banner */}
      {(productError || supplierError) && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400 flex-1">
            {productError || supplierError}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearProductError();
              clearSupplierError();
            }}
            className="h-6 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && !useMockProducts && !useMockSuppliers && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading data...</span>
        </div>
      )}

      {/* Tabs: Products | Suppliers */}
      {!isLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="products" className="gap-1.5 text-xs">
                <Package className="h-3.5 w-3.5" />
                Products
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {displayProducts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                Suppliers
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {displaySuppliers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {activeTab === 'products' && (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setEditProduct(null);
                  setProductFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Product</span>
              </Button>
            )}
            {activeTab === 'suppliers' && (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setEditSupplier(null);
                  setSupplierFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Supplier</span>
              </Button>
            )}
          </div>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-0">
            <ProductTable
              products={displayProducts}
              searchQuery={productSearch}
              categoryFilter={categoryFilter}
              lowStockFilter={lowStockFilter}
              activeOnly={activeOnlyProducts}
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={displayProducts.length}
              onSearchChange={setProductSearch}
              onCategoryChange={setCategoryFilter}
              onLowStockChange={setLowStockFilter}
              onActiveOnlyChange={setActiveOnlyProducts}
              onPageChange={(p) => {
                setProductPage(p);
                if (!useMockProducts) fetchProducts(p);
              }}
              onViewDetail={(product) => {
                setDetailProduct(product);
                setDetailProductOpen(true);
              }}
              onEdit={(product) => {
                setEditProduct(product);
                setProductFormOpen(true);
              }}
              onDelete={(product) => {
                setDeleteProductTarget(product);
                setDeleteProductDialogOpen(true);
              }}
            />
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-0">
            <SupplierTable
              suppliers={displaySuppliers}
              searchQuery={supplierSearch}
              countryFilter={countryFilter}
              cnyFilter={cnyFilter}
              onSearchChange={setSupplierSearch}
              onCountryChange={setCountryFilter}
              onCnyFilterChange={setCnyFilter}
              onViewDetail={(supplier) => {
                setDetailSupplier(supplier);
                setDetailSupplierOpen(true);
              }}
              onEdit={(supplier) => {
                setEditSupplier(supplier);
                setSupplierFormOpen(true);
              }}
              onDelete={(supplier) => {
                setDeleteSupplierTarget(supplier);
                setDeleteSupplierDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        editProduct={editProduct}
        onSubmit={editProduct ? handleUpdateProduct : handleCreateProduct}
        suppliers={suppliers}
      />

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        open={detailProductOpen}
        onOpenChange={setDetailProductOpen}
        product={detailProduct}
        onEdit={(product) => {
          setDetailProductOpen(false);
          setEditProduct(product);
          setProductFormOpen(true);
        }}
        onDelete={(product) => {
          setDetailProductOpen(false);
          setDeleteProductTarget(product);
          setDeleteProductDialogOpen(true);
        }}
      />

      {/* Supplier Form Dialog */}
      <SupplierFormDialog
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        editSupplier={editSupplier}
        onSubmit={editSupplier ? handleUpdateSupplier : handleCreateSupplier}
      />

      {/* Supplier Detail Sheet */}
      <SupplierDetailSheet
        open={detailSupplierOpen}
        onOpenChange={setDetailSupplierOpen}
        supplier={detailSupplier}
        products={products}
        onEdit={(supplier) => {
          setDetailSupplierOpen(false);
          setEditSupplier(supplier);
          setSupplierFormOpen(true);
        }}
        onDelete={(supplier) => {
          setDetailSupplierOpen(false);
          setDeleteSupplierTarget(supplier);
          setDeleteSupplierDialogOpen(true);
        }}
      />

      {/* Delete Product Confirmation */}
      <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-foreground">
                    {deleteProductTarget?.name ?? 'this product'}
                  </span>
                  ?
                </p>
                {deleteProductTarget && (
                  <div className="rounded-md bg-muted p-2 text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">SKU:</span>
                      <code className="font-mono">{deleteProductTarget.sku_code}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{deleteProductTarget.category}</span>
                    </div>
                  </div>
                )}
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  This action cannot be undone. All inventory and forecast data will be removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProductTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Supplier Confirmation */}
      <AlertDialog open={deleteSupplierDialogOpen} onOpenChange={setDeleteSupplierDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Delete Supplier
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-foreground">
                    {deleteSupplierTarget?.name ?? 'this supplier'}
                  </span>
                  ?
                </p>
                {deleteSupplierTarget && (
                  <div className="rounded-md bg-muted p-2 text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Country:</span>
                      <span>{deleteSupplierTarget.country}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Products:</span>
                      <span>{deleteSupplierTarget.product_count ?? 0}</span>
                    </div>
                  </div>
                )}
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  Products assigned to this supplier will lose their supplier association.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteSupplierTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
