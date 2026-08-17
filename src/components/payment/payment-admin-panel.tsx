'use client';

// ============================================
// Payment Admin Panel — Verify Bank Transfers
// Session 13: BD Payment Integration
// ============================================

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Receipt,
  FileText,
} from 'lucide-react';

interface PendingPayment {
  id: string;
  tenantName: string;
  amount: number;
  method: string;
  bankName?: string;
  transactionRef?: string;
  transferDate?: string;
  receiptUrl?: string;
  createdAt: string;
}

// Demo pending bank transfers
const DEMO_PENDING: PendingPayment[] = [
  {
    id: 'pay_pending_1',
    tenantName: 'BikeParts BD',
    amount: 69000,
    method: 'bank_transfer',
    bankName: 'Dutch-Bangla Bank',
    transactionRef: 'TXN20250315042',
    transferDate: '2025-03-15',
    createdAt: '2025-03-15T11:30:00Z',
  },
  {
    id: 'pay_pending_2',
    tenantName: 'DHK Motorcycle Parts',
    amount: 24000,
    method: 'bank_transfer',
    bankName: 'BRAC Bank',
    transactionRef: 'TXN20250316018',
    transferDate: '2025-03-16',
    receiptUrl: '/receipts/demo.pdf',
    createdAt: '2025-03-16T09:15:00Z',
  },
];

export function PaymentAdminPanel() {
  const [pendingPayments, setPendingPayments] = useState(DEMO_PENDING);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'verify' | 'reject'>('verify');

  const handleAction = (payment: PendingPayment, action: 'verify' | 'reject') => {
    setSelectedPayment(payment);
    setDialogAction(action);
    setAdminNotes('');
    setDialogOpen(true);
  };

  const confirmAction = () => {
    if (selectedPayment) {
      setPendingPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
    }
    setDialogOpen(false);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-amber-500" />
          Payment Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          Verify bank transfer receipts submitted by tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{pendingPayments.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">12</p>
            <p className="text-xs text-muted-foreground">Verified Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">1</p>
            <p className="text-xs text-muted-foreground">Rejected Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Bank Transfers</CardTitle>
          <CardDescription>ব্যাংক ট্রান্সফার যাচাই বাকি</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">All payments verified!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-sm">{payment.tenantName}</TableCell>
                      <TableCell className="font-semibold text-sm">
                        ৳{payment.amount.toLocaleString('en-BD')}
                      </TableCell>
                      <TableCell className="text-sm">{payment.bankName || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{payment.transactionRef || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString('en-BD', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(payment, 'verify')}
                            className="text-emerald-600 hover:text-emerald-700 h-8"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Verify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(payment, 'reject')}
                            className="text-red-600 hover:text-red-700 h-8"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'verify' ? 'Verify Bank Transfer' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'verify'
                ? `Confirm that ৳${selectedPayment?.amount.toLocaleString('en-BD')} from ${selectedPayment?.tenantName} was received.`
                : `Reject the payment from ${selectedPayment?.tenantName}. The tenant will be notified.`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-medium">{selectedPayment.tenantName}</span>
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">৳{selectedPayment.amount.toLocaleString('en-BD')}</span>
                <span className="text-muted-foreground">Bank:</span>
                <span>{selectedPayment.bankName}</span>
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono">{selectedPayment.transactionRef}</span>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>Admin Notes (optional)</Label>
                <Input
                  placeholder={dialogAction === 'verify' ? 'e.g., Amount confirmed' : 'e.g., Amount mismatch'}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className={dialogAction === 'verify'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
              }
            >
              {dialogAction === 'verify' ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Verify & Activate</>
              ) : (
                <><XCircle className="h-4 w-4 mr-1" /> Reject</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
