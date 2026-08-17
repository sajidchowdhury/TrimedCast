# Session 17-2: Seasonality Type Management API

## Summary
Created 4 API route files for SeasonalityType CRUD + bulk-toggle + presets, and added RBAC permissions.

## Files Created/Modified
1. **Modified** `/src/lib/api/auth.ts` — Added `forecast_settings.crud` and `forecast_settings.read` to all 7 roles
2. **Created** `/src/app/api/v1/seasonality-types/route.ts` — GET (list) + POST (create)
3. **Created** `/src/app/api/v1/seasonality-types/[id]/route.ts` — GET (single) + PUT (update) + DELETE (delete)
4. **Created** `/src/app/api/v1/seasonality-types/bulk-toggle/route.ts` — POST (bulk activate/deactivate)
5. **Created** `/src/app/api/v1/seasonality-types/presets/route.ts` — GET (static BD presets, months, holidays)

## Key Design Decisions
- RBAC uses `forecast_settings.crud` for write ops and `forecast_settings.read` for read ops
- Unauthenticated GET on list route falls back to `resolveTenant()` for demo mode
- `isDefault=true` types are protected: name cannot be changed, cannot be deleted, cannot be bulk-toggled
- months stored as JSON string in DB, parsed to number[] in API responses
- Auto-name generation from label (snake_case) when name omitted in POST
- presets endpoint requires no auth (static reference data)
- Audit logs created for all mutations (create, update, delete, bulk_toggle)

## Lint: PASS (0 errors)
