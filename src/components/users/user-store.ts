// ============================================
// User Management Store — Zustand
// Session 15: Team management state
// ============================================

import { create } from 'zustand';
import type { TeamMember, UserSession, ActivityEntry, TeamLimitInfo } from './types';

interface UserManagementStore {
  // Team members
  members: TeamMember[];
  membersLoading: boolean;
  membersError: string | null;
  teamLimit: TeamLimitInfo | null;
  fetchMembers: () => Promise<void>;

  // Invite dialog
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (open: boolean) => void;

  // Selected user (for detail panel / dialogs)
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;

  // User sessions
  sessions: UserSession[];
  sessionsLoading: boolean;
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;

  // Activity log
  activity: ActivityEntry[];
  activityLoading: boolean;
  activityPage: number;
  activityTotal: number;
  fetchActivity: (page?: number, filters?: ActivityFilters) => Promise<void>;

  // Profile update
  updateProfile: (data: { name: string; phone?: string }) => Promise<boolean>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<boolean>;

  // Team management (admin)
  inviteMember: (data: { email: string; name: string; role: string; phone?: string }) => Promise<boolean>;
  updateUser: (userId: string, data: { name?: string; phone?: string; role?: string }) => Promise<boolean>;
  changeRole: (userId: string, role: string) => Promise<boolean>;
  deactivateUser: (userId: string) => Promise<boolean>;
  reactivateUser: (userId: string) => Promise<boolean>;
  removeUser: (userId: string) => Promise<boolean>;
  reinviteUser: (userId: string) => Promise<boolean>;

  // Toast
  lastAction: { type: 'success' | 'error'; message: string } | null;
  clearLastAction: () => void;
}

export interface ActivityFilters {
  entity?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

function setAction(type: 'success' | 'error', message: string) {
  return { lastAction: { type, message } };
}

export const useUserManagementStore = create<UserManagementStore>((set, get) => ({
  // Team members
  members: [],
  membersLoading: false,
  membersError: null,
  teamLimit: null,

  fetchMembers: async () => {
    set({ membersLoading: true, membersError: null });
    try {
      const res = await fetch('/api/v1/users', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        set({
          members: json.data.members || [],
          teamLimit: {
            current: json.data.total || 0,
            max: json.data.max_members || 5,
            plan: 'starter',
          },
          membersLoading: false,
        });
      } else {
        set({ membersError: json.errors?.[0]?.message || 'Failed to load team', membersLoading: false });
      }
    } catch (err) {
      set({ membersError: err instanceof Error ? err.message : 'Network error', membersLoading: false });
    }
  },

  // Invite dialog
  inviteDialogOpen: false,
  setInviteDialogOpen: (open) => set({ inviteDialogOpen: open }),

  // Selected user
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),

  // Sessions
  sessions: [],
  sessionsLoading: false,

  fetchSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const res = await fetch('/api/v1/users/sessions', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        set({ sessions: json.data.sessions || [], sessionsLoading: false });
      } else {
        set({ sessions: [], sessionsLoading: false });
      }
    } catch {
      set({ sessions: [], sessionsLoading: false });
    }
  },

  revokeSession: async (sessionId) => {
    try {
      const res = await fetch(`/api/v1/users/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== sessionId),
          ...setAction('success', 'Session revoked'),
        }));
      }
    } catch {
      set(setAction('error', 'Failed to revoke session'));
    }
  },

  // Activity
  activity: [],
  activityLoading: false,
  activityPage: 1,
  activityTotal: 0,

  fetchActivity: async (page = 1, filters?: ActivityFilters) => {
    set({ activityLoading: true });
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (filters?.entity) params.set('entity', filters.entity);
      if (filters?.action) params.set('action', filters.action);
      if (filters?.user_id) params.set('user_id', filters.user_id);
      if (filters?.date_from) params.set('date_from', filters.date_from);
      if (filters?.date_to) params.set('date_to', filters.date_to);

      const res = await fetch(`/api/v1/users/activity?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        set({
          activity: json.data.entries || [],
          activityPage: page,
          activityTotal: json.meta?.total || 0,
          activityLoading: false,
        });
      } else {
        set({ activity: [], activityLoading: false });
      }
    } catch {
      set({ activity: [], activityLoading: false });
    }
  },

  // Profile
  updateProfile: async (data) => {
    try {
      const res = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'Profile updated'));
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Update failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  changePassword: async (data) => {
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'Password changed successfully'));
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Password change failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  // Team management (admin)
  inviteMember: async (data) => {
    try {
      const res = await fetch('/api/v1/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        set({ inviteDialogOpen: false, ...setAction('success', `Invitation sent to ${data.email}`) });
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Invite failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  updateUser: async (userId, data) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'User updated'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Update failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  changeRole: async (userId, role) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'Role updated'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Role change failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  deactivateUser: async (userId) => {
    try {
      const res = await fetch('/api/v1/users/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'User deactivated'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Deactivation failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  reactivateUser: async (userId) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}/reactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'User reactivated'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Reactivation failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  removeUser: async (userId) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'User removed from team'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Removal failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  reinviteUser: async (userId) => {
    try {
      const res = await fetch('/api/v1/users/reinvite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (json.success) {
        set(setAction('success', 'Invitation resent'));
        get().fetchMembers();
        return true;
      }
      set(setAction('error', json.errors?.[0]?.message || 'Reinvite failed'));
      return false;
    } catch {
      set(setAction('error', 'Network error'));
      return false;
    }
  },

  // Toast
  lastAction: null,
  clearLastAction: () => set({ lastAction: null }),
}));
