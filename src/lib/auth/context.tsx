// ============================================
// TrimedCast - Auth Context Provider
// React context for client-side authentication
// Provides user, tenant, permissions, loading state
// ============================================

'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';

// --- Types ---

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface AuthTenant {
  id: string;
  ac_id: string;
  name: string;
  shop_name?: string | null;
  slug: string;
  plan: string;
  division: string;
  status: string;
  is_active: boolean;
  trial_ends_at?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  /** Refresh auth state from /me endpoint */
  refresh: () => Promise<void>;
  /** Logout and clear state */
  logout: () => Promise<void>;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has any of the given permissions */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user is an admin */
  isAdmin: boolean;
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Provider ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Prevent concurrent fetches
  const fetchingRef = useRef(false);

  // Fetch current user from /me
  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        // Not authenticated — clear state
        setState(prev => ({
          ...prev,
          user: null,
          tenant: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }));
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        setState({
          user: json.data.user,
          tenant: json.data.tenant,
          permissions: json.data.permissions || [],
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          tenant: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }));
      }
    } catch (err) {
      console.error('[AuthProvider] Failed to fetch auth state:', err);
      setState(prev => ({
        ...prev,
        user: null,
        tenant: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Auth check failed',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Call logout API to invalidate DB session
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('trimedcast-session='))
        ?.split('=')[1];

      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (err) {
      console.error('[AuthProvider] Logout failed:', err);
    }

    // Clear local state regardless
    setState({
      user: null,
      tenant: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Redirect to login
    window.location.href = '/login';
  }, []);

  // Permission checks
  const hasPermission = useCallback(
    (permission: string) => state.permissions.includes(permission),
    [state.permissions]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => permissions.some(p => state.permissions.includes(p)),
    [state.permissions]
  );

  const hasRole = useCallback(
    (role: string) => state.user?.role === role,
    [state.user?.role]
  );

  const isAdmin = state.user?.role === 'admin';

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const contextValue: AuthContextValue = {
    ...state,
    refresh,
    logout,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Hooks ---

/**
 * Get the full auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Check a specific permission
 * Returns { allowed, isLoading } for UI conditional rendering
 */
export function usePermission(permission: string): { allowed: boolean; isLoading: boolean } {
  const { hasPermission, isLoading } = useAuth();
  return { allowed: hasPermission(permission), isLoading };
}

/**
 * Guard a component behind a permission check
 * Returns { canAccess, isLoading } — render null or a fallback if !canAccess
 */
export function usePermissionGuard(permissions: string[]): { canAccess: boolean; isLoading: boolean } {
  const { hasAnyPermission, isLoading } = useAuth();
  return { canAccess: hasAnyPermission(permissions), isLoading };
}

/**
 * Guard a component behind a role check
 */
export function useRoleGuard(roles: string[]): { canAccess: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return { canAccess: user ? roles.includes(user.role) : false, isLoading };
}
