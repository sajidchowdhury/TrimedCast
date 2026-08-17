'use client';

// ============================================
// Password Change Form
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useUserManagementStore } from './user-store';

interface PasswordChangeFormProps {
  onCancel?: () => void;
}

export function PasswordChangeForm({ onCancel }: PasswordChangeFormProps) {
  const { changePassword } = useUserManagementStore();

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordRules = [
    { label: 'At least 8 characters', met: newPwd.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(newPwd) },
    { label: 'Lowercase letter', met: /[a-z]/.test(newPwd) },
    { label: 'Number', met: /\d/.test(newPwd) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPwd) },
  ];

  const allRulesMet = passwordRules.every((r) => r.met);
  const passwordsMatch = newPwd === confirmPwd && newPwd.length > 0;

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!currentPwd) {
      setError('Current password is required');
      return;
    }
    if (!allRulesMet) {
      setError('New password does not meet strength requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    const ok = await changePassword({ current_password: currentPwd, new_password: newPwd });
    if (ok) {
      setSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => {
        setSuccess(false);
        onCancel?.();
      }, 2000);
    } else {
      setError('Password change failed. Check your current password.');
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Change Password
        </CardTitle>
        <CardDescription className="text-xs">
          Update your account password for security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Password changed successfully
          </div>
        )}

        {/* Current Password */}
        <div className="space-y-2">
          <Label className="text-xs">Current Password</Label>
          <div className="relative">
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter current password"
              className="h-9 text-sm pr-9"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <Label className="text-xs">New Password</Label>
          <div className="relative">
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Enter new password"
              className="h-9 text-sm pr-9"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {/* Strength indicators */}
          {newPwd.length > 0 && (
            <div className="space-y-1">
              {passwordRules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${rule.met ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className={`text-[10px] ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label className="text-xs">Confirm New Password</Label>
          <Input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Confirm new password"
            className="h-9 text-sm"
          />
          {confirmPwd.length > 0 && !passwordsMatch && (
            <p className="text-[10px] text-red-500">Passwords do not match</p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !currentPwd || !allRulesMet || !passwordsMatch}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
            Update Password
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
