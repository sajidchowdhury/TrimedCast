// ============================================
// TrimedCast - RBAC Permission Guard Components
// Session 16: Role-Based Access Control
// Declarative permission/role/field gating for UI
// ============================================

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/context';
import { isFieldRestricted, isReadOnlyRole } from '@/lib/api/rbac';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PermissionGuardProps,
  RoleGuardProps,
  FieldGuardProps,
  ReadOnlyGuardProps,
  PermissionGateProps,
  RbacGuardResult,
} from './types';

// ============================================
// PermissionGuard
// Renders children only if user has specified permission(s)
// ============================================

export function PermissionGuard({
  permission,
  fallback = null,
  mode = 'any',
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, permissions } = useAuth();

  const perms = Array.isArray(permission) ? permission : [permission];

  let allowed: boolean;
  if (perms.length === 1) {
    allowed = hasPermission(perms[0]);
  } else if (mode === 'all') {
    allowed = perms.every((p) => permissions.includes(p));
  } else {
    allowed = hasAnyPermission(perms);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ============================================
// RoleGuard
// Renders children only if user has specified role(s)
// ============================================

export function RoleGuard({
  role,
  fallback = null,
  mode = 'any',
  children,
}: RoleGuardProps) {
  const { user } = useAuth();

  const roles = Array.isArray(role) ? role : [role];
  const userRole = user?.role ?? '';

  let allowed: boolean;
  if (mode === 'all') {
    allowed = roles.every((r) => r === userRole);
  } else {
    allowed = roles.includes(userRole);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ============================================
// FieldGuard
// Conditionally hides/masks fields based on role's restricted fields
// ============================================

export function FieldGuard({
  field,
  mode = 'hide',
  maskChar = '•••',
  children,
}: FieldGuardProps) {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const restricted = isFieldRestricted(role, field);

  if (!restricted) {
    return <>{children}</>;
  }

  if (mode === 'mask') {
    return <span className="select-none" aria-label="Restricted field">{maskChar}</span>;
  }

  // mode === 'hide'
  return null;
}

// ============================================
// ReadOnlyGuard
// Disables edit buttons/actions for read-only roles
// ============================================

export function ReadOnlyGuard({
  children,
  showDisabled = true,
}: ReadOnlyGuardProps) {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const readOnly = isReadOnlyRole(role);

  if (!readOnly) {
    return <>{children}</>;
  }

  if (showDisabled) {
    // Clone children and inject disabled + aria-disabled
    return (
      <div className="pointer-events-none opacity-50" aria-disabled="true">
        {children}
      </div>
    );
  }

  // Hide entirely
  return null;
}

// ============================================
// PermissionGate
// Combines permission check with loading state
// Shows skeleton while loading, then renders children or fallback
// ============================================

export function PermissionGate({
  permission,
  fallback = null,
  mode = 'any',
  skeletonLines = 1,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, permissions, isLoading } = useAuth();

  // Show skeleton while auth is loading
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  const perms = Array.isArray(permission) ? permission : [permission];

  let allowed: boolean;
  if (perms.length === 1) {
    allowed = hasPermission(perms[0]);
  } else if (mode === 'all') {
    allowed = perms.every((p) => permissions.includes(p));
  } else {
    allowed = hasAnyPermission(perms);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ============================================
// useRbacGuard
// Combined hook for all RBAC checks
// ============================================

export function useRbacGuard(): RbacGuardResult {
  const { user, permissions, hasPermission, hasAnyPermission, isLoading } = useAuth();
  const role = user?.role ?? null;

  const hasAllPermissions = (perms: string[]) =>
    perms.every((p) => permissions.includes(p));

  const checkFieldRestricted = (field: string): boolean => {
    if (!role) return false;
    return isFieldRestricted(role, field);
  };

  return {
    allowed: permissions.length > 0,
    isLoading,
    role,
    isReadOnly: role ? isReadOnlyRole(role) : false,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isFieldRestricted: checkFieldRestricted,
  };
}
