'use client';

// ============================================
// Invoice List — Paginated invoice table
// ============================================

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Download, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from './subscription-store';
import { formatBDT, type InvoiceStatus, type InvoiceData } from './types';

// --- Invoice Status Badge ---
function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variantMap: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    open: 'secondary',
    paid: 'default',
    void: 'destructive',
    uncollectible: 'outline',
  };
  const colorMap: Record<InvoiceStatus, string> = {
    draft: 'text-gray-500',
    open: 'text-blue-600',
    paid: 'text-emerald-600',
    void: 'text-red-600',
    uncollectible: 'text-orange-600',
  };

  return (
    <Badge variant={variantMap[status]} className={colorMap[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// --- Line Items Expanded ---
function InvoiceLineItems({ invoice }: { invoice: InvoiceData }) {
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-2 text-sm text-muted-foreground">
          No line items
        </td>
      </tr>
    );
  }

  return (
    <>
      {invoice.lineItems.map((item, idx) => (
        <tr key={idx} className="bg-muted/30">
          <td colSpan={2} className="px-4 py-2 text-sm pl-10">
            ↳ {item.description}
          </td>
          <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
          <td className="px-4 py-2 text-sm text-right">{formatBDT(item.unit_amount)}</td>
          <td className="px-4 py-2 text-sm text-right font-medium">{formatBDT(item.amount)}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

// --- Main Component ---
export function InvoiceList() {
  const {
    invoices,
    invoicesPage,
    invoicesTotal,
    invoicesLastPage,
    isLoadingInvoices,
    invoicesError,
    expandedInvoiceId,
    fetchInvoices,
    setExpandedInvoiceId,
  } = useSubscriptionStore();

  React.useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId(expandedInvoiceId === id ? null : id);
  };

  if (isLoadingInvoices && invoices.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (invoicesError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{invoicesError}</AlertDescription>
      </Alert>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No invoices yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Invoices will appear after your first payment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount (৳)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const isExpanded = expandedInvoiceId === invoice.id;
              return (
                <React.Fragment key={invoice.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(invoice.id)}
                  >
                    <TableCell className="font-mono text-sm">{invoice.number}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(invoice.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatBDT(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                  {/* Expanded line items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TableCell colSpan={6} className="p-0">
                          <div className="bg-muted/20 border-t border-b px-4 py-3 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Line Items
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead colSpan={2}>Description</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Unit Price</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <InvoiceLineItems invoice={invoice} />
                              </TableBody>
                            </Table>
                            <div className="flex justify-end gap-6 text-sm pt-2 border-t">
                              <span className="text-muted-foreground">Subtotal: {formatBDT(invoice.subtotal)}</span>
                              {invoice.discount > 0 && (
                                <span className="text-emerald-600">Discount: -{formatBDT(invoice.discount)}</span>
                              )}
                              {invoice.tax > 0 && (
                                <span className="text-muted-foreground">Tax: {formatBDT(invoice.tax)}</span>
                              )}
                              <span className="font-medium">Total: {formatBDT(invoice.total)}</span>
                            </div>
                            {invoice.paymentMethod && (
                              <div className="text-xs text-muted-foreground">
                                Paid via: {invoice.paymentMethod}
                                {invoice.paidAt && ` on ${new Date(invoice.paidAt).toLocaleDateString('en-GB')}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">
          {invoicesTotal} invoice{invoicesTotal !== 1 ? 's' : ''} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={invoicesPage <= 1}
            onClick={() => fetchInvoices(invoicesPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {invoicesPage} of {invoicesLastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={invoicesPage >= invoicesLastPage}
            onClick={() => fetchInvoices(invoicesPage + 1)}
          >
            Next
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
