'use client';

// ============================================
// Invite Dialog — Invite team member form
// ============================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { useUserManagementStore } from './user-store';
import { VALID_ROLES, ROLE_LABELS } from './types';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { inviteMember, teamLimit } = useUserManagementStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAtLimit = teamLimit ? teamLimit.current >= teamLimit.max : false;

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !name.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return;
    }

    setSubmitting(true);
    const ok = await inviteMember({
      email: email.trim(),
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) {
      setEmail('');
      setName('');
      setRole('viewer');
      setPhone('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your TrimedCast team.
            {teamLimit && (
              <span className="block mt-1 text-xs">
                {teamLimit.current}/{teamLimit.max} members on current plan
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isAtLimit ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            <p>You&apos;ve reached the maximum team members for your plan.</p>
            <p className="mt-1">Upgrade to add more members.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Full Name *</Label>
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r].en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                placeholder="+880 1XXX-XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        {!isAtLimit && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !email.trim() || !name.trim()}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
              Send Invitation
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
