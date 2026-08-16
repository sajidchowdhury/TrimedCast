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
