// ============================================
// TrimedCast - Auth Store (Zustand)
// Client-side auth state management
// Synchronizes with AuthProvider context
// ============================================

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuthTenant {
  id: string;
  acId: string;
  name: string;
  shopName?: string | null;
  slug: string;
  plan: string;
  division: string;
  status: string;
  isActive: boolean;
  trialEndsAt?: string | null;
}

interface AuthStoreState {
  // State
  user: AuthUser | null;
  tenant: AuthTenant | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setTenant: (tenant: AuthTenant | null) => void;
  setPermissions: (permissions: string[]) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setAuthData: (data: {
    user: AuthUser;
    tenant: AuthTenant;
    permissions: string[];
  }) => void;
  clearAuth: () => void;

  // Computed
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isTenantActive: () => boolean;
  isTrialExpired: () => boolean;
}

const initialState = {
  user: null,
  tenant: null,
  permissions: [] as string[],
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  ...initialState,

  // Actions
  setUser: (user) => set({ user }),

  setTenant: (tenant) => set({ tenant }),

  setPermissions: (permissions) => set({ permissions }),

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setLoading: (isLoading) => set({ isLoading }),

  setAuthData: (data) => set({
    user: data.user,
    tenant: data.tenant,
    permissions: data.permissions,
    isAuthenticated: true,
    isLoading: false,
  }),

  clearAuth: () => set({
    ...initialState,
    isLoading: false,
  }),

  // Computed
  hasPermission: (permission) => get().permissions.includes(permission),

  hasAnyPermission: (permissions) => permissions.some(p => get().permissions.includes(p)),

  hasRole: (role) => get().user?.role === role,

  isAdmin: () => get().user?.role === 'admin',

  isTenantActive: () => {
    const tenant = get().tenant;
    return tenant?.isActive ?? false;
  },

  isTrialExpired: () => {
    const tenant = get().tenant;
    if (!tenant?.trialEndsAt) return false;
    return new Date(tenant.trialEndsAt) < new Date();
  },
}));
