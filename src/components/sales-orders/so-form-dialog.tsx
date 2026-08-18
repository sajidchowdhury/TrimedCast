'use client';

// ============================================
// TrimedCast — Sales Order Form Dialog
// Session 23: Sales Order Management
// ============================================

import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSalesOrderStore } from '@/stores/sales-order-store';
import { SO_CHANNELS, BD_REGIONS, formatBDT } from './types';
import type { SOItem } from './types';

interface SOFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormItem {
  productName: string;
  skuCode: string;
  quantity: number;
  price: number;
}

export function SOFormDialog({ open, onOpenChange }: SOFormDialogProps) {
  const { createOrder } = useSalesOrderStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState('');
  const [region, setRegion] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { productName: '', skuCode: '', quantity: 1, price: 0 },
  ]);

  // Item field updaters
  const [newProductName, setNewProductName] = useState('');
  const [newSkuCode, setNewSkuCode] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  function addItem() {
    if (!newProductName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        productName: newProductName.trim(),
        skuCode: newSkuCode.trim(),
        quantity: Math.max(1, newQuantity),
        price: Math.max(0, newPrice),
      },
    ]);
    setNewProductName('');
    setNewSkuCode('');
    setNewQuantity(1);
    setNewPrice(0);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof FormItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function resetForm() {
    setCustomerName('');
    setChannel('');
    setRegion('');
    setItems([{ productName: '', skuCode: '', quantity: 1, price: 0 }]);
    setNewProductName('');
    setNewSkuCode('');
    setNewQuantity(1);
    setNewPrice(0);
  }

  async function handleSubmit() {
    if (!customerName.trim()) return;
    const validItems = items.filter((item) => item.productName.trim() && item.quantity > 0);
    if (validItems.length === 0) return;

    setIsSubmitting(true);
    const total = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const soItems: SOItem[] = validItems.map((item, idx) => ({
      productId: `p-new-${Date.now()}-${idx}`,
      quantity: item.quantity,
      price: item.price,
      product_name: item.productName,
      sku_code: item.skuCode,
    }));

    await createOrder({
      date: new Date().toISOString(),
      customer_id: customerName.trim(),
      channel: channel || null,
      region: region || null,
      total_amount: total,
      status: 'pending',
      items: soItems,
    });

    setIsSubmitting(false);
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-500" />
            New Sales Order
          </DialogTitle>
          <DialogDescription>
            Create a new sales order for a customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-xs font-medium">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customer-name"
              placeholder="e.g. Rahim Auto Parts"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Channel & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {SO_CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label} <span className="text-muted-foreground ml-1">({ch.labelBn})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {BD_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} <span className="text-muted-foreground ml-1">({r.labelBn})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Items Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Order Items</Label>

            {/* Existing items list */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                      <Input
                        placeholder="Product name"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="SKU code"
                        value={item.skuCode}
                        onChange={(e) => updateItem(index, 'skuCode', e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="h-8 text-xs"
                        min={1}
                      />
                      <Input
                        type="number"
                        placeholder="Unit Price (৳)"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', Math.max(0, Number(e.target.value)))}
                        className="h-8 text-xs"
                        min={0}
                      />
                    </div>
                    <div className="text-xs font-semibold w-20 text-right">
                      {formatBDT(item.quantity * item.price)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new item row */}
            <div className="p-2.5 rounded-lg border border-dashed space-y-2">
              <div className="text-[11px] text-muted-foreground font-medium">Add Product</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Product name"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="SKU code"
                  value={newSkuCode}
                  onChange={(e) => setNewSkuCode(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value)))}
                  className="h-8 text-xs"
                  min={1}
                />
                <Input
                  type="number"
                  placeholder="Unit Price (৳)"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Math.max(0, Number(e.target.value)))}
                  className="h-8 text-xs"
                  min={0}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={addItem}
                disabled={!newProductName.trim()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
          </div>

          <Separator />

          {/* Grand Total */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-semibold">Grand Total</span>
            <span className="text-xl font-bold text-emerald-500">{formatBDT(grandTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !customerName.trim() || items.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
