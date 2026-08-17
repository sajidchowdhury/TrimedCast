'use client';

// ============================================
// Profile Form — Edit name and phone
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useUserManagementStore } from './user-store';

interface ProfileFormProps {
  onCancel?: () => void;
}

export function ProfileForm({ onCancel }: ProfileFormProps) {
  const { user, refresh } = useAuth();
  const { updateProfile } = useUserManagementStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    const ok = await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
    if (ok) {
      await refresh();
      onCancel?.();
    } else {
      setError('Failed to update profile');
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Edit Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs">Full Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Phone (BD)
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1XXX-XXXXXX"
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Bangladeshi phone format: +880 1XXX-XXXXXX
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save Changes
          </Button>
          {onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
