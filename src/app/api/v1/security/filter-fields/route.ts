// ============================================
// POST /api/v1/security/filter-fields
// Filters restricted fields from response data based on user's role
// Body: { data: Record<string, unknown> | Record<string, unknown>[], role?: string }
// If role not provided, uses authenticated user's role
// If not authenticated, falls back to warehouse_manager for demo
// Returns: { filtered_data, removed_fields: string[], role }
// Uses: isFieldRestricted() from rbac.ts
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { isFieldRestricted, getRestrictedFields, isValidRole } from '@/lib/api/rbac';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const context = await getAuthContext();

    // Validate input data
    if (!body.data) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: '"data" field is required in the request body' },
        400
      );
    }

    // Resolve role: from body, auth context, or fallback to warehouse_manager
    let role: string;
    if (body.role && typeof body.role === 'string' && isValidRole(body.role)) {
      role = body.role;
    } else if (context.isAuthenticated) {
      role = context.role;
    } else {
      // Fallback: find first active user for demo mode
      const user = await db.user.findFirst({ where: { isActive: true } });
      role = user?.role ?? 'warehouse_manager';
    }

    // Validate role
    if (!isValidRole(role)) {
      role = 'warehouse_manager';
    }

    const restrictedFields = getRestrictedFields(role);

    // Filter a single record
    function filterRecord(
      record: Record<string, unknown>
    ): { filtered: Record<string, unknown>; removed: string[] } {
      const removed: string[] = [];
      const filtered: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(record)) {
        if (isFieldRestricted(role, key)) {
          removed.push(key);
        } else {
          filtered[key] = value;
        }
      }

      return { filtered, removed };
    }

    // Process data: single record or array of records
    const isDataArray = Array.isArray(body.data);
    const removedFieldsSet = new Set<string>();

    let filteredData: Record<string, unknown> | Record<string, unknown>[];

    if (isDataArray) {
      const dataArray = body.data as Record<string, unknown>[];
      filteredData = dataArray.map((record) => {
        const { filtered, removed } = filterRecord(record);
        removed.forEach((f) => removedFieldsSet.add(f));
        return filtered;
      });
    } else {
      const record = body.data as Record<string, unknown>;
      const { filtered, removed } = filterRecord(record);
      removed.forEach((f) => removedFieldsSet.add(f));
      filteredData = filtered;
    }

    return apiSuccess({
      filtered_data: filteredData,
      removed_fields: Array.from(removedFieldsSet).sort(),
      role,
      restricted_fields: restrictedFields,
    });
  } catch (error) {
    console.error('[Security/FilterFields]', error);
    return internalError('Failed to filter fields');
  }
}
