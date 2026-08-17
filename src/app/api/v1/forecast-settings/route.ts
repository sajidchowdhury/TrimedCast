// ============================================
// GET /api/v1/forecast-settings - Get forecast settings for tenant
// PUT /api/v1/forecast-settings - Update forecast settings
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, forbiddenError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


function formatSettings(s: {
  id: string;
  model: string;
  horizonDays: number;
  confidenceLevel: number;
  seasonalityMode: string;
  includeHolidays: boolean;
  includePromos: boolean;
  cnyAdjustment: boolean;
  autoRecalibration: boolean;
  recalibrationThreshold: number;
  lastCalibrationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    model: s.model,
    horizon_days: s.horizonDays,
    confidence_level: s.confidenceLevel,
    seasonality_mode: s.seasonalityMode,
    include_holidays: s.includeHolidays,
    include_promos: s.includePromos,
    cny_adjustment: s.cnyAdjustment,
    auto_recalibration: s.autoRecalibration,
    recalibration_threshold: s.recalibrationThreshold,
    last_calibration_date: s.lastCalibrationDate,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: All (read) - settings.read or settings.crud
    const canRead = canDo(context, 'settings.read') || canDo(context, 'settings.crud');
    if (!canRead) {
      return forbiddenError();
    }

    // Get or create default settings for tenant
    let settings = await db.forecastSetting.findFirst({
      where: { tenantId, productId: null },
    });

    if (!settings) {
      // Create default settings for tenant
      settings = await db.forecastSetting.create({
        data: {
          tenantId,
          model: 'prophet',
          horizonDays: 90,
          confidenceLevel: 0.95,
          seasonalityMode: 'multiplicative',
          includeHolidays: true,
          includePromos: true,
          cnyAdjustment: true,
          autoRecalibration: true,
          recalibrationThreshold: 0.15,
        },
      });
    }

    return apiSuccess(formatSettings(settings));
  } catch (error) {
    console.error('[ForecastSettings/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch forecast settings' }, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager only (settings.crud)
    if (!canDo(context, 'settings.crud')) {
      return forbiddenError();
    }

    // Get or create default settings for tenant
    let settings = await db.forecastSetting.findFirst({
      where: { tenantId, productId: null },
    });

    if (!settings) {
      settings = await db.forecastSetting.create({
        data: {
          tenantId,
          model: 'prophet',
          horizonDays: 90,
          confidenceLevel: 0.95,
          seasonalityMode: 'multiplicative',
          includeHolidays: true,
          includePromos: true,
          cnyAdjustment: true,
          autoRecalibration: true,
          recalibrationThreshold: 0.15,
        },
      });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Allowed fields for partial update
    const allowedFields = [
      'model', 'horizon_days', 'confidence_level', 'seasonality_mode',
      'include_holidays', 'include_promos', 'cny_adjustment',
      'auto_recalibration', 'recalibration_threshold',
      'default_alpha', 'manufacturing_lead_time_days',
      'cny_shutdown_start', 'cny_shutdown_end',
    ];

    const fieldMap: Record<string, string> = {
      horizon_days: 'horizonDays',
      confidence_level: 'confidenceLevel',
      seasonality_mode: 'seasonalityMode',
      include_holidays: 'includeHolidays',
      include_promos: 'includePromos',
      cny_adjustment: 'cnyAdjustment',
      auto_recalibration: 'autoRecalibration',
      recalibration_threshold: 'recalibrationThreshold',
      // Extra fields from the API spec request example - store in metadata pattern
      // These are not in the schema, so we skip them gracefully
      default_alpha: '__skip',
      manufacturing_lead_time_days: '__skip',
      cny_shutdown_start: '__skip',
      cny_shutdown_end: '__skip',
    };

    // Validate model if provided
    if (body.model !== undefined) {
      const validModels = ['prophet', 'arima', 'ets', 'ensemble'];
      if (!validModels.includes(body.model)) {
        return validationError('model', `model must be one of: ${validModels.join(', ')}`);
      }
    }

    // Validate confidence_level if provided
    if (body.confidence_level !== undefined) {
      if (body.confidence_level < 0 || body.confidence_level > 1) {
        return validationError('confidence_level', 'confidence_level must be between 0 and 1');
      }
    }

    // Validate seasonality_mode if provided
    if (body.seasonality_mode !== undefined) {
      const validModes = ['multiplicative', 'additive'];
      if (!validModes.includes(body.seasonality_mode)) {
        return validationError('seasonality_mode', `seasonality_mode must be one of: ${validModes.join(', ')}`);
      }
    }

    // Validate recalibration_threshold if provided
    if (body.recalibration_threshold !== undefined) {
      if (body.recalibration_threshold < 0 || body.recalibration_threshold > 1) {
        return validationError('recalibration_threshold', 'recalibration_threshold must be between 0 and 1');
      }
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = fieldMap[field] || field;
        if (dbField === '__skip') continue; // Skip fields not in schema
        updates[dbField] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return validationError('fields', 'At least one field must be provided for update');
    }

    const before = { ...settings };
    const updated = await db.forecastSetting.update({
      where: { id: settings.id },
      data: updates,
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'forecast_setting',
      entityId: settings.id,
      changes: { before: formatSettings(before as never), after: updates },
    });

    return apiSuccess(formatSettings(updated));
  } catch (error) {
    console.error('[ForecastSettings/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update forecast settings' }, 500);
  }
}
