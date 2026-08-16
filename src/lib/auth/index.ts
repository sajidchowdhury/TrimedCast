// ============================================
// TrimedCast - Auth Module Exports
// All authentication utilities in one place
// ============================================

// AC-ID utilities
export {
  generateAcId,
  parseAcId,
  isValidAcId,
  isValidDivision,
  getDivisionCode,
  getDivisionFromAcId,
  DIVISION_CODES,
  VALID_DIVISIONS,
} from './ac-id';

// Password utilities
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
  validatePhone,
  normalizePhone,
} from './password';

// OTP utilities
export {
  createOtp,
  verifyOtp,
  isOtpVerified,
  getOtpCooldownSeconds,
  cleanupExpiredOtps,
} from './otp';

// Session store utilities
export {
  createSession,
  verifySession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  cleanupExpiredSessions,
} from './session-store';

// Middleware utilities
export {
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PREFIXES,
  AUTH_PAGES,
  ROLE_RESTRICTED_ROUTES,
  SUSPENSION_BLOCKED_PREFIXES,
  isPublicRoute,
  isAuthPage,
  getRequiredRoles,
  isBlockedForSuspended,
  validateSession,
  canAccessRoute,
  type SessionValidationResult,
} from './middleware';

// Auth context (React — client-side only)
export {
  AuthProvider,
  useAuth,
  usePermission,
  usePermissionGuard,
  useRoleGuard,
  type AuthUser,
  type AuthTenant,
  type AuthState,
  type AuthContextValue,
} from './context';
