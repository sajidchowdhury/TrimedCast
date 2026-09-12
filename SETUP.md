# TrimedCast LEAN — Local Setup Guide

> Session-wise demand & order planning for Bangladesh motorcycle-parts importers.
> Upload Excel → forecast Eid/Puja/Summer/Winter demand → get order qty + trigger date + air-vs-sea + landed cost.

## Prerequisites

Install **one** of these runtimes on your PC:

| Runtime | Version | Install |
|---------|---------|---------|
| **Bun** (recommended) | 1.3+ | [bun.sh](https://bun.sh/docs/installation) |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |

You also need **Git** to clone the repo: [git-scm.com](https://git-scm.com/downloads)

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast
```

> The repo now contains **only** the lean app — no subfolders, no original codebase. Just clone, install, and run.

---

## Step 2 — Install dependencies

Using **Bun** (recommended):
```bash
bun install
```

Using **Node.js + npm**:
```bash
npm install
```

This installs 18 dependencies only (~lightweight).

---

## Step 3 — Configure the environment

Copy the env template:
```bash
cp .env.example .env
```

The default `.env` uses SQLite at a relative path — it works out of the box on any PC:
```env
DATABASE_URL=file:./db/custom.db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-me-in-production
```

No changes needed for local dev. (For production, generate a real secret: `openssl rand -base64 32`)

---

## Step 4 — Create the database

The project uses Prisma + SQLite. Create the database tables:
```bash
bun run db:push
```
(or `npm run db:push` if using Node)

This creates `db/custom.db` with all 9 tables (Product, Sale, Purchase, Inventory, FestivalSession, ForecastSetting, Forecast, RecommendedOrder, DataImport).

---

## Step 5 — Start the dev server

```bash
bun run dev
```
(or `npm run dev`)

You'll see:
```
▲ Next.js 16.1.3 (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~800ms
```

**Open http://localhost:3000 in your browser.** You'll see the TrimedCast Lean dashboard.

---

## Step 6 — Try it with sample data (optional)

To test the full pipeline without your real Excel, generate a sample workbook:
```bash
bun scripts/generate-sample-excel.ts
```
This creates `./sample_client_sales.xlsx` (6 SKUs, matching the client's wide format).

Then in the dashboard:
1. Click **"Upload Excel"** in the sidebar
2. Upload `sample_client_sales.xlsx` (or your real workbook)
3. Set the data year → click **"Import now"**
4. Go to **Dashboard** → click **"Run full pipeline"**
5. Watch the forecast + orders + freight generate for the next festival (Durga Puja 2026)
6. Explore: **Forecast** · **Order Recommendations** · **Air vs Sea** · **Line Cost** · **Pilot Review**

---

## Step 7 — Upload your real Excel

When you're ready to use your own data:

1. Open the **Upload Excel** page
2. Upload your workbook. It must have these columns (the system auto-detects them):
   - `Pic No` (SKU code)
   - `Item` (product name)
   - `Color & Details` (optional)
   - `Order QTY` (last order quantity)
   - `Ordered On`, `Send On`, `Received On` (dates, dd/mm/yyyy)
   - `Send By Sea / Air` (shipping mode)
   - `Jan`, `Feb`, … `Dec` (12 monthly sales columns)
3. Set the **data year** (the year the monthly columns belong to)
4. Click **Import now**

The system will:
- Melt the 12 monthly columns into clean SKU-month rows
- Extract purchase records + compute lead times
- Seed the festival calendar (Durga Puja, Winter, CNY, Eid-ul-Fitr, Eid-ul-Adha — with Hijri-computed Eid dates)

---

## Step 8 — Set unit costs + selling prices

After uploading, go to the **Data** page and click on the **Unit Cost (৳)** and **Sell Price (৳)** cells to edit them inline. This makes the freight + line-cost analysis meaningful (otherwise it uses default ৳100/৳140).

---

## Useful commands

| Command | What it does |
|---------|--------------|
| `bun run dev` | Start the dev server (http://localhost:3000) |
| `bun run lint` | Check code quality (ESLint) |
| `bun run db:push` | Push schema changes to the SQLite database |
| `bun run db:generate` | Regenerate the Prisma client (after schema changes) |
| `bun run db:reset` | Reset the database (deletes all data) |
| `bun scripts/generate-sample-excel.ts` | Create a sample Excel for testing |

---

## Troubleshooting

**"Cannot connect to localhost:3000"**
- Make sure the dev server is still running (`bun run dev`)
- Check the terminal for errors

**"Module not found: Can't resolve '@/lib/auth/middleware'"**
This means a stray `src/middleware.ts` file (from the original TrimedCast codebase) got copied into your `lean/src/` folder. The lean build has NO auth system (deferred per lean scope). Fix:
```bash
rm -f src/middleware.ts    # delete the stray file
rm -rf src/lib/auth        # delete the auth folder if present
rm -rf .next               # clear the build cache
bun run dev                # restart
```

**"Database connection error"**
- Make sure `db/` folder exists and `DATABASE_URL=file:./db/custom.db` in `.env`
- Run `bun run db:push` to create the database

**"Port 3000 already in use"**
- Kill the process: `lsof -i :3000` then `kill <PID>` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- Or run on a different port: `bun run next dev -p 3001`

**Want to start fresh (delete all data)**
```bash
rm db/custom.db
bun run db:push
```

---

## What's in the app

| Sidebar page | What it does |
|--------------|--------------|
| **Dashboard** | Unified session pilot — all 6 capabilities in one view + "Run full pipeline" button |
| **Upload Excel** | Import your monthly sales workbook (wide format → long format) |
| **Forecast** | Prophet-inspired forecast with festival effects + accuracy metrics |
| **Order Recommendations** | EOQ + Safety Stock + 9-step order trigger + CNY strategies |
| **Air vs Sea** | Freight cost/lead-time trade-off + recommendation per SKU |
| **Line Cost** | BD customs landed-cost breakdown (HS 8512: 25% Duty + 15% VAT + 5% AIT) |
| **Pilot Review** | Results summary + deferred-scope panel + client handoff guide |
| **Data** | Uploaded products + inline price editing |

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript 5** + **React 19**
- **Tailwind CSS 4** + **shadcn/ui** (11 components only — lean)
- **Prisma ORM** + **SQLite** (no external database needed)
- **Zustand** (client state) + **sonner** (toasts)
- **xlsx** (SheetJS — Excel parsing)
- **hijri-converter** (day-precise Eid dates)
- **18 npm dependencies total** (lightweight)
