// ============================================
// TrimedCast API - Common Response Format
// Follows: API Contract & Integration Map.md Section 2
// ============================================

import { NextResponse } from 'next/server';

// --- Success Responses ---

export function apiSuccess(data: unknown, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiCreated(data: unknown, meta?: Record<string, unknown>) {
  return apiSuccess(data, meta, 201);
}

export function apiAccepted(data: unknown) {
  return apiSuccess(data, undefined, 202);
}

// --- Paginated Response ---

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
  tenant_id?: string;
}

export function apiPaginated(
  data: unknown[],
  page: number,
  perPage: number,
  total: number,
  tenantId?: string
) {
  const lastPage = Math.ceil(total / perPage) || 1;
  const from = total > 0 ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  const meta: PaginationMeta = {
    page,
    per_page: perPage,
    total,
    last_page: lastPage,
    from,
    to,
  };
  if (tenantId) meta.tenant_id = tenantId;

  return NextResponse.json({ success: true, data, meta });
}

// --- Error Responses ---

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export function apiError(
  errors: ApiError | ApiError[],
  status = 400,
  message?: string
) {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  return NextResponse.json(
    {
      success: false,
      data: null,
      errors: errorArray,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

// Convenience error constructors
export function validationError(field: string, message: string) {
  return apiError({ code: 'VALIDATION_ERROR', message, field }, 400);
}

export function unauthorizedError(message = 'Invalid or expired token') {
  return apiError({ code: 'UNAUTHORIZED', message }, 401);
}

export function forbiddenError(message = 'Role/permission denied for this action') {
  return apiError({ code: 'FORBIDDEN', message }, 403);
}

export function tenantIsolationError() {
  return apiError(
    { code: 'TENANT_ISOLATION_VIOLATION', message: 'Attempted cross-tenant data access' },
    403
  );
}

export function notFoundError(entity = 'Resource') {
  return apiError({ code: 'NOT_FOUND', message: `${entity} not found` }, 404);
}

export function conflictError(message: string) {
  return apiError({ code: 'CONFLICT', message }, 409);
}

export function rateLimitError() {
  return apiError({ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }, 429);
}

export function internalError(message = 'Unexpected server error') {
  return apiError({ code: 'INTERNAL_ERROR', message }, 500);
}

// --- Pagination Helper ---

export function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '50', 10)));
  const skip = (page - 1) * perPage;
  return { page, perPage, skip, take: perPage };
}
