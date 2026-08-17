// ============================================
// GET /api/v1/suppliers - List suppliers
// POST /api/v1/suppliers - Create supplier
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError, parsePagination, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);

    const { page, perPage, skip, take } = parsePagination(url);
    const search = url.searchParams.get('search');
    const country = url.searchParams.get('country');

    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
      ...(country ? { country } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where, skip, take,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      }),
      db.supplier.count({ where }),
    ]);

    const data = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      country: s.country,
      lead_time_days: s.leadTimeDays,
      reliability: s.reliability,
      is_cny_affected: s.isCnyAffected,
      contact_email: s.contactEmail,
      contact_phone: s.contactPhone,
      notes: s.notes,
      product_count: s._count.products,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[Suppliers/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch suppliers' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'suppliers.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { name, code, country, lead_time_days, reliability, is_cny_affected, contact_email, contact_phone, notes } = body;

    if (!name) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'name is required', field: 'name' }, 400);
    }

    const supplier = await db.supplier.create({
      data: {
        tenantId,
        name,
        code: code || null,
        country: country || 'China',
        leadTimeDays: lead_time_days || 90,
        reliability: reliability || null,
        isCnyAffected: is_cny_affected !== undefined ? is_cny_affected : true,
        contactEmail: contact_email || null,
        contactPhone: contact_phone || null,
        notes: notes || null,
        isActive: true,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'create',
      entity: 'supplier',
      entityId: supplier.id,
      changes: { after: body },
    });

    return apiCreated(supplier);
  } catch (error) {
    console.error('[Suppliers/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create supplier' }, 500);
  }
}
