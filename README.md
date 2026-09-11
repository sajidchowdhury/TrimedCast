# TrimedCast LEAN

> **Session-wise demand & order planning for Bangladesh motorcycle-parts importers.**
> Upload Excel → forecast Eid/Puja/Summer/Winter demand → get order qty + trigger date + air-vs-sea + landed cost.

A lean, phased implementation that delivers exactly the 6 capabilities the client asked for — nothing more.

## The 6 capabilities

| # | Requirement | Status |
|---|-------------|--------|
| (a) | Upload Excel of monthly sales | ✅ |
| (b) | Predict next-session sales (Eid, Puja, Summer, Winter) | ✅ |
| (c) | Recommend how much to order | ✅ |
| (d) | Recommend when to order | ✅ |
| (e) | Decide air vs sea freight | ✅ |
| (f) | Do line-cost analysis | ✅ |

## Quick start

```bash
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast
bun install
cp .env.example .env
bun run db:push
bun run dev
```

Open http://localhost:3000 → click **"Upload Excel"** → upload the sample at `public/sample_client_sales.xlsx` → **Dashboard → Run full pipeline**.

See **[SETUP.md](./SETUP.md)** for the complete step-by-step guide.

## What's in the app

| Page | What it does |
|------|-------------|
| **Dashboard** | Unified session pilot — all 6 capabilities in one view + "Run full pipeline" button |
| **Upload Excel** | Import your monthly sales workbook (wide format → long format) |
| **Forecast** | Prophet-inspired forecast with festival effects + accuracy metrics |
| **Order Recommendations** | EOQ + Safety Stock + 9-step order trigger + CNY strategies |
| **Air vs Sea** | Freight cost/lead-time trade-off + recommendation per SKU |
| **Line Cost** | BD customs landed-cost breakdown (HS 8512: 25% Duty + 15% VAT + 5% AIT) |
| **Pilot Review** | Results summary + deferred-scope panel + client handoff guide |
| **Custom Events** | Create your own festival/event with custom demand effects |
| **Data** | Uploaded products + inline price editing + single/bulk deletion |

Every page has a floating **"?"** button (bottom-right) that opens a **Bangla documentation** panel explaining what the page does, how the data is computed, and why it's math not magic.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript 5** + **React 19**
- **Tailwind CSS 4** + **shadcn/ui** (11 components only — lean)
- **Prisma ORM** + **SQLite** (no external database needed)
- **Zustand** (client state) + **sonner** (toasts)
- **xlsx** (SheetJS — Excel parsing)
- **hijri-converter** (day-precise Eid dates)
- **18 npm dependencies total** (lightweight)

## Project structure

```
TrimedCast/
├── prisma/schema.prisma          # 9 lean models (no billing/tenancy/RBAC)
├── src/
│   ├── lib/
│   │   ├── etl/                   # Excel parser + wide→long transformer
│   │   ├── calendar/hijri.ts      # Hijri→Gregorian Eid conversion
│   │   ├── sessions/              # Festival calendar (Hijri-seeded)
│   │   ├── forecasting/           # Prophet-TS engine + EOQ + order trigger
│   │   ├── finance/               # BD customs calculator + freight engine
│   │   ├── help/                  # Page-specific Bangla help content
│   │   └── auth/middleware.ts     # No-op stub (auth deferred)
│   ├── stores/app-store.ts        # View switching + import state
│   ├── components/
│   │   ├── dashboard/             # Sidebar + header + help button
│   │   └── views/                 # 9 views (dashboard, upload, forecast, etc.)
│   └── app/
│       ├── api/                   # 12 API routes
│       ├── page.tsx               # AppShell (single-page, view switching)
│       └── layout.tsx             # Root layout + Toaster
├── public/sample_client_sales.xlsx  # Sample Excel (21 SKUs, seasonal)
├── scripts/generate-sample-excel.ts # Regenerate the sample Excel
├── docs/                           # Reference docx files + client docs
├── .env.example                    # Environment template
├── SETUP.md                        # Complete local setup guide
└── package.json                    # 18 dependencies only
```

## What's deferred (14 capabilities, switchable back on)

Subscription billing, multi-tenancy, 7-role RBAC, 2FA, AI scenario preview, auto-recalibration, audit logs, observability, volumetric weight, custom seasonality types, consensus pipeline, promo adjustments, currency exposure, Bengali i18n — all documented in the **Pilot Review** page with their reactivation triggers.
