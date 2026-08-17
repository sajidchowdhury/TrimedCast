// ============================================
// PUT /api/v1/auth/profile
// Update own profile (name, phone)
// Any authenticated user
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { validatePhone, normalizePhone } from '@/lib/auth/password';
export const runtime = 'nodejs';


export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const body = await request.json();
    const { name, phone } = body;

    // At least one field must be provided
    if (name === undefined && phone === undefined) {
      return validationError('body', 'At least one of name or phone is required');
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return validationError('name', 'Name must be at least 2 characters');
      }
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!validatePhone(phone)) {
        return validationError('phone', 'Invalid BD phone number format');
      }
    }

    // Build update data
    const updateData: { name?: string; phone?: string | null } = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone && phone !== '' ? normalizePhone(phone) : null;
    }

    // Get before state for audit
    const before = await db.user.findUnique({
      where: { id: context.userId },
      select: { name: true, phone: true },
    });

    // Update user
    const user = await db.user.update({
      where: { id: context.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        updatedAt: true,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: context.userId,
      changes: {
        before: { name: before?.name, phone: before?.phone },
        after: { name: user.name, phone: user.phone },
      },
      metadata: { action: 'update_own_profile' },
    });

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('[Auth/Profile/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update profile' }, 500);
  }
}
