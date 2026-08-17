'use client';

// ============================================
// Team Members Panel — Full team management
// List, invite, role change, deactivate, remove
// ============================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  Trash2,
  RotateCcw,
  Send,
  Ban,
  Loader2,
  Check,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useUserManagementStore } from './user-store';
import { InviteDialog } from './invite-dialog';
import { RoleBadge } from './role-badge';
import { ROLE_LABELS, VALID_ROLES } from './types';
import type { TeamMember } from './types';

export function TeamMembersPanel() {
  const {
    members,
    membersLoading,
    teamLimit,
    fetchMembers,
    changeRole,
    deactivateUser,
    reactivateUser,
    removeUser,
    reinviteUser,
    inviteDialogOpen,
    setInviteDialogOpen,
  } = useUserManagementStore();

  const { user: currentUser, isAdmin } = useAuth();

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'remove' | 'reinvite';
    userId: string;
    userName: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Role change state
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    await changeRole(userId, newRole);
    setRoleChanging(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    switch (confirmAction.type) {
      case 'deactivate':
        await deactivateUser(confirmAction.userId);
        break;
      case 'remove':
        await removeUser(confirmAction.userId);
        break;
      case 'reinvite':
        await reinviteUser(confirmAction.userId);
        break;
    }
    setConfirming(false);
    setConfirmAction(null);
  };

  const getInviteStatus = (member: TeamMember): 'active' | 'pending' | 'deactivated' => {
    if (!member.is_active && member.last_login_at) return 'deactivated';
    if (!member.is_active) return 'pending';
    return 'active';
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
              <CardDescription className="text-xs">
                {teamLimit
                  ? `${teamLimit.current} of ${teamLimit.max} members on ${teamLimit.plan} plan`
                  : 'Manage your team'}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                className="text-xs h-8"
                onClick={() => setInviteDialogOpen(true)}
                disabled={teamLimit ? teamLimit.current >= teamLimit.max : false}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No team members found</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {members.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  currentUserId={currentUser?.id || ''}
                  isAdmin={isAdmin || false}
                  inviteStatus={getInviteStatus(member)}
                  roleChanging={roleChanging}
                  onRoleChange={handleRoleChange}
                  onAction={(type) =>
                    setConfirmAction({ type, userId: member.id, userName: member.name })
                  }
                />
              ))}
            </div>
          )}

          {/* Progress bar for member limit */}
          {teamLimit && (
            <div className="mt-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Team capacity</span>
                <span className="text-[10px] text-muted-foreground">
                  {teamLimit.current}/{teamLimit.max}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (teamLimit.current / teamLimit.max) * 100)}%` }}
                />
              </div>
              {teamLimit.current >= teamLimit.max && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Upgrade your plan to add more team members
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'deactivate' && 'Deactivate Team Member'}
              {confirmAction?.type === 'remove' && 'Remove Team Member'}
              {confirmAction?.type === 'reinvite' && 'Resend Invitation'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'deactivate' &&
                `Are you sure you want to deactivate ${confirmAction.userName}? They will lose access immediately.`}
              {confirmAction?.type === 'remove' &&
                `Are you sure you want to remove ${confirmAction.userName} from the team? This action cannot be undone.`}
              {confirmAction?.type === 'reinvite' &&
                `Resend invitation to ${confirmAction.userName}? A new invite link will be generated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmAction?.type === 'remove' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={confirming}
            >
              {confirming && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {confirmAction?.type === 'deactivate' && 'Deactivate'}
              {confirmAction?.type === 'remove' && 'Remove'}
              {confirmAction?.type === 'reinvite' && 'Resend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Team Member Row ---

interface TeamMemberRowProps {
  member: TeamMember;
  currentUserId: string;
  isAdmin: boolean;
  inviteStatus: 'active' | 'pending' | 'deactivated';
  roleChanging: string | null;
  onRoleChange: (userId: string, role: string) => Promise<void>;
  onAction: (type: 'deactivate' | 'remove' | 'reinvite') => void;
}

function TeamMemberRow({
  member,
  currentUserId,
  isAdmin,
  inviteStatus,
  roleChanging,
  onRoleChange,
  onAction,
}: TeamMemberRowProps) {
  const isSelf = member.id === currentUserId;
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback
          className={`text-xs font-semibold ${
            inviteStatus === 'active'
              ? 'bg-primary text-primary-foreground'
              : inviteStatus === 'pending'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium truncate">{member.name}</p>
          {isSelf && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 border-0">
              You
            </Badge>
          )}
          {inviteStatus === 'pending' && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
              Pending
            </Badge>
          )}
          {inviteStatus === 'deactivated' && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
          {member.last_login_at && inviteStatus === 'active' && (
            <span className="text-[10px] text-muted-foreground">
              · {formatRelativeTime(member.last_login_at)}
            </span>
          )}
        </div>
      </div>

      {/* Role */}
      <div className="shrink-0">
        {isAdmin && !isSelf && inviteStatus === 'active' ? (
          <Select
            value={member.role}
            onValueChange={(role) => onRoleChange(member.id, role)}
            disabled={roleChanging === member.id}
          >
            <SelectTrigger className="h-7 w-[130px] text-[10px]">
              {roleChanging === member.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              {VALID_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>

      {/* Actions */}
      {isAdmin && !isSelf && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {inviteStatus === 'pending' && (
              <DropdownMenuItem onClick={() => onAction('reinvite')}>
                <Send className="h-3 w-3 mr-2" />
                Resend Invite
              </DropdownMenuItem>
            )}
            {inviteStatus === 'deactivated' && (
              <DropdownMenuItem onClick={() => onAction('reinvite')}>
                <RotateCcw className="h-3 w-3 mr-2" />
                Reactivate
              </DropdownMenuItem>
            )}
            {inviteStatus === 'active' && (
              <DropdownMenuItem onClick={() => onAction('deactivate')}>
                <Ban className="h-3 w-3 mr-2" />
                Deactivate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction('remove')}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d`;
    return date.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
