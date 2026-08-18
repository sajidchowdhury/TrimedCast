'use client';

// ============================================
// TrimedCast - Seasonality Dashboard
// Main page component for managing Bangladesh
// seasonal demand patterns with List/Timeline views
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Plus,
  Search,
  LayoutGrid,
  Calendar,
  AlertTriangle,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSeasonalityStore } from '@/stores/seasonality-store';
import type {
  SeasonalityType,
  CreateSeasonalityTypeInput,
  UpdateSeasonalityTypeInput,
} from './types';
import { SEASONALITY_PRESETS } from './types';
import { SeasonalityCard } from './seasonality-card';
import { SeasonalityForm } from './seasonality-form';
import { SeasonalityTimeline } from './seasonality-timeline';

// ============================================
// Mock data for initial demo (when API not available)
// ============================================

const MOCK_TYPES: SeasonalityType[] = SEASONALITY_PRESETS.map((preset, idx) => ({
  id: `mock-${idx + 1}`,
  name: preset.name,
  label: preset.label,
  label_bn: preset.labelBn,
  description: preset.description,
  multiplier: preset.multiplier,
  months: [...preset.months],
  color: preset.color,
  is_active: true,
  is_default: idx < 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

// ============================================
// Main Dashboard Component
// ============================================

export function SeasonalityDashboard() {
  // Store
  const {
    types: storeTypes,
    isLoading,
    error: storeError,
    searchQuery,
    activeOnly,
    fetchTypes,
    createType,
    updateType,
    deleteType,
    setSearchQuery,
    setActiveOnly,
    filteredTypes,
    clearError,
  } = useSeasonalityStore();

  // Local state - use mock data as fallback for demo
  const [showBn, setShowBn] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editType, setEditType] = useState<SeasonalityType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeasonalityType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Use mock data if store is empty (for demo without API)
  const [useMockData, setUseMockData] = useState(false);
  const [mockTypes, setMockTypes] = useState<SeasonalityType[]>(MOCK_TYPES);

  const types = useMockData ? mockTypes : storeTypes;

  // Filter types locally for both mock and real data
  const displayTypes = React.useMemo(() => {
    let result = types;
    if (activeOnly) {
      result = result.filter((t) => t.is_active);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.label.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.label_bn && t.label_bn.includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [types, activeOnly, searchQuery]);

  // Fetch types on mount
  useEffect(() => {
    const load = async () => {
      try {
        await fetchTypes();
      } catch {
        // API not available, use mock data
        setUseMockData(true);
      }
    };
    load();
  }, [fetchTypes]);

  // If store fetch returns empty and not loading, switch to mock immediately
  // Use useMemo to derive useMockData from store state, avoiding setState-in-effect
  useEffect(() => {
    if (!isLoading && storeTypes.length === 0 && !useMockData) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setUseMockData(true));
    }
  }, [isLoading, storeTypes.length, useMockData]);

  // Handle create
  const handleCreate = useCallback(
    async (data: CreateSeasonalityTypeInput | UpdateSeasonalityTypeInput) => {
      if (useMockData) {
        const newData = data as CreateSeasonalityTypeInput;
        const newType: SeasonalityType = {
          id: `mock-${Date.now()}`,
          name: newData.name ?? newData.label.toLowerCase().replace(/\s+/g, '_'),
          label: newData.label,
          label_bn: newData.label_bn ?? null,
          description: newData.description ?? null,
          multiplier: newData.multiplier,
          months: newData.months,
          color: newData.color ?? null,
          is_active: newData.is_active ?? true,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMockTypes((prev) => [...prev, newType]);
        return true;
      }
      return createType(data as CreateSeasonalityTypeInput);
    },
    [useMockData, createType],
  );

  // Handle update
  const handleUpdate = useCallback(
    async (data: CreateSeasonalityTypeInput | UpdateSeasonalityTypeInput) => {
      if (!editType) return false;
      if (useMockData) {
        setMockTypes((prev) =>
          prev.map((t) =>
            t.id === editType.id
              ? {
                  ...t,
                  ...data,
                  label: data.label ?? t.label,
                  label_bn: data.label_bn ?? t.label_bn,
                  description: data.description ?? t.description,
                  multiplier: data.multiplier ?? t.multiplier,
                  months: data.months ?? t.months,
                  color: data.color ?? t.color,
                  is_active: data.is_active ?? t.is_active,
                  updated_at: new Date().toISOString(),
                }
              : t,
          ),
        );
        return true;
      }
      return updateType(editType.id, data as UpdateSeasonalityTypeInput);
    },
    [editType, useMockData, updateType],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (useMockData) {
      setMockTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      return;
    }
    const success = await deleteType(deleteTarget.id);
    if (success) {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, useMockData, deleteType]);

  // Handle toggle active
  const handleToggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      if (useMockData) {
        setMockTypes((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, is_active: isActive, updated_at: new Date().toISOString() } : t,
          ),
        );
        return;
      }
      await updateType(id, { is_active: isActive });
    },
    [useMockData, updateType],
  );

  // Open edit dialog
  const openEdit = useCallback((type: SeasonalityType) => {
    setEditType(type);
    setFormOpen(true);
  }, []);

  // Open create dialog
  const openCreate = useCallback(() => {
    setEditType(null);
    setFormOpen(true);
  }, []);

  // Open delete confirmation
  const openDelete = useCallback((type: SeasonalityType) => {
    setDeleteTarget(type);
    setDeleteDialogOpen(true);
  }, []);

  // Count stats
  const activeCount = types.filter((t) => t.is_active).length;
  const defaultCount = types.filter((t) => t.is_default).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Sun className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Seasonality Type Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {showBn
                ? 'বাংলাদেশের মৌসুমী চাহিদা প্যাটার্ন ব্যবস্থাপনা'
                : 'Manage Bangladesh seasonal demand patterns for motorcycle parts'}
            </p>
          </div>
        </div>

        {/* Bengali toggle + Stats */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {/* BN/EN toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBn(!showBn)}
              className="h-7 text-xs gap-1"
            >
              <span className="text-base">{showBn ? '🇧🇩' : '🇬🇧'}</span>
              {showBn ? 'বাংলা' : 'English'}
            </Button>

            {/* Stats badges */}
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {types.length} total
              </Badge>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                {activeCount} active
              </Badge>
              {defaultCount > 0 && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
                  {defaultCount} default
                </Badge>
              )}
            </div>
          </div>

          {/* View mode toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'timeline')}>
            <TabsList className="h-7">
              <TabsTrigger value="list" className="text-xs gap-1 px-2 h-5">
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs gap-1 px-2 h-5">
                <Calendar className="h-3 w-3" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Error banner */}
      {storeError && !useMockData && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400 flex-1">{storeError}</p>
          <Button variant="ghost" size="sm" onClick={clearError} className="h-6 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !useMockData && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading seasonality types...</span>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && !isLoading && (
        <SeasonalityTimeline types={types} showBn={showBn} />
      )}

      {/* List View */}
      {viewMode === 'list' && !isLoading && (
        <div className="space-y-4">
          {/* Search + Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search seasonality types..."
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Active Only toggle */}
              <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1">
                <Switch
                  checked={activeOnly}
                  onCheckedChange={setActiveOnly}
                  className="scale-75 origin-left"
                  id="active-only"
                />
                <Label htmlFor="active-only" className="text-xs cursor-pointer">
                  Active Only
                </Label>
              </div>

              {/* Add New button */}
              <Button onClick={openCreate} size="sm" className="gap-1 h-8">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add New</span>
              </Button>
            </div>
          </div>

          {/* Cards grid */}
          {displayTypes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayTypes.map((type) => (
                <SeasonalityCard
                  key={type.id}
                  type={type}
                  showBn={showBn}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
                <Snowflake className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No seasonality types found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {searchQuery
                  ? 'No types match your search. Try adjusting your query.'
                  : 'Create your first seasonality type to start modeling BD demand patterns.'}
              </p>
              <Button onClick={openCreate} size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Seasonality Type
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Dialog */}
      <SeasonalityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editType={editType}
        onSubmit={editType ? handleUpdate : handleCreate}
        showBn={showBn}
      />

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Delete Seasonality Type
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-foreground">
                    {deleteTarget?.label ?? 'this type'}
                  </span>
                  ?
                </p>
                {deleteTarget && (
                  <div className="rounded-md bg-muted p-2 text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Name:</span>
                      <code className="font-mono">{deleteTarget.name}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Multiplier:</span>
                      <span className="font-mono">{deleteTarget.multiplier.toFixed(1)}×</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Months:</span>
                      <span>{deleteTarget.months.join(', ')}</span>
                    </div>
                  </div>
                )}
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  ⚠ Products using this type will revert to default seasonality.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
