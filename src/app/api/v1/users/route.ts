// ============================================
// GET /api/v1/users - List users for tenant
// POST /api/v1/users - Create user
// RBAC: warehouse_manager only
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError, parsePagination, forbiddenError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager only (users.manage)
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    const where = { tenantId };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      db.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      is_active: u.isActive,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[Users/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch users' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager only (users.manage)
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    // Validation
    if (!name) return validationError('name', 'name is required');
    if (!email) return validationError('email', 'email is required');
    if (!password) return validationError('password', 'password is required');
    if (!role) return validationError('role', 'role is required');

    // Validate role
    const validRoles = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];
    if (!validRoles.includes(role)) {
      return validationError('role', `role must be one of: ${validRoles.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationError('email', 'Invalid email format');
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return apiError({ code: 'CONFLICT', message: 'Email already exists', field: 'email' }, 409);
    }

    // Hash password using simple base64 encoding (demo - production would use bcrypt)
    const passwordHash = Buffer.from(password).toString('base64');

    const user = await db.user.create({
      data: {
        email,
        name,
        role,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Store password hash in a metadata field (since User model doesn't have password field)
    // In production, you'd add a passwordHash field to the User model
    // For demo, we log it in audit trail
    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'user',
      entityId: user.id,
      changes: { after: { name, email, role, password_hash: passwordHash } },
      metadata: { password_hash: passwordHash },
    });

    return apiCreated({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.isActive,
    });
  } catch (error) {
    console.error('[Users/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create user' }, 500);
  }
}
