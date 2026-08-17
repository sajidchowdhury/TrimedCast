// ============================================
// User Management Types
// Session 15: User Management UI + API
// ============================================

/** BD role labels (English + Bengali) */
export const ROLE_LABELS: Record<string, { en: string; bn: string; color: string }> = {
  admin: { en: 'Admin', bn: 'অ্যাডমিন', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  warehouse_manager: { en: 'Warehouse Manager', bn: 'গোডাউন ম্যানেজার', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  sales_manager: { en: 'Sales Manager', bn: 'সেলস ম্যানেজার', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  marketing_manager: { en: 'Marketing Manager', bn: 'মার্কেটিং ম্যানেজার', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  finance: { en: 'Finance', bn: 'ফিন্যান্স', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  executive: { en: 'Executive', bn: 'এক্সিকিউটিভ', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  viewer: { en: 'Viewer', bn: 'দর্শক', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

export const VALID_ROLES = [
  'admin',
  'warehouse_manager',
  'sales_manager',
  'marketing_manager',
  'finance',
  'executive',
  'viewer',
] as const;

export type UserRole = (typeof VALID_ROLES)[number];

/** Team member as returned from API */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  /** Invite status — derived from is_active + presence of invite */
  invite_status?: 'active' | 'pending' | 'deactivated';
}

/** User session */
export interface UserSession {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  /** Is this the current session? */
  is_current?: boolean;
}

/** Audit log entry */
export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  user_name?: string;
  user_email?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Invite form data */
export interface InviteFormData {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

/** Profile form data */
export interface ProfileFormData {
  name: string;
  phone?: string;
}

/** Password change form data */
export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/** Team member limit info */
export interface TeamLimitInfo {
  current: number;
  max: number;
  plan: string;
}
