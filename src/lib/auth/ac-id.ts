// ============================================
// TrimedCast - AC-ID Generation Utility
// Auto-generated Account ID for each tenant
// Format: TC-{YEAR}-{DIVISION}-{SEQUENCE}
// Example: TC-2025-DHK-0001
// ============================================

import { db } from '@/lib/db';

// BD Division codes (3-letter uppercase)
export const DIVISION_CODES: Record<string, string> = {
  dhaka: 'DHK',
  chittagong: 'CTG',
  sylhet: 'SYL',
  rajshahi: 'RAJ',
  khulna: 'KHL',
  barishal: 'BAR',
  rangpur: 'RNG',
  mymensingh: 'MYM',
} as const;

export const VALID_DIVISIONS = Object.keys(DIVISION_CODES);

/**
 * Validate a division name
 */
export function isValidDivision(division: string): boolean {
  return division.toLowerCase() in DIVISION_CODES;
}

/**
 * Get the 3-letter division code
 */
export function getDivisionCode(division: string): string {
  const code = DIVISION_CODES[division.toLowerCase()];
  if (!code) throw new Error(`Invalid division: ${division}`);
  return code;
}

/**
 * Generate a unique AC-ID for a new tenant
 * Format: TC-{YEAR}-{DIVISION}-{SEQUENCE}
 * 
 * SEQUENCE is 4-digit zero-padded, counting tenants 
 * created in the same year + division.
 */
export async function generateAcId(division: string): Promise<string> {
  if (!isValidDivision(division)) {
    throw new Error(`Invalid division: ${division}. Must be one of: ${VALID_DIVISIONS.join(', ')}`);
  }

  const year = new Date().getFullYear();
  const divCode = getDivisionCode(division);
  const prefix = `TC-${year}-${divCode}-`;

  // Count existing tenants with this prefix to determine next sequence
  const existingTenants = await db.tenant.findMany({
    where: {
      acId: { startsWith: prefix },
    },
    select: { acId: true },
    orderBy: { acId: 'desc' },
  });

  let nextSeq = 1;
  if (existingTenants.length > 0) {
    // Extract sequence number from the latest AC-ID
    const latestAcId = existingTenants[0].acId;
    const seqStr = latestAcId.split('-').pop();
    if (seqStr) {
      nextSeq = parseInt(seqStr, 10) + 1;
    }
  }

  const sequence = String(nextSeq).padStart(4, '0');
  const acId = `${prefix}${sequence}`;

  // Verify uniqueness (race condition safety)
  const exists = await db.tenant.findUnique({ where: { acId } });
  if (exists) {
    // Retry with incremented sequence
    return generateAcId(division);
  }

  return acId;
}

/**
 * Parse an AC-ID into its components
 */
export function parseAcId(acId: string): { year: number; divisionCode: string; sequence: number } | null {
  // Match pattern: TC-2025-DHK-0001
  const match = acId.match(/^TC-(\d{4})-([A-Z]{3})-(\d{4})$/);
  if (!match) return null;

  return {
    year: parseInt(match[1], 10),
    divisionCode: match[2],
    sequence: parseInt(match[3], 10),
  };
}

/**
 * Validate an AC-ID format
 */
export function isValidAcId(acId: string): boolean {
  return parseAcId(acId) !== null;
}

/**
 * Resolve tenant ID from an AC-ID
 * Returns the tenant ID if found, null otherwise
 */
export async function resolveTenantByAcId(acId: string): Promise<string | null> {
  const tenant = await db.tenant.findUnique({
    where: { acId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

/**
 * Get division name from AC-ID
 */
export function getDivisionFromAcId(acId: string): string | null {
  const parsed = parseAcId(acId);
  if (!parsed) return null;

  const entry = Object.entries(DIVISION_CODES).find(
    ([_, code]) => code === parsed.divisionCode
  );
  return entry ? entry[0] : null;
}
