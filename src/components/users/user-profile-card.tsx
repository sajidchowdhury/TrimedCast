'use client';

// ============================================
// User Profile Card — Current user profile view
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Clock, Shield, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { RoleBadge } from './role-badge';
import type { AuthUser, AuthTenant } from '@/lib/auth/context';

interface UserProfileCardProps {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}

export function UserProfileCard({ onEditProfile, onChangePassword }: UserProfileCardProps) {
  const { user, tenant } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          My Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="space-y-2.5">
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={Phone} label="Phone" value={user.phone || 'Not set'} />
          <DetailRow
            icon={Clock}
            label="Last Login"
            value={user.last_login_at ? formatRelativeTime(user.last_login_at) : 'Never'}
          />
          {tenant && (
            <>
              <Separator />
              <DetailRow icon={Shield} label="Account" value={tenant.ac_id} />
              <DetailRow icon={User} label="Plan" value={tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} />
              <DetailRow icon={User} label="Division" value={tenant.division.toUpperCase()} />
            </>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={onEditProfile}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit Profile
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={onChangePassword}>
            Change Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-BD', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
