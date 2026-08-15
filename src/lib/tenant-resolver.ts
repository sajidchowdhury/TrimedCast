// ============================================
// Tenant Resolver - Resolves slug or ID to actual tenant ID
// ============================================

import { db } from '@/lib/db';

/**
 * Resolve a tenantId which could be either a slug or an actual cuid
 * Returns the actual tenant.id from the database
 */
export async function resolveTenantId(tenantIdOrSlug: string): Promise<string> {
  // First try direct lookup by id
  const byId = await db.tenant.findUnique({ where: { id: tenantIdOrSlug } });
  if (byId) return byId.id;

  // Try lookup by slug
  const bySlug = await db.tenant.findUnique({ where: { slug: tenantIdOrSlug } });
  if (bySlug) return bySlug.id;

  // Fallback: return first active tenant
  const first = await db.tenant.findFirst({ where: { isActive: true } });
  if (first) return first.id;

  // Last resort: return the input as-is
  return tenantIdOrSlug;
}
