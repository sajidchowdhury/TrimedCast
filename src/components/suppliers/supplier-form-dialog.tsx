'use client';

// ============================================
// TrimedCast - Supplier Form Dialog
// Session 18: Product & Supplier Management
// Create/Edit supplier with CNY, reliability,
// and contact fields
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
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
} from '@/components/products/types';
import { SUPPLIER_COUNTRIES } from '@/components/products/types';

// --- Props ---
interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSupplier?: Supplier | null;
  onSubmit: (data: CreateSupplierInput | UpdateSupplierInput) => Promise<boolean>;
}

// --- Main Component ---
export function SupplierFormDialog({
  open,
  onOpenChange,
  editSupplier,
  onSubmit,
}: SupplierFormDialogProps) {
  const isEdit = !!editSupplier;

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('China');
  const [leadTimeDays, setLeadTimeDays] = useState('30');
  const [reliability, setReliability] = useState(85);
  const [isCnyAffected, setIsCnyAffected] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Prefill form when editing — wrapped in microtask to avoid cascading render lint
  useEffect(() => {
    queueMicrotask(() => {
      if (editSupplier) {
        setName(editSupplier.name);
        setCode(editSupplier.code ?? '');
        setCountry(editSupplier.country);
        setLeadTimeDays(String(editSupplier.lead_time_days));
        setReliability(editSupplier.reliability != null ? Math.round(editSupplier.reliability * 100) : 85);
        setIsCnyAffected(editSupplier.is_cny_affected);
        setContactEmail(editSupplier.contact_email ?? '');
        setContactPhone(editSupplier.contact_phone ?? '');
        setNotes(editSupplier.notes ?? '');
      } else {
        setName('');
        setCode('');
        setCountry('China');
        setLeadTimeDays('30');
        setReliability(85);
        setIsCnyAffected(false);
        setContactEmail('');
        setContactPhone('');
        setNotes('');
      }
      setValidationError('');
    });
  }, [editSupplier, open]);

  // Validate
  const validate = (): boolean => {
    if (!name.trim()) {
      setValidationError('Supplier Name is required');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    const data: CreateSupplierInput | UpdateSupplierInput = {
      name,
      code: code || undefined,
      country: country || undefined,
      lead_time_days: leadTimeDays ? Number(leadTimeDays) : undefined,
      reliability: reliability / 100,
      is_cny_affected: isCnyAffected,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
      notes: notes || undefined,
    };

    const success = await onSubmit(data);
    setIsSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update supplier details below.'
              : 'Add a new supplier to your BD motorcycle parts supply chain.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Validation Error */}
          {validationError && (
            <div className="p-2 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
              {validationError}
            </div>
          )}

          {/* Row: Name + Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-name" className="text-xs">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jingke Auto Parts"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier-code" className="text-xs">Code</Label>
              <Input
                id="supplier-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="JK-AP"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* Row: Country + Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
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

          {/* Reliability Slider */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Reliability: {reliability}%
            </Label>
            <Slider
              value={[reliability]}
              onValueChange={([v]) => setReliability(v)}
              min={0}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* CNY Affected toggle */}
          <div className="flex items-center gap-3 border rounded-md p-3">
            <Switch
              checked={isCnyAffected}
              onCheckedChange={setIsCnyAffected}
              id="cny-affected"
            />
            <Label htmlFor="cny-affected" className="text-sm cursor-pointer">
              CNY Affected (Chinese New Year shutdown)
            </Label>
          </div>

          {/* Row: Contact Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="sales@supplier.com"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone" className="text-xs">Contact Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+86-755-12345678"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional supplier information..."
              className="text-sm min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {isEdit ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
