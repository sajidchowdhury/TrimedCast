# Task 4: Build AI Query + Scenario Preview APIs

## Files Created

1. `/src/app/api/ai/query/route.ts` - AI Query API (POST)
2. `/src/app/api/ai/scenario-preview/route.ts` - Scenario Preview API (POST)
3. `/src/app/api/ai/conversations/route.ts` - Conversations API (GET, POST, DELETE)

## Key Decisions

- New routes under `/api/ai/` (separate from existing `/api/v1/ai/`) to avoid breaking existing AI functionality
- Conversation memory: in-memory Map with per-session tracking and auto-cleanup (30min idle for query, 2hr for conversations)
- Dual-layer rate limiting: per-tenant counter + shared `checkRateLimit` module
- 8 context types for data gathering (stockout_risk, forecast_accuracy, order_timing, seasonal, lead_time_scenario, cash_flow, overstock, general)
- Scenario engine uses actual forecasting models from `/src/lib/forecasting/eoq-safety-stock.ts` for calculations
- BD-China supply chain constants: sea=90d, air=35d total lead time, BDT 45/unit sea shipping, BDT 315/unit air freight
- LLM explanations generated via z-ai-web-dev-sdk for scenario impact summaries

## Dependencies

- z-ai-web-dev-sdk (LLM for query answering and scenario explanations)
- @/lib/db (Prisma client for all database queries)
- @/lib/api/auth (getAuthContext, resolveTenant for tenant resolution)
- @/lib/api/rate-limit (checkRateLimit for AI rate limiting)
- @/lib/forecasting/models (getBDSeason, BD_SEASONS for seasonal context)
- @/lib/forecasting/prophet-engine (isCNYShutdown, isCNYRisk, CNY_CALENDAR for CNY detection)
- @/lib/forecasting/eoq-safety-stock (calculateEOQWithConstraints, calculateSafetyStockEnhanced, getSafetyFactor for scenario calculations)

## API Contracts

### POST /api/ai/query
Request: `{ query: string, context?: { current_season?, tenant_id?, user_role?, session_id? } }`
Response: `{ success: true, data: { answer, source_data, scenario_preview, context_type, session_id, timestamp } }`

### POST /api/ai/scenario-preview
Request: `{ query, base_state: { product_id, current_lead_time_mode, current_safety_stock }, modifications: { lead_time_mode?, promo_index?, service_level?, order_quantity_override? } }`
Response: `{ success: true, data: { answer, impact_summary, shadow_forecast_data, product_data, modifications_applied, timestamp } }`

### GET /api/ai/conversations
Response: `{ success: true, data: { sessions, total_sessions, limit, offset } }`

### DELETE /api/ai/conversations?session_id=xxx (or ?clear_all=true)
Response: `{ success: true, data: { deleted, messages_cleared } }`
