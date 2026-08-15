'use client';

// ============================================
// Suppliers Page — Supplier management
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Globe, Clock, Star, AlertTriangle } from 'lucide-react';

export function SuppliersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-500" />
            Suppliers
          </h2>
          <p className="text-sm text-muted-foreground">Vendor management, lead times, and reliability tracking</p>
        </div>
        <Button size="sm" variant="outline">
          <Truck className="h-3.5 w-3.5 mr-1" />
          Add Supplier
        </Button>
      </div>

      {/* Supplier summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Total Suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">90</p>
            <p className="text-xs text-muted-foreground">Avg Lead Time (days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Avg Reliability</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">CNY Affected</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for supplier table */}
      <Card>
        <CardContent className="p-8 text-center">
          <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Supplier data will load from the API</p>
          <p className="text-xs text-muted-foreground mt-1">Use the Import Data module to add supplier records</p>
        </CardContent>
      </Card>
    </div>
  );
}
