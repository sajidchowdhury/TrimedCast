'use client';

// ============================================
// User Management Page — Full page component
// Combines: Profile, Team, Sessions, Activity
// ============================================

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, Monitor, Activity, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { UserProfileCard } from './user-profile-card';
import { ProfileForm } from './profile-form';
import { PasswordChangeForm } from './password-change-form';
import { TeamMembersPanel } from './team-members-panel';
import { SessionsPanel } from './sessions-panel';
import { ActivityLog } from './activity-log';
import { useUserManagementStore } from './user-store';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function UserManagementPage() {
  const { isAdmin } = useAuth();
  const { lastAction, clearLastAction } = useUserManagementStore();

  // Sub-view state for profile section
  const [profileView, setProfileView] = useState<'view' | 'edit' | 'password'>('view');

  // Show toast on actions
  useEffect(() => {
    if (lastAction) {
      if (lastAction.type === 'success') {
        toast.success(lastAction.message);
      } else {
        toast.error(lastAction.message);
      }
      clearLastAction();
    }
  }, [lastAction, clearLastAction]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-gray-500" />
          User Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Profile settings, team management, sessions, and activity log
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start h-9 bg-muted/50 p-0.5">
          <TabsTrigger value="profile" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <User className="h-3 w-3" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Users className="h-3 w-3" />
              Team
            </TabsTrigger>
          )}
          <TabsTrigger value="sessions" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Monitor className="h-3 w-3" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Activity className="h-3 w-3" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {profileView === 'view' && (
              <UserProfileCard
                onEditProfile={() => setProfileView('edit')}
                onChangePassword={() => setProfileView('password')}
              />
            )}
            {profileView === 'edit' && (
              <ProfileForm onCancel={() => setProfileView('view')} />
            )}
            {profileView === 'password' && (
              <PasswordChangeForm onCancel={() => setProfileView('view')} />
            )}

            {/* Quick info card */}
            <div className="space-y-4">
              <SessionsPanel />
            </div>
          </div>
        </TabsContent>

        {/* Team Tab (admin only) */}
        {isAdmin && (
          <TabsContent value="team" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TeamMembersPanel />
              <ActivityLog />
            </div>
          </TabsContent>
        )}

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SessionsPanel />
            <ActivityLog />
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
