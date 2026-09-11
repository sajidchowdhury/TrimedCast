# TrimedCast LEAN — Client-Scoped Build

> **Session-wise demand & order planning for Bangladesh motorcycle-parts importers.**
> A lean, phased implementation that strips TrimedCast back to exactly the 6 capabilities the client asked for — nothing more.

This folder contains the **lean implementation** built on top of the TrimedCast analysis. It is a fresh, clean Next.js 16 app (not a fork of the original `src/`) that implements only the 6 client requirements:

| # | Requirement | Status |
|---|-------------|--------|
| (a) | Upload Excel of monthly sales | ✅ Phase 1 |
| (b) | Predict next-session sales (Eid, Puja, Summer, Winter) | ✅ Phase 2 |
| (c) | Recommend how much to order | 🔄 Phase 3 |
| (d) | Recommend when to order | 🔄 Phase 3 |
| (e) | Decide air vs sea freight | ⏳ Phase 4 |
| (f) | Do line-cost analysis | ⏳ Phase 4 |

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 0 | Environment Setup + Lean Dashboard Shell | ✅ DONE |
| 1 | Excel Upload & Data Foundation | ✅ DONE |
| 2 | Session Calendar & Forecasting (Hijri fix + Prophet-TS) | ✅ DONE |
| 3 | Order Quantity & Timing (EOQ + Order Trigger) | 🔄 IN PROGRESS |
| 4 | Air vs Sea + Line Cost | ⏳ PENDING |
| 5 | Dashboard Integration & Pilot | ⏳ PENDING |
| 6 | Pilot Review & Handoff | ⏳ PENDING |

See `../TrimedCast_Lean_Implementation_Roadmap_TechnicalDoc_2026-09-11.docx` → Appendix A for the detailed progress tracker.

## What's Deferred (per lean scope)

Subscription billing, multi-tenancy, 7-role RBAC, 2FA, AI scenario preview, auto-recalibration, audit logs, observability, volumetric weight, custom seasonality, consensus pipeline, promo adjustments, currency exposure, Bengali i18n, warehouse management, sales orders, procurement/supplier scorecards, product ABC/XYZ — all **removed from the UI** (code stays available in the original `src/` to switch on later).

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + **Lucide** icons
- **Prisma ORM** (SQLite) — single-tenant
- **Zustand** (client state) + **TanStack Query** patterns
- **xlsx** (SheetJS) for Excel parsing
- **hijri-converter** for day-precise Eid dates (Phase 2 fix)

## Key Modules

```
lean/
├── prisma/schema.prisma              # 8 lean models (no billing/tenancy/RBAC)
├── src/
│   ├── lib/
│   │   ├── etl/                       # Phase 1: Excel parser + wide→long transformer
│   │   ├── calendar/hijri.ts          # Phase 2: Hijri→Gregorian Eid conversion
│   │   ├── sessions/                  # Phase 2: Festival calendar (18 day-precise sessions)
│   │   ├── forecasting/               # Phase 2: Prophet-TS engine + accuracy metrics
│   │   └── finance/customs-calculator.ts  # Phase 4: BD customs duty (HS 8512)
│   ├── stores/app-store.ts            # View switching + import state
│   ├── components/
│   │   ├── dashboard/                 # Sidebar + header + shell
│   │   └── views/                     # Dashboard, Upload, Forecast, Data + Phase 3-4 placeholders
│   └── app/
│       ├── api/
│       │   ├── import/                # Phase 1: Excel upload + transform
│       │   ├── forecast/              # Phase 2: generate + list
│       │   ├── products/              # Phase 1: product list
│       │   └── festivals/             # Phase 2: festival calendar (Hijri-seeded)
│       ├── page.tsx                   # AppShell (single-page, view switching)
│       └── layout.tsx                 # Root layout + Toaster
└── package.json
```

## Run Locally

```bash
cd lean
bun install
cp .env.example .env  # DATABASE_URL=file:./db/custom.db
bun run db:push
bun run dev  # http://localhost:3000
```
