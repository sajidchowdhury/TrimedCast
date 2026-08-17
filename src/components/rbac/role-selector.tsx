// ============================================
// TrimedCast - Role Selector Component
// Session 16: Role-Based Access Control
// Dropdown for switching roles (demo/testing)
// ============================================

'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllRoles, ROLE_LABELS, type Role } from '@/lib/api/rbac';
import { ROLE_COLORS, BENGALI_ROLE_LABELS } from './types';

interface RoleSelectorProps {
  /** Currently selected role */
  currentRole: string;
  /** Callback when role changes */
  onRoleChange: (role: string) => void;
  /** Show Bengali labels instead of English */
  showBn?: boolean;
  /** Additional CSS class for the trigger */
  className?: string;
  /** Show role description as tooltip or subtitle */
  showDescription?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

export function RoleSelector({
  currentRole,
  onRoleChange,
  showBn = false,
  className,
  disabled = false,
}: RoleSelectorProps) {
  const roles = getAllRoles();

  const getLabel = (role: Role): string => {
    if (showBn) {
      return BENGALI_ROLE_LABELS[role] ?? ROLE_LABELS[role] ?? role;
    }
    return ROLE_LABELS[role] ?? role;
  };

  const currentColors = ROLE_COLORS[currentRole as Role];

  return (
    <Select
      value={currentRole}
      onValueChange={onRoleChange}
      disabled={disabled}
    >
      <SelectTrigger className={`w-[200px] ${className ?? ''}`}>
        <SelectValue>
          <span className="flex items-center gap-2">
            {currentColors && (
              <span
                className={`inline-block h-2 w-2 rounded-full ${currentColors.dot}`}
              />
            )}
            <span>{getLabel(currentRole as Role)}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => {
          const colors = ROLE_COLORS[role];
          return (
            <SelectItem key={role} value={role}>
              <span className="flex items-center gap-2">
                {colors && (
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${colors.dot}`}
                  />
                )}
                <span>{getLabel(role)}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
