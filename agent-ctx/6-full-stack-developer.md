# Task 6: Build What-If Scenario Panel UI

## Agent: full-stack-developer

## Summary
Built the complete What-If Scenario Simulation Panel for TrimedCast Session 22.

## Files Created
- `/src/components/forecast/what-if-scenario-panel.tsx` (~700 lines): Core scenario simulation UI

## Files Modified
- `/src/components/dashboard/pages/analytics-page.tsx`: Added What-If Scenario tab (default), replaced Trends tab

## Key Architecture Decisions
1. **3-column grid layout**: Left column for configuration (product selector + modification controls), right 2 columns for chart + impact + recommendation
2. **Auto-compute on input change**: Scenario results update automatically when modification type or values change
3. **ComposedChart for shadow forecast**: Uses recharts ComposedChart to layer ReferenceArea (season bands), Area (confidence intervals), and Line (baseline + scenario)
4. **Type-specific controls**: Each modification type has its own tab content with appropriate inputs (Switch for sea/air, Slider for promo, Select for service level, Input for qty/price)
5. **Sea vs Air comparison**: Conditional card shown only when lead time tab is active, showing total cost of ownership comparison
6. **AI integration**: "Run AI Analysis" button calls existing /api/ai/scenario-preview endpoint
7. **Disabled "Apply Scenario"**: Per spec, scenarios are analysis-only; button has tooltip explaining this

## Dependencies Used
- recharts (ComposedChart, Line, Area, ReferenceArea, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer)
- framer-motion (AnimatePresence, motion)
- shadcn/ui (Card, Tabs, Select, Slider, Switch, Badge, Tooltip, Button, Input, Label, Separator, Skeleton)
- lucide-react (GitBranch, Ship, Plane, Megaphone, Shield, Package, CircleDollarSign, etc.)
- @/lib/forecasting/scenario-engine (all scenario functions and types)
- @/lib/forecasting/models (BD_SEASONS, getBDSeason, BDSeason)
- @/lib/forecasting/store (useForecastStore)

## Status
Complete. Lint clean. Accessible via Analytics page in sidebar.
