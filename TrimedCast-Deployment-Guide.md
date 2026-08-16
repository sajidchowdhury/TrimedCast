# TrimedCast — Phase-by-Phase Deployment Guide

> **From Development → Local Testing → Production Server**
> Complete guide to install, test, and deploy TrimedCast on a real server.

---

## Table of Contents

1. [Current Feature Audit](#1-current-feature-audit)
2. [Phase 1: Local PC Setup](#2-phase-1-local-pc-setup--development-environment)
3. [Phase 2: Local Testing Checklist](#3-phase-2-local-testing-checklist)
4. [Phase 3: What Needs To Be Built Before Production](#4-phase-3-what-needs-to-be-built-before-production)
5. [Phase 4: Production Server Setup](#5-phase-4-production-server-setup)
6. [Phase 5: Production Deployment](#6-phase-5-production-deployment)
7. [Phase 6: Post-Deployment Verification](#7-phase-6-post-deployment-verification)
8. [Phase 7: Production Hardening Checklist](#8-phase-7-production-hardening-checklist)
9. [Architecture & Tech Stack](#9-architecture--tech-stack)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Current Feature Audit

### ✅ What's READY for Production

| Feature | Status | Details |
|---------|--------|---------|
| Dashboard (12 pages) | ✅ Complete | Overview, Forecast, Orders, Inventory, Import, Suppliers, Analytics, S&OE Tower, AI Assistant, Billing, API Explorer, Settings, Help |
| CSV/Excel Import (7 types) | ✅ Complete | 7-step wizard: Select → Upload → Map → Validate → Harmonize → Insert → Complete |
| ETL Engine | ✅ Complete | Full pipeline with column mapping, validation, harmonization, batch insert |
| Forecasting Engine | ✅ Complete | Prophet decomposition + AI consensus pipeline + auto-recalibration |
| S&OE Control Tower | ✅ Complete | Demand/supply/revenue consensus, gap analysis, Gantt charts |
| Billing System | ✅ Complete | 3 tiers (Starter/Pro/Enterprise), feature gating, subscription lifecycle |
| Help System | ✅ Complete | Floating "?" button, off-canvas Bangla help, Help page with 3 tabs |
| Demo Data | ✅ Complete | 9 CSV files with 2024/2025 data for 2026 predictions |
| Prisma Schema | ✅ Complete | 23 models, multi-tenant, audit logging |
| API Routes | ✅ Complete | Auth, imports, billing, forecasting, inventory, suppliers, analytics |

### ❌ What's MISSING (Must Build Before Production)

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| **Public Landing Page** | 🔴 Critical | 2-3 days | Users can't understand the product without this |
| **Registration UI (Signup Page)** | 🔴 Critical | 1-2 days | No way for new users to create accounts |
| **Login UI Page** | 🔴 Critical | 1 day | No way to authenticate |
| **Auth Middleware (route protection)** | 🔴 Critical | 1 day | Dashboard is publicly accessible |
| **Password Hashing (bcrypt)** | 🔴 Critical | 0.5 day | Currently accepts any password |
| **Persistent Token Store (DB/Redis)** | 🔴 Critical | 1 day | In-memory tokens reset on server restart |
| **Onboarding Wizard** | 🟡 High | 2-3 days | New users don't know what to do first |
| **Public Pricing Page** | 🟡 High | 1 day | Packages only visible inside dashboard |
| **Configurable Seasonality Types** | 🟡 High | 1-2 days | Currently hardcoded 4 types |
| **SQLite → PostgreSQL Migration** | 🔴 Critical | 1-2 days | SQLite doesn't handle concurrent users |
| **NextAuth.js Integration** | 🟡 High | 2 days | More secure than custom JWT |
| **Environment Secrets Management** | 🔴 Critical | 1 day | Tokens/keys hardcoded or in-memory |

---

## 2. Phase 1: Local PC Setup — Development Environment

### 2.1 Prerequisites

```bash
# Required software versions
Node.js >= 18.x        # Check: node -v
Bun >= 1.x             # Check: bun -v
Git >= 2.x             # Check: git --version

# OS Support
- macOS (Intel/Apple Silicon)
- Ubuntu 20.04+ / Debian 11+
- Windows 10+ (with WSL2 recommended)
```

### 2.2 Clone & Install

```bash
# Clone the repository
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast

# Install dependencies (Bun is preferred)
bun install

# If you don't have Bun, install it first:
curl -fsSL https://bun.sh/install | bash
# Then restart your terminal and run:
bun install
```

### 2.3 Environment Setup

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your local settings
# Minimum required:
```

**`.env` file:**
```env
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# AI SDK (for forecasting & AI assistant)
ZAI_API_KEY="your-zai-api-key"

# Auth (when implemented)
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (for billing - use test keys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 2.4 Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Push schema to SQLite (creates tables)
bun run db:push

# (Optional) If you want to reset and start fresh:
bun run db:reset
```

### 2.5 Run Development Server

```bash
# Start Next.js dev server
bun run dev

# Server will be available at:
# http://localhost:3000
```

### 2.6 Import Demo Data

1. Open `http://localhost:3000` in your browser
2. Navigate to **Import Data** page (sidebar)
3. Import files in this **EXACT ORDER** (dependencies matter!):

| Step | File | Import Type | Records |
|------|------|-------------|---------|
| 1 | `demo-data/01_motorcycle_models.csv` | Motorcycle Models | 25 |
| 2 | `demo-data/02_suppliers.csv` | Suppliers | 24 |
| 3 | `demo-data/03_products.csv` | Products/Parts | 42 |
| 4 | `demo-data/04_inventory.csv` | Inventory/Stock | 42 |
| 5 | `demo-data/05_sales_history_2024.csv` | Sales History | 1,729 |
| 6 | `demo-data/05_sales_history_2025.csv` | Sales History | 1,748 |
| 7 | `demo-data/06_purchase_history_2024.csv` | Purchase History | 222 |
| 8 | `demo-data/06_purchase_history_2025.csv` | Purchase History | 233 |
| 9 | `demo-data/07_promo_events.csv` | Promo Events | 15 |

> ⚠️ **Order is critical!** Products reference Suppliers & Models. Sales/Purchases reference Products. Import out of order will fail validation.

---

## 3. Phase 2: Local Testing Checklist

Test every feature systematically before thinking about production.

### 3.1 Dashboard Pages (12 pages)

- [ ] **Overview** — KPI cards load, sparklines render, season indicator shows current BD season
- [ ] **Forecast** — Product selector works, forecast chart renders, confidence intervals visible
- [ ] **Order Triggers** — Recommended orders display, CNY risk flags show, priority sorting works
- [ ] **Inventory** — Grid loads, stock levels show, reorder alerts visible
- [ ] **Import Data** — 7-step wizard flows correctly, file upload works, column mapping auto-detects
- [ ] **Suppliers** — Supplier list loads, CNY-affected flags show, lead times display
- [ ] **Analytics** — Charts render, seasonal patterns visible, drill-down works
- [ ] **S&OE Tower** — Demand/supply consensus displays, gap analysis shows, Gantt timeline works
- [ ] **AI Assistant** — Chat interface works, queries get responses
- [ ] **Billing** — 3 tiers display, subscription management works
- [ ] **API Explorer** — Endpoints list, test requests work
- [ ] **Settings** — Forecast defaults save, configuration persists

### 3.2 Import System (7 types)

For each import type, test:
- [ ] File upload (CSV and XLSX)
- [ ] Column auto-mapping
- [ ] Manual column remapping
- [ ] Validation errors show correctly
- [ ] Harmonization log displays
- [ ] Data inserts into database
- [ ] Quality score calculates

### 3.3 Forecasting

- [ ] Run forecast for a product with 2024+2025 sales data
- [ ] Verify 2026 predictions generate
- [ ] Check seasonal decomposition (trend, seasonality, residual)
- [ ] Verify CNY risk window (Jan 20 - Feb 20) flags orders correctly
- [ ] Test auto-recalibration when new data is added

### 3.4 Help System

- [ ] Floating "?" button appears on every page
- [ ] Click opens off-canvas with Bangla content
- [ ] Content changes per page (context-aware)
- [ ] Help page in sidebar loads with 3 tabs
- [ ] Import Guide shows column specifications

### 3.5 Help System (Bangla)

- [ ] ফ্লোটিং "?" বাটন প্রতিটি পেজে দেখা যাচ্ছে
- [ ] ক্লিক করলে ডান পাশ থেকে অফ-ক্যানভাস খুলছে
- [ ] বাংলা কন্টেন্ট সঠিকভাবে দেখাচ্ছে
- [ ] হেল্প পেজের ৩টি ট্যাব কাজ করছে

---

## 4. Phase 3: What Needs To Be Built Before Production

This is the **critical build phase**. Without these, the app is NOT production-ready.

### 4.1 🔴 Phase 3A: Authentication System (4-5 days)

**Why:** Currently there's no way for users to sign up, log in, or protect their data.

**Tasks:**
1. **Add `passwordHash` to User model** (Prisma schema migration)
2. **Build Login page** (`/login`) — email + password form
3. **Build Signup page** (`/signup`) — name, email, password, tenant/company name
4. **Implement bcrypt password hashing** — replace the "accept any password" demo code
5. **Build Auth middleware** (`middleware.ts`) — protect `/dashboard/*` routes, redirect to `/login`
6. **Move token store to database** — add `Session` model, store tokens in DB instead of Map
7. **Add "Forgot Password" flow** — email reset link
8. **Add role-based route guards** — warehouse_manager can't see billing, etc.

**Files to create/modify:**
```
src/app/(auth)/login/page.tsx          — Login UI
src/app/(auth)/signup/page.tsx         — Signup UI
src/app/(auth)/layout.tsx              — Auth layout (no sidebar)
src/middleware.ts                       — Route protection
prisma/schema.prisma                   — Add passwordHash, Session model
src/lib/auth/password.ts               — bcrypt utilities
src/lib/auth/session-store.ts          — DB-backed sessions
```

### 4.2 🔴 Phase 3B: Landing Page (2-3 days)

**Why:** Users need to understand what TrimedCast does before signing up.

**Tasks:**
1. **Hero section** — Tagline, CTA button, hero image/illustration
2. **Problem statement** — "Motorcycle parts dealers in BD face seasonal demand uncertainty..."
3. **Solution overview** — How TrimedCast solves it (forecasting, CNY risk, S&OE)
4. **Feature showcase** — Key features with screenshots/GIFs
5. **How it works** — 3-4 step process (Import → Forecast → Order → Profit)
6. **Pricing section** — 3 tiers with feature comparison (public, no auth required)
7. **Testimonials/Social proof** — (placeholder for now)
8. **FAQ section** — Common questions answered
9. **Footer** — Links, contact, legal

**Files to create:**
```
src/app/(marketing)/page.tsx           — Landing page
src/app/(marketing)/layout.tsx         — Marketing layout
src/components/landing/hero.tsx
src/components/landing/features.tsx
src/components/landing/pricing.tsx
src/components/landing/how-it-works.tsx
src/components/landing/faq.tsx
```

### 4.3 🔴 Phase 3C: Database Migration (SQLite → PostgreSQL) (1-2 days)

**Why:** SQLite cannot handle concurrent users in production. It locks the entire DB on writes.

**Tasks:**
1. **Install PostgreSQL** on production server
2. **Change Prisma provider** from `sqlite` to `postgresql`
3. **Update `DATABASE_URL`** to PostgreSQL connection string
4. **Fix any SQLite-specific syntax** (autoincrement, date handling, etc.)
5. **Run migration** — `bun run db:migrate`
6. **Test all API routes** against PostgreSQL
7. **Import demo data** to verify everything works

**Prisma changes:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**New `.env`:**
```env
DATABASE_URL="postgresql://trimedcast:password@localhost:5432/trimedcast?schema=public"
```

### 4.4 🟡 Phase 3D: Onboarding Wizard (2-3 days)

**Why:** After signup, users don't know what to do first.

**Tasks:**
1. **Welcome screen** — "Welcome to TrimedCast! Let's set up your account"
2. **Company profile** — Company name, division, business type
3. **Import prompt** — "Upload your first CSV file" with download template links
4. **First forecast** — "Run your first forecast" with guided steps
5. **Completion** — "You're all set! Here's your dashboard"

### 4.5 🟡 Phase 3E: Configurable Seasonality Types (1-2 days)

**Why:** Different businesses have different seasonal patterns. Currently only 4 hardcoded types.

**Tasks:**
1. **Add `SeasonalityType` model** to Prisma schema
2. **Add Settings UI** for managing seasonality types (add/edit/delete)
3. **Seed default types** (winter_peak, monsoon_dip, summer_peak, pre_winter_peak)
4. **Allow custom types** (eid_peak, cny_preparation, back_to_school, etc.)
5. **Use DB types** in Product import and forecast engine

**Prisma model:**
```prisma
model SeasonalityType {
  id          String   @id @default(cuid())
  tenantId    String
  name        String   // e.g., "eid_peak"
  label       String   // e.g., "Eid Peak Demand"
  description String?
  multiplier  Float    @default(1.0) // demand multiplier
  months      String   // JSON array of months, e.g., "[3,4]"
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, name])
}
```

### 4.6 Build Order Summary

| Phase | Feature | Days | Priority |
|-------|---------|------|----------|
| 3A | Auth System (Login/Signup/Middleware) | 4-5 | 🔴 Critical |
| 3B | Landing Page | 2-3 | 🔴 Critical |
| 3C | SQLite → PostgreSQL | 1-2 | 🔴 Critical |
| 3D | Onboarding Wizard | 2-3 | 🟡 High |
| 3E | Configurable Seasonality | 1-2 | 🟡 High |
| **Total** | | **10-15 days** | |

---

## 5. Phase 4: Production Server Setup

### 5.1 Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 40 GB SSD | 80 GB SSD |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **Node.js** | 18.x | 20.x LTS |
| **PostgreSQL** | 14.x | 16.x |
| **Nginx** | 1.20+ | 1.24+ |

**Recommended Hosting:**
- **DigitalOcean Droplet** — $24/mo (4GB RAM) — best for BD market
- **AWS EC2 t3.medium** — ~$30/mo — more scalable
- **Hetzner CX31** — €7.90/mo — budget friendly
- **Bangladeshi VPS** — AmberIT, XeonBD — local latency advantage

### 5.2 Initial Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git unzip ufw

# Setup firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# Create deploy user (don't run as root)
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 5.3 Install Node.js + Bun

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify
node -v   # v20.x.x
bun -v    # 1.x.x
```

### 5.4 Install PostgreSQL

```bash
# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt update
sudo apt install -y postgresql-16

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell:
CREATE USER trimedcast WITH ENCRYPTED PASSWORD 'your-secure-password';
CREATE DATABASE trimedcast OWNER trimedcast;
GRANT ALL PRIVILEGES ON DATABASE trimedcast TO trimedcast;
\q
```

### 5.5 Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5.6 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 startup  # creates systemd service for auto-restart
```

---

## 6. Phase 5: Production Deployment

### 6.1 Clone & Build on Server

```bash
# Switch to deploy user
su - deploy

# Clone repo
cd /home/deploy
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast

# Install dependencies
bun install

# Setup environment
cp .env.example .env
nano .env  # Edit with production values
```

### 6.2 Production `.env` Configuration

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://trimedcast:your-secure-password@localhost:5432/trimedcast?schema=public"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# Auth
NEXTAUTH_SECRET="openssl-rand-base64-32-output"
NEXTAUTH_URL="https://yourdomain.com"

# AI SDK
ZAI_API_KEY="your-production-zai-key"

# Stripe (LIVE keys - NOT test!)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"
```

### 6.3 Database Migration

```bash
# Generate Prisma client
bun run db:generate

# Run migration (creates tables in PostgreSQL)
bun run db:migrate

# Or if using db:push (for initial setup):
bun run db:push
```

### 6.4 Build the Application

```bash
# Production build
bun run build

# This creates .next/standalone/ for deployment
# Verify build succeeded with no errors
```

### 6.5 Start with PM2

```bash
# Start the app
pm2 start bun --name "trimedcast" -- run start

# Or if using node directly:
pm2 start .next/standalone/server.js --name "trimedcast"

# Save PM2 config (auto-restart on reboot)
pm2 save

# Check status
pm2 status
pm2 logs trimedcast
```

### 6.6 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/trimedcast
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/trimedcast /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6.7 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured by default
# Test renewal:
sudo certbot renew --dry-run
```

---

## 7. Phase 6: Post-Deployment Verification

### 7.1 Health Checks

```bash
# App is running
pm2 status

# Database is connected
psql -U trimedcast -d trimedcast -c "SELECT count(*) FROM Tenant;"

# Nginx is proxying correctly
curl -I https://yourdomain.com

# SSL is valid
curl -vI https://yourdomain.com 2>&1 | grep "expire date"
```

### 7.2 Functional Tests

| Test | Command/Action | Expected Result |
|------|----------------|-----------------|
| Landing page loads | `curl https://yourdomain.com` | HTML response with hero section |
| Login page loads | Visit `/login` | Login form visible |
| Signup works | Create test account | Tenant + User created in DB |
| Dashboard loads | Login → Dashboard | All 12 pages accessible |
| CSV Import | Upload demo CSV | Data inserted, quality score shown |
| Forecast runs | Run forecast for product | 2026 predictions displayed |
| SSL valid | Check certificate | Valid, not expired |
| PM2 auto-restart | `pm2 restart trimedcast` | App comes back up |

### 7.3 Performance Baseline

```bash
# Install hey (HTTP load tester)
go install github.com/rakyll/hey@latest

# Baseline test (100 requests, 10 concurrent)
hey -n 100 -c 10 https://yourdomain.com/

# Target: < 500ms p99 latency, 0% error rate
```

---

## 8. Phase 7: Production Hardening Checklist

### 8.1 Security

- [ ] **HTTPS everywhere** — SSL certificate installed, HTTP→HTTPS redirect
- [ ] **Secure headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] **Rate limiting** — Nginx rate limit on `/api/*` routes (e.g., 100 req/min per IP)
- [ ] **CORS configured** — Only allow your domain
- [ ] **Input sanitization** — All API inputs validated (Zod schemas)
- [ ] **SQL injection protection** — Prisma parameterized queries (already safe)
- [ ] **CSRF protection** — NextAuth CSRF tokens
- [ ] **Dependencies audit** — `bun audit` for known vulnerabilities
- [ ] **Secrets not in code** — All secrets in `.env`, never committed to Git
- [ ] **Firewall configured** — Only ports 22, 80, 443 open

### 8.2 Reliability

- [ ] **PM2 cluster mode** — Use all CPU cores: `pm2 start server.js -i max`
- [ ] **PM2 auto-restart** — On crash, memory limit, or uncaught exception
- [ ] **PM2 log rotation** — `pm2 install pm2-logrotate`
- [ ] **Database backups** — Daily pg_dump cron job
- [ ] **Uptime monitoring** — UptimeRobot (free) or similar
- [ ] **Error tracking** — Sentry integration
- [ ] **Graceful shutdown** — Handle SIGTERM/SIGINT

### 8.3 Database Backups

```bash
# Create backup script
sudo nano /home/deploy/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U trimedcast -d trimedcast | gzip > "$BACKUP_DIR/trimedcast_$TIMESTAMP.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: trimedcast_$TIMESTAMP.sql.gz"
```

```bash
# Make executable
chmod +x /home/deploy/backup.sh

# Schedule daily at 2 AM
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh
```

### 8.4 Nginx Rate Limiting

```nginx
# In /etc/nginx/nginx.conf (http block)
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# In server block
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
}

location /api/v1/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://127.0.0.1:3000;
}
```

### 8.5 Monitoring Setup

```bash
# PM2 monitoring
pm2 monit

# Set up PM2 metrics
pm2 install pm2-server-monit

# Log viewing
pm2 logs trimedcast --lines 100
```

---

## 9. Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Client (Browser)                                       │
│  ├── Next.js 16 (App Router)                           │
│  ├── React 19                                          │
│  ├── Tailwind CSS 4 + shadcn/ui                        │
│  ├── Zustand (state) + TanStack Query (server state)   │
│  ├── Recharts (data visualization)                     │
│  └── Framer Motion (animations)                        │
│                                                         │
│  Server (Node.js/Bun)                                   │
│  ├── Next.js API Routes                                │
│  ├── Prisma ORM (PostgreSQL)                           │
│  ├── NextAuth.js v4 (authentication)                   │
│  ├── z-ai-web-dev-sdk (AI forecasting)                 │
│  ├── xlsx (Excel/CSV parsing)                          │
│  └── Prophet (time-series decomposition)               │
│                                                         │
│  Infrastructure                                         │
│  ├── PM2 (process manager)                             │
│  ├── Nginx (reverse proxy + SSL)                       │
│  ├── PostgreSQL 16 (database)                          │
│  ├── Let's Encrypt (SSL certificates)                  │
│  └── Ubuntu 22.04 LTS                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Environment Variables Reference

| Variable | Required | Production Example | Description |
|----------|----------|-------------------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@localhost:5432/trimedcast` | Database connection |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://trimedcast.com` | Public app URL |
| `NODE_ENV` | ✅ | `production` | Environment mode |
| `NEXTAUTH_SECRET` | ✅ | (32+ char random) | Auth encryption key |
| `NEXTAUTH_URL` | ✅ | `https://trimedcast.com` | Auth callback URL |
| `ZAI_API_KEY` | ✅ | (from z-ai dashboard) | AI SDK key |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...` | Stripe live secret |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | `pk_live_...` | Stripe live public |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | `whsec_...` | Stripe webhook |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Optional caching |

### Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# Database password
openssl rand -base64 24
```

---

## 11. Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| `bun install` fails | Lock file mismatch | Delete `bun.lockb`, run `bun install` again |
| `db:push` fails | Schema conflict | Run `bun run db:reset` then `bun run db:push` |
| Blank page on prod | Build failed silently | Check `pm2 logs`, rebuild with `bun run build` |
| 502 Bad Gateway | PM2 app crashed | `pm2 restart trimedcast`, check logs |
| Import fails | Column name mismatch | Use exact column names from Import Guide |
| Forecast empty | Not enough sales data | Need ≥12 months of sales history |
| Slow API responses | No caching | Add Redis, or optimize Prisma queries |

### Useful Commands

```bash
# Restart app
pm2 restart trimedcast

# View logs
pm2 logs trimedcast --lines 200

# Database connection test
psql -U trimedcast -d trimedcast -c "SELECT 1;"

# Nginx config test
sudo nginx -t

# SSL renewal
sudo certbot renew

# Disk usage check
df -h

# Memory usage
free -m

# PM2 status
pm2 status
```

---

## Quick Reference: Deployment in 15 Commands

```bash
# 1. SSH to server
ssh deploy@your-server-ip

# 2. Clone repo
git clone https://github.com/sajidchowdhury/TrimedCast.git && cd TrimedCast

# 3. Install deps
bun install

# 4. Setup env
cp .env.example .env && nano .env

# 5. Generate Prisma client
bun run db:generate

# 6. Push schema to PostgreSQL
bun run db:push

# 7. Build
bun run build

# 8. Start with PM2
pm2 start bun --name "trimedcast" -- run start

# 9. Save PM2
pm2 save

# 10. Setup Nginx
sudo ln -s /etc/nginx/sites-available/trimedcast /etc/nginx/sites-enabled/

# 11. Test Nginx
sudo nginx -t

# 12. Reload Nginx
sudo systemctl reload nginx

# 13. Get SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 14. Verify
curl -I https://yourdomain.com

# 15. Check logs
pm2 logs trimedcast
```

---

> **TrimedCast** — Seasonal Demand & Inventory Forecasting for Bangladesh Motorcycle Parts Market  
> Built with ❤️ for BD motorcycle parts dealers
