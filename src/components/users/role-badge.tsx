'use client';

// ============================================
// Role Badge — Displays user role with color
// ============================================

import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from './types';

interface RoleBadgeProps {
  role: string;
  showBn?: boolean;
  className?: string;
}

export function RoleBadge({ role, showBn = false, className }: RoleBadgeProps) {
  const info = ROLE_LABELS[role] || { en: role, bn: role, color: 'bg-gray-100 text-gray-700' };

  return (
    <Badge variant="outline" className={`${info.color} border-0 text-[10px] font-medium px-1.5 py-0 ${className || ''}`}>
      {showBn ? info.bn : info.en}
    </Badge>
  );
}
