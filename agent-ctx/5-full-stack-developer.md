# Task 5: Build Prophet-Enhanced Scenario Engine

## Agent: full-stack-developer

## Work Summary
Built the complete scenario simulation engine at `/src/lib/forecasting/scenario-engine.ts` (~670 lines).

## Key Deliverables
- **6 Scenario Runners**: runLeadTimeScenario, runPromoIndexScenario, runServiceLevelScenario, runPriceScenario, runOrderQuantityScenario, runMultiScenario
- **Shadow Forecast**: generateShadowForecast with BD seasonal multipliers
- **Impact Summary**: generateImpactSummary with risk level classification
- **Sea vs Air Comparison**: compareSeaVsAir with total cost of ownership
- **BD Season Calendar**: getBDSeasonCalendar export

## Architecture
- Pure TypeScript engine (no React, no API routes)
- Imports from `./models` (calculateEOQ, calculateSafetyStock, getBDSeason, getSeasonMultiplier)
- Imports from `./eoq-safety-stock` (getSafetyFactor)
- All types and functions exported for consumption by API routes and UI components

## Constants
- LEAD_TIME_CONFIG: sea (90 days, sigma=15), air (35 days, sigma=5)
- FREIGHT_COST: sea=45 BDT/unit, air=315 BDT/unit
- DEMAND_MODEL_BETAS: beta0=150, beta1=-2.5, beta2=300
- CNY_WINDOW: Jan 20 - Feb 20

## Quality
- TypeScript type-check: PASS
- ESLint: PASS
- Zero errors
