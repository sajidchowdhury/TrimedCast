# TrimedCast — Implementation Roadmap

> **Phase-by-Phase, Session-by-Session Complete Build Plan**
> From zero → production-ready SaaS for Bangladesh motorcycle parts dealers

---

## The Vision

> *"A beautiful, smart, clean, creative, premium modern landing page that feels like a safe home for a business owner who is frustrated with combining previous data and future decisions. With very low spending, they can have a very big relief from a long-time issue."*

TrimedCast is the **annual planning brain** for BD motorcycle parts dealers. It turns their messy Excel sheets + gut feelings into data-driven seasonal forecasts, CNY risk alerts, and smart order triggers — for just 12,000 BDT/year.

---

## Table of Contents

1. [The Subscription Challenge](#the-subscription-challenge)
2. [AC-ID System Design](#ac-id-system-design)
3. [OTP Authentication Design](#otp-authentication-design)
4. [Complete Phase Map](#complete-phase-map)
5. [Phase 1: Foundation — Auth & Database](#phase-1-foundation--auth--database)
6. [Phase 2: The Front Door — Landing Page](#phase-2-the-front-door--landing-page)
7. [Phase 3: Access Control — Auth UI](#phase-3-access-control--auth-ui)
8. [Phase 4: First Steps — Onboarding](#phase-4-first-steps--onboarding)
9. [Phase 5: The Gate — Subscription System](#phase-5-the-gate--subscription-system)
10. [Phase 6: Multi-User Management](#phase-6-multi-user-management)
11. [Phase 7: Flexibility — Configurable Seasonality](#phase-7-flexibility--configurable-seasonality)
12. [Phase 8: Hardening — Production Ready](#phase-8-hardening--production-ready)
13. [Session Calendar](#session-calendar)
14. [Risk Register](#risk-register)

---

## The Subscription Challenge

### The Problem

> *"User can upload previous year data and see next year's predictions at once. So why pay for a full year subscription?"*

This is the **#1 business model risk**. If a user uploads 2024+2025 data in January 2026, sees all 2026 predictions, and thinks "I'm done" — they won't pay 12K for the year.

### The Solution: "Living Forecast" Model

**The key insight: Forecasting is NOT a one-time event. It's a living, breathing process that gets better with time.**

| Month | What Happens | Why They Need The Platform |
|-------|-------------|---------------------------|
| Jan 2026 | Upload 2024+2025 data, see 2026 predictions | Initial forecast is a SNAPSHOT — it will change |
| Feb 2026 | CNY shutdown starts — orders delayed, actuals differ from forecast | CNY risk alerts + actual-vs-forecast tracking |
| Mar 2026 | Add Feb actual sales → forecast RECALIBRATES | Auto-recalibration adjusts spring predictions |
| Apr 2026 | Eid promo planning — which products to push? | Promo impact simulation + expected uplift |
| Jun 2026 | Monsoon arrives — demand drops for certain categories | Season alerts + reorder point adjustments |
| Sep 2026 | Pre-winter preparation — bulk order timing | Order trigger engine: "Order NOW, 90-day sea freight" |
| Oct 2026 | 9 months of actual data → 2027 early predictions begin | Rolling forecast begins for next year |
| Dec 2026 | Full 2026 actuals → accurate 2027 predictions | Annual cycle starts again — NEED the platform |

**Each month, the forecast gets MORE valuable, not less.**

### Subscription Tier Design

**Only 1 paid plan: 12,000 BDT/year.** But with a smart free tier that hooks users.

| Feature | Free (Trial) | Pro (12K/yr) |
|---------|-------------|--------------|
| **Upload data** | ✅ Unlimited | ✅ Unlimited |
| **View forecast** | ⚠️ Next 3 months only, top 10 products | ✅ Full 12 months, all products |
| **Seasonal breakdown** | ❌ | ✅ Decomposition chart (trend + seasonal + residual) |
| **CNY risk alerts** | ❌ | ✅ Real-time alerts + order deadline dates |
| **Order triggers** | ❌ | ✅ Smart reorder recommendations with priority |
| **Auto-recalibration** | ❌ | ✅ Monthly forecast update with new actuals |
| **S&OE Tower** | ❌ | ✅ Full demand/supply/revenue consensus |
| **Promo simulation** | ❌ | ✅ Impact simulation + expected uplift |
| **Multi-user** | ❌ 1 user only | ✅ Up to 5 users per AC-ID |
| **Export reports** | ❌ | ✅ PDF/Excel export |
| **Support** | Email only | Priority WhatsApp + email |
| **Trial period** | 14 days full access | — |

### Why This Works

1. **The free tier shows ENOUGH value** — "Wow, it predicted my top 10 products for next 3 months!"
2. **But NOT enough to run a business** — "I need CNY alerts for ALL my products, and order triggers..."
3. **The trial gives FULL access for 14 days** — User gets addicted to the complete experience
4. **After trial, free tier feels like a teaser** — "I can see 3 months but I need 12 for my annual planning"
5. **Annual cycle creates natural retention** — Every year you need fresh forecasts with updated data

### Payment Flow

```
Signup → 14-day full trial → Trial ends → Free tier (limited) → 
User clicks "Upgrade" → bKash/Nagad/Card payment → 12K BDT → 
Pro access for 12 months → Auto-reminder before expiry → Renew or downgrade
```

**BD Payment Methods (critical for market):**
- bKash (most popular mobile banking in BD)
- Nagad (government mobile banking)
- SSLCommerz (card + mobile banking gateway)
- Manual bank transfer (for traditional businesses)

---

## AC-ID System Design

### What is AC-ID?

**AC-ID** = **Account ID** — a unique identifier auto-generated for each client (shop/business). All users under one business share the same AC-ID.

### Format

```
TC-{YEAR}-{DIVISION}-{SEQUENCE}

Examples:
TC-2025-DHK-0001    → First Dhaka client in 2025
TC-2025-CTG-0042    → 42nd Chittagong client in 2025
TC-2026-RAJ-0103    → 103rd Rajshahi client in 2026
```

### Why AC-ID?

| Problem | AC-ID Solves It |
|---------|-----------------|
| Multiple users per shop | All users login with same AC-ID + their own email/password |
| Shop owner wants to add staff | Admin creates users under the AC-ID |
| Staff leaves, new staff joins | Admin deactivates old user, creates new one |
| Owner tracks who did what | Audit log shows AC-ID + user email |
| Professional feel | "Your Account ID: TC-2025-DHK-0001" — feels like a real business system |

### Login Flow

```
Login Page:
┌─────────────────────────┐
│  AC-ID: TC-2025-DHK-0001│
│  Email: owner@shop.com   │
│  Password: ••••••••      │
│  [Login]                 │
└─────────────────────────┘

AC-ID identifies the TENANT (shop)
Email identifies the USER within that tenant
Password authenticates the user
```

### Database Model

```prisma
model Tenant {
  acId        String   @id @default(cuid())  // TC-2025-DHK-0001
  name        String                        // Shop name
  slug        String   @unique
  division    String                        // dhaka, chittagong, etc.
  // ... existing fields
}
```

---

## OTP Authentication Design

### Signup Flow

```
Step 1: User fills form
┌──────────────────────────┐
│  Shop Name: Rahman Auto   │
│  Email: rahman@gmail.com  │
│  Phone: +880 1712-345678  │
│  Division: [Dhaka ▼]      │
│  [Send OTP]               │
└──────────────────────────┘

Step 2: OTP sent to email
┌──────────────────────────┐
│  We sent a 6-digit code   │
│  to rahman@gmail.com      │
│                           │
│  Enter OTP: [_][_][_][_][_][_] │
│                           │
│  Didn't get it? Resend (58s)│
│  [Verify & Create Account] │
└──────────────────────────┘

Step 3: Account created
- AC-ID auto-generated: TC-2025-DHK-0001
- User role: admin (first user is always admin)
- 14-day trial starts
- Redirect to onboarding
```

### OTP Technical Design

```prisma
model OtpVerification {
  id          String   @id @default(cuid())
  email       String
  code        String          // 6-digit OTP
  purpose     String          // "signup" | "login" | "reset_password"
  expiresAt   DateTime        // 5 minutes from creation
  isVerified  Boolean  @default(false)
  attempts    Int      @default(0)  // max 3 attempts
  createdAt   DateTime @default(now())
}
```

### Email Service Options (for BD market)

| Service | Free Tier | BD Friendly | Recommendation |
|---------|-----------|-------------|----------------|
| Resend | 100/day | ✅ Simple API | ✅ **Best for start** |
| Nodemailer + Gmail | 500/day | ✅ Most common | ⚠️ Less reliable |
| SSLCommerz Email | Paid | ✅ BD company | ❌ Overkill for OTP |
| Mailgun | 5K/month (free) | ✅ Good deliverability | ⚠️ Setup complexity |

**Recommendation: Start with Resend, migrate to dedicated service if needed.**

---

## Complete Phase Map

```
PHASE 1: Foundation (Auth + Database)         ─── 4 sessions
PHASE 2: The Front Door (Landing Page)        ─── 3 sessions  
PHASE 3: Access Control (Auth UI)             ─── 2 sessions
PHASE 4: First Steps (Onboarding)             ─── 2 sessions
PHASE 5: The Gate (Subscription System)        ─── 3 sessions
PHASE 6: Multi-User Management                ─── 2 sessions
PHASE 7: Flexibility (Configurable Seasonality)── 1 session
PHASE 8: Hardening (Production Ready)         ─── 2 sessions
                                              ─────────────
                                              TOTAL: 19 sessions
```

---

## Phase 1: Foundation — Auth & Database

> **Goal:** Secure database + working auth API + password hashing + persistent sessions
> **Sessions:** 4 | **Priority:** 🔴 Critical | **Depends on:** Nothing

### Session 1: Database Schema Overhaul + PostgreSQL Migration

**What:**
- Migrate Prisma from SQLite → PostgreSQL
- Add `passwordHash`, `phone`, `division` to User model
- Add `OtpVerification` model
- Add `Session` model (DB-backed sessions, not in-memory)
- Add `acId` auto-generation logic to Tenant model
- Add `SeasonalityType` model (for Phase 7)
- Add `SubscriptionPayment` model (for Phase 5, bKash/Nagad tracking)

**Files to modify:**
- `prisma/schema.prisma` — Major updates
- `.env` — PostgreSQL connection string
- `src/lib/db.ts` — Verify PostgreSQL connection

**Prisma schema additions:**
```prisma
model User {
  id          String   @id @default(cuid())
  tenantId    String
  email       String
  passwordHash String          // ← NEW: bcrypt hashed
  name        String
  phone       String?          // ← NEW: BD phone number
  role        String   @default("admin")
  isActive    Boolean  @default(true)
  lastLoginAt DateTime?
  // ... existing fields
}

model OtpVerification {
  id          String   @id @default(cuid())
  email       String
  code        String
  purpose     String   // "signup" | "login" | "reset_password"
  tenantId    String?
  expiresAt   DateTime
  isVerified  Boolean  @default(false)
  attempts    Int      @default(0)
  createdAt   DateTime @default(now())
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  tenantId    String
  token       String   @unique
  expiresAt   DateTime
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}

model SubscriptionPayment {
  id              String   @id @default(cuid())
  tenantId        String
  amount          Float
  currency        String   @default("BDT")
  method          String   // "bkash" | "nagad" | "card" | "bank_transfer"
  transactionId   String?  // bKash/Nagad transaction ID
  status          String   @default("pending") // pending | completed | failed | refunded
  periodStart     DateTime
  periodEnd       DateTime
  createdAt       DateTime @default(now())
}

model SeasonalityType {
  id          String   @id @default(cuid())
  tenantId    String
  name        String   // "eid_peak"
  label       String   // "Eid Peak Demand"
  labelBn     String?  // "ঈদের চাহিদা বৃদ্ধি"
  description String?
  multiplier  Float    @default(1.0)
  months      String   // JSON: "[3,4]"
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, name])
}
```

**AC-ID generation logic:**
```typescript
// src/lib/auth/ac-id.ts
export async function generateAcId(division: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TC-${year}-${division.toUpperCase()}-`;
  
  // Count existing tenants this year in this division
  const count = await db.tenant.count({
    where: { 
      acId: { startsWith: prefix },
      createdAt: { gte: new Date(`${year}-01-01`) }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}
```

**Deliverables:**
- [ ] PostgreSQL running locally
- [ ] All models migrated
- [ ] AC-ID generation tested
- [ ] `bun run db:push` succeeds

---

### Session 2: Auth API — Registration with OTP + Login with AC-ID

**What:**
- Rewrite `/api/v1/auth/register` → Accept shop name, email, phone, division → Send OTP → Return pending verification
- New `/api/v1/auth/verify-otp` → Validate OTP → Create Tenant (with AC-ID) + Admin User
- Rewrite `/api/v1/auth/login` → Accept AC-ID + email + password → Validate → Return JWT
- New `/api/v1/auth/resend-otp` → Resend OTP with 60s cooldown
- New `/api/v1/auth/forgot-password` → Send OTP to email for password reset
- Password hashing with bcrypt
- DB-backed session store (replace in-memory Map)

**Files to create/modify:**
- `src/lib/auth/password.ts` — bcrypt hash/compare utilities
- `src/lib/auth/session-store.ts` — DB session management
- `src/lib/auth/ac-id.ts` — AC-ID generation
- `src/lib/auth/otp.ts` — OTP generation, verification, rate limiting
- `src/app/api/v1/auth/register/route.ts` — Rewrite
- `src/app/api/v1/auth/verify-otp/route.ts` — New
- `src/app/api/v1/auth/login/route.ts` — Rewrite
- `src/app/api/v1/auth/resend-otp/route.ts` — New

**OTP rules:**
- 6-digit random code
- Expires in 5 minutes
- Max 3 verification attempts per OTP
- Max 5 OTP sends per email per hour (rate limit)
- OTP is invalidated after successful verification

**Deliverables:**
- [ ] Register API sends OTP to email
- [ ] Verify OTP creates Tenant + User
- [ ] Login with AC-ID + email + password works
- [ ] Password properly hashed with bcrypt
- [ ] Session stored in database
- [ ] Rate limiting on OTP sends

---

### Session 3: Email Service Integration

**What:**
- Set up Resend (or fallback: Nodemailer + Gmail SMTP)
- Create email templates (OTP email, welcome email, subscription reminder)
- Test email delivery to BD email providers (Gmail, Yahoo, Outlook)

**Files to create:**
- `src/lib/email/service.ts` — Email sending abstraction
- `src/lib/email/templates/otp-email.tsx` — OTP verification email
- `src/lib/email/templates/welcome-email.tsx` — Post-signup welcome
- `src/lib/email/templates/subscription-reminder.tsx` — Expiry reminder
- `src/app/api/v1/auth/send-otp/route.ts` — Endpoint to trigger OTP

**OTP Email Design:**
```
┌────────────────────────────────────┐
│  TrimedCast                        │
│  ──────────────                    │
│                                    │
│  Your verification code:           │
│                                    │
│       ╔═══╗ ╔═══╗ ╔═══╗ ╔═══╗ ╔═══╗ ╔═══╗ │
│       ║ 4 ║ ║ 7 ║ ║ 2 ║ ║ 8 ║ ║ 1 ║ ║ 5 ║ │
│       ╚═══╝ ╚═══╝ ╚═══╝ ╚═══╝ ╚═══╝ ╚═══╝ │
│                                    │
│  This code expires in 5 minutes.   │
│                                    │
│  If you didn't request this,       │
│  please ignore this email.         │
│                                    │
│  — TrimedCast Team                 │
└────────────────────────────────────┘
```

**Deliverables:**
- [ ] Email service working (Resend or Nodemailer)
- [ ] OTP email template renders correctly
- [ ] Welcome email template ready
- [ ] Email sends successfully to test address

---

### Session 4: Auth Middleware + Route Protection

**What:**
- Create Next.js middleware (`middleware.ts`) for route protection
- Protected routes: `/dashboard/*` — require valid session
- Public routes: `/`, `/login`, `/signup`, `/pricing`, `/api/v1/auth/*`
- Add auth context to dashboard (current user, tenant, role)
- Add logout functionality (invalidate DB session)

**Files to create/modify:**
- `src/middleware.ts` — Route protection
- `src/lib/auth/middleware.ts` — Auth check logic
- `src/lib/auth/context.ts` — Current user context provider
- `src/app/api/v1/auth/logout/route.ts` — Invalidate session
- `src/components/dashboard/dashboard-layout.tsx` — Add user context

**Middleware logic:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('trimedcast-session')?.value;
  const path = request.nextUrl.pathname;
  
  // Public routes — always allow
  if (PUBLIC_ROUTES.includes(path)) return NextResponse.next();
  
  // Protected routes — require valid token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token against DB session
  // If invalid/expired → redirect to /login
  // If valid → attach user context → allow
}
```

**Deliverables:**
- [ ] Middleware protects dashboard routes
- [ ] Unauthenticated users redirected to /login
- [ ] Session token validated against DB
- [ ] Logout invalidates session
- [ ] Auth context available in dashboard

---

## Phase 2: The Front Door — Landing Page

> **Goal:** A beautiful, premium landing page that makes frustrated business owners feel "this is exactly what I need"
> **Sessions:** 3 | **Priority:** 🔴 Critical | **Depends on:** Phase 1

### Design Philosophy

```
"I am a motorcycle parts dealer in Bangladesh.
I have 5 years of sales data in Excel sheets.
Every year before winter, I ORDER TOO MUCH.
Every monsoon, I SIT ON DEAD STOCK.
Chinese New Year? I ALWAYS order late.
I'm TIRED of guessing.

TrimedCast understands my pain.
It speaks my language.
It's simple enough for my shop.
And it costs less than one bad order."
```

### Session 5: Landing Page — Hero + Problem + Solution

**What:**
- Move dashboard from `/` to `/dashboard`
- Create new landing page at `/`
- Hero section with powerful headline + CTA
- Problem section — "The 3 killers of motorcycle parts business"
- Solution section — "TrimedCast solves all 3"

**Layout structure:**
```
src/app/(marketing)/layout.tsx         — Marketing layout (no sidebar)
src/app/(marketing)/page.tsx           — Landing page
src/components/landing/hero.tsx        — Hero section
src/components/landing/problem.tsx     — Pain points
src/components/landing/solution.tsx    — How TrimedCast helps
```

**Hero Design Concept:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ╔═══════════════════════════════════════════╗  │
│  ║                                           ║  │
│  ║  মোটরসাইকেল পার্টস ডিলারের            ║  │
│  ║  ঋতুভিত্তিক চাহিদা পূর্বাভাসিত          ║  │
│  ║  এখন ডাটা-ড্রিভেন                          ║  │
│  ║                                           ║  │
│  ║  Stop guessing. Start forecasting.        ║  │
│  ║                                           ║  │
│  ║  TrimedCast predicts seasonal demand,     ║  │
│  ║  warns about CNY delays, and tells you    ║  │
│  ║  exactly WHEN and HOW MUCH to order.      ║  │
│  ║                                           ║  │
│  ║  [Get Started Free →]   [See How It Works]║  │
│  ║                                           ║  │
│  ╚═══════════════════════════════════════════╝  │
│                                                 │
│  ✓ No credit card required                      │
│  ✓ See predictions in 5 minutes                 │
│  ✓ Built for Bangladesh motorcycle parts market │
│                                                 │
└─────────────────────────────────────────────────┘
```

**3 Pain Points Section:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  📦 OVERSTOCK │ │  🌧️ DEAD STOCK│ │  🇨🇳 CNY RISK │
│              │ │              │ │              │
│  "Winter     │ │  "Monsoon    │ │  "Chinese    │
│   comes, you │ │   comes,     │ │   New Year   │
│   order 2x   │ │   nobody     │ │   shuts      │
│   stock.     │ │   buys chain │ │   factories   │
│   Half sits  │ │   pads. Your │ │   for 30     │
│   unsold     │ │   capital is │ │   days. You  │
│   till next  │ │   locked."   │ │   always     │
│   year."     │ │              │ │   order late."│
└──────────────┘ └──────────────┘ └──────────────┘
```

**Deliverables:**
- [ ] Dashboard moved to `/dashboard`
- [ ] Landing page renders at `/`
- [ ] Hero section with headline + dual CTA
- [ ] Problem section with 3 pain points
- [ ] Responsive (mobile + desktop)
- [ ] Smooth scroll animations (Framer Motion)

---

### Session 6: Landing Page — Features + How It Works + Social Proof

**What:**
- Features section — 6 key features with icons
- "How It Works" section — 3-step process
- Social proof / trust section
- Statistics / numbers section

**Features to showcase:**
```
1. 📊 Seasonal Forecasting     — "Know which products peak in winter, dip in monsoon"
2. 🇨🇳 CNY Risk Engine         — "Never get caught by Chinese New Year shutdowns again"  
3. 📦 Smart Order Triggers     — "Get told WHEN and HOW MUCH to order, automatically"
4. 🔄 Auto Recalibration       — "Forecasts improve every month with your actual sales"
5. 📈 S&OE Control Tower       — "See demand vs supply gaps before they become problems"
6. 🎯 Promo Impact Simulator  — "Know if your Eid discount will actually increase profit"
```

**How It Works (3 steps):**
```
Step 1          Step 2          Step 3
┌────────┐     ┌────────┐     ┌────────┐
│ UPLOAD │ ──→ │FORECAST│ ──→ │ ORDER  │
│        │     │        │     │        │
│ Upload │     │ AI +   │     │ Get    │
│ your   │     │ Prophet│     │ smart  │
│ Excel  │     │ predicts│     │ reorder│
│ sheets │     │ 2026   │     │ alerts │
└────────┘     └────────┘     └────────┘

  5 min          2 min          Instant
```

**Statistics section:**
```
42%     90 days     15%        12K
━━━     ━━━━━━     ━━━━       ━━━━
average  sea freight avg stock   BDT/yr
stock    from China  reduction  full
reduction             with       access
                      forecast
```

**Deliverables:**
- [ ] 6 feature cards with icons
- [ ] How It Works 3-step section
- [ ] Statistics/numbers section
- [ ] Animations on scroll (Framer Motion + Intersection Observer)

---

### Session 7: Landing Page — Pricing + FAQ + Footer + Navigation

**What:**
- Pricing section — 1 plan (12K/yr) with feature list + free trial CTA
- FAQ section — 8-10 common questions
- Footer — Links, contact, social
- Sticky navigation bar with logo + links + CTA
- Mobile hamburger menu

**Pricing Section Design:**
```
┌─────────────────────────────────────────────┐
│                                             │
│  Simple Pricing. No surprises.              │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  Pro Plan                           │    │
│  │                                     │    │
│  │  ৳12,000 / year                    │    │
│  │  (that's just ৳1,000/month)        │    │
│  │                                     │    │
│  │  ✓ Full 12-month forecasts          │    │
│  │  ✓ CNY risk alerts                  │    │
│  │  ✓ Smart order triggers             │    │
│  │  ✓ Auto recalibration               │    │
│  │  ✓ S&OE Control Tower               │    │
│  │  ✓ Up to 5 team members             │    │
│  │  ✓ Priority support (WhatsApp)      │    │
│  │                                     │    │
│  │  [Start 14-Day Free Trial]          │    │
│  │                                     │    │
│  │  No credit card required for trial  │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Pay via: bKash | Nagad | Bank Transfer    │
│                                             │
└─────────────────────────────────────────────┘
```

**FAQ Questions:**
1. "আমার কি প্রযুক্তিগত জ্ঞান লাগবে?" — "না, শুধু Excel ফাইল আপলোড করুন"
2. "কতদিনের ডাটা লাগবে?" — "কমপক্ষে ১২ মাসের বিক্রি ডাটা"
3. "Chinese New Year এ কী হবে?" — "অটোমেটিক অর্ডার ডেডলাইন অ্যালার্ট পাবেন"
4. "১২,০০০ টাকা কেন?" — "একটা ভুল অর্ডারের ক্ষতি থেকে অনেক কম"
5. "ট্রায়াল শেষে কী হবে?" — "ফ্রি টায়ারে সীমিত ফোরকাস্ট দেখতে পাবেন"
6. "একাধিক ইউজার পারব?" — "হ্যাঁ, সর্বোচ্চ ৫ জন"
7. "ডাটা কি নিরাপদ?" — "হ্যাঁ, এনক্রিপ্টেড ও ব্যাকআপ করা হয়"

**Deliverables:**
- [ ] Pricing section with 1 plan
- [ ] BD payment methods shown
- [ ] FAQ accordion section (Bangla + English)
- [ ] Footer with links
- [ ] Responsive navigation bar
- [ ] Mobile hamburger menu
- [ ] Full page scroll-smooth navigation

---

## Phase 3: Access Control — Auth UI

> **Goal:** Beautiful signup + login pages with OTP flow
> **Sessions:** 2 | **Priority:** 🔴 Critical | **Depends on:** Phase 1

### Session 8: Signup Page with OTP

**What:**
- Create `/signup` page with form: shop name, email, phone, division dropdown
- Form validation (Zod)
- "Send OTP" button → calls API → shows OTP input
- 6-digit OTP input with individual boxes
- Auto-focus next box on digit entry
- "Resend OTP" with 60s countdown timer
- On verify → create account → redirect to onboarding

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│     🔶 TrimedCast                   │
│                                     │
│     Create your account             │
│     আপনার অ্যাকাউন্ট তৈরি করুন    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Shop Name                   │    │
│  │ e.g., Rahman Auto Parts     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Email Address               │    │
│  │ e.g., rahman@gmail.com      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Phone Number                │    │
│  │ +880 1XXX-XXXXXX            │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Division            [▼]     │    │
│  │ Dhaka                       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Password                    │    │
│  │ Min 8 characters            │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Create Account & Send OTP →]      │
│                                     │
│  Already have an account? [Login]   │
│                                     │
└─────────────────────────────────────┘

After clicking "Create Account":

┌─────────────────────────────────────┐
│                                     │
│     ✉️ Check your email             │
│     আপনার ইমেইল চেক করুন          │
│                                     │
│     We sent a 6-digit code to       │
│     rahman@gmail.com                │
│                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│  │ 4 │ │ 7 │ │ 2 │ │   │ │   │ │   │ │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│                                     │
│  [Verify & Continue →]              │
│                                     │
│  Didn't get it? Resend in 58s       │
│                                     │
└─────────────────────────────────────┘

After verification:

┌─────────────────────────────────────┐
│                                     │
│     🎉 Welcome to TrimedCast!       │
│                                     │
│     Your Account ID:                │
│     TC-2025-DHK-0001               │
│                                     │
│     Save this ID. All team members  │
│     will use this to login.         │
│                                     │
│     [Continue to Setup →]           │
│                                     │
└─────────────────────────────────────┘
```

**Files to create:**
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/components/auth/signup-form.tsx`
- `src/components/auth/otp-input.tsx`
- `src/components/auth/ac-id-display.tsx`

**Deliverables:**
- [ ] Signup form with validation
- [ ] OTP send + verify flow
- [ ] AC-ID displayed after creation
- [ ] Error handling (email exists, OTP expired, etc.)
- [ ] Responsive design

---

### Session 9: Login Page

**What:**
- Create `/login` page — AC-ID + email + password
- Simple, clean design (no distraction)
- "Forgot Password?" link → OTP-based reset
- Remember me checkbox (persistent session)

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│     🔶 TrimedCast                   │
│                                     │
│     Welcome back                    │
│     আবার স্বাগতম                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Account ID (AC-ID)          │    │
│  │ e.g., TC-2025-DHK-0001     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Your Email                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Password                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ☐ Remember me                      │
│                                     │
│  [Login →]                          │
│                                     │
│  Forgot password? [Reset here]      │
│  New to TrimedCast? [Create account]│
│                                     │
└─────────────────────────────────────┘
```

**Files to create:**
- `src/app/(auth)/login/page.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/forgot-password-form.tsx`

**Deliverables:**
- [ ] Login form with AC-ID + email + password
- [ ] Forgot password flow (OTP-based)
- [ ] Error messages (invalid AC-ID, wrong password, account suspended)
- [ ] Redirect to dashboard on success
- [ ] Remember me functionality

---

## Phase 4: First Steps — Onboarding

> **Goal:** Guided flow that teaches new users what to do — without blocking them
> **Sessions:** 2 | **Priority:** 🟡 High | **Depends on:** Phase 1, 3

### Design Philosophy

> **Onboarding should be like a helpful friend, not a locked door.**

- User CAN skip any step
- User CAN go to dashboard directly
- But the onboarding SHOWS them the value quickly
- Progress is saved — can resume later

### Session 10: Onboarding Flow — Steps 1-4

**What:**
- Welcome screen with AC-ID display
- Step 1: "Tell us about your business" — Business type, main brands, main categories
- Step 2: "Download CSV templates" — Show all 7 import types with download buttons
- Step 3: "Upload your first data" — Guided import with progress tracking
- Step 4: "See your first forecast" — Run forecast on uploaded data, show results

**Flow:**
```
Signup → Welcome Screen
  │
  ├─ Step 1: Business Profile (skip: ✅)
  │   "What motorcycle brands do you sell?"
  │   □ Bajaj  □ TVS  □ Hero  □ Honda  □ Yamaha  □ Runner  □ Walton
  │   
  │   "What parts categories?"
  │   □ Engine  □ Brake  □ Chain  □ Filter  □ Electrical  □ Body  □ Other
  │
  ├─ Step 2: Download Templates (skip: ✅)
  │   ┌──────────────────┐ ┌──────────────────┐
  │   │ 📥 Motorcycle    │ │ 📥 Suppliers     │
  │   │    Models CSV    │ │    CSV           │
  │   └──────────────────┘ └──────────────────┘
  │   ┌──────────────────┐ ┌──────────────────┐
  │   │ 📥 Products      │ │ 📥 Inventory     │
  │   │    CSV           │ │    CSV           │
  │   └──────────────────┘ └──────────────────┘
  │   ... (all 7 types)
  │
  ├─ Step 3: Upload Data (skip: ✅)
  │   "Upload your sales data to see predictions"
  │   [Upload Area — drag & drop]
  │   
  │   Or: "Use demo data to explore first"
  │   [Load Demo Data →]
  │
  ├─ Step 4: First Forecast (skip: ✅)
  │   "Running your first forecast..."
  │   [Forecast Chart Animation]
  │   "See? Your winter demand peaks in November!"
  │
  └─ Dashboard (full access)
```

**Files to create:**
- `src/app/(auth)/onboarding/page.tsx`
- `src/components/onboarding/onboarding-wizard.tsx`
- `src/components/onboarding/step-welcome.tsx`
- `src/components/onboarding/step-business-profile.tsx`
- `src/components/onboarding/step-download-templates.tsx`
- `src/components/onboarding/step-upload-data.tsx`
- `src/components/onboarding/step-first-forecast.tsx`
- `src/lib/onboarding/store.ts` — Zustand store for onboarding state

**Deliverables:**
- [ ] Welcome screen with AC-ID
- [ ] Business profile step
- [ ] Template download step
- [ ] Data upload step (with demo data option)
- [ ] First forecast step
- [ ] Skip/resume functionality
- [ ] Progress saved to DB

---

### Session 11: Onboarding Flow — Polish + Demo Data Loader

**What:**
- "Load Demo Data" button that auto-imports all 9 demo CSVs
- Animated transitions between steps
- Progress indicator (step 1/5, 2/5, etc.)
- Mobile responsive
- "Skip all → Go to Dashboard" option

**Deliverables:**
- [ ] Demo data auto-loader working
- [ ] Smooth step transitions
- [ ] Progress indicator
- [ ] Mobile responsive
- [ ] Skip all → Dashboard works

---

## Phase 5: The Gate — Subscription System

> **Goal:** Working 12K BDT/year subscription with BD payment methods
> **Sessions:** 3 | **Priority:** 🔴 Critical | **Depends on:** Phase 1, 3

### Session 12: Subscription Model — Trial + Feature Gating

**What:**
- 14-day full-access trial on signup
- Trial countdown in dashboard header
- Feature gating middleware — check subscription status before allowing features
- Free tier limits — 3-month forecast, 10 products, no CNY alerts, no order triggers
- Upgrade prompts when hitting free tier limits

**Feature Gate Logic:**
```typescript
// src/lib/subscription/gates.ts

const FREE_TIER_LIMITS = {
  forecastMonths: 3,        // Only next 3 months
  maxProducts: 10,          // Top 10 products only
  cnyAlerts: false,         // No CNY risk alerts
  orderTriggers: false,     // No smart order triggers
  autoRecalibration: false, // No auto recalibration
  soeTower: false,          // No S&OE Control Tower
  promoSimulator: false,    // No promo simulation
  multiUser: false,         // Single user only
  exportReports: false,     // No PDF/Excel export
};

const PRO_TIER_LIMITS = {
  forecastMonths: 12,
  maxProducts: Infinity,
  cnyAlerts: true,
  orderTriggers: true,
  autoRecalibration: true,
  soeTower: true,
  promoSimulator: true,
  multiUser: true,          // Up to 5 users
  exportReports: true,
};
```

**Upgrade Prompt Design:**
```
┌─────────────────────────────────┐
│  🔒 This feature requires Pro   │
│                                 │
│  CNY Risk Alerts help you       │
│  order before factory shutdown. │
│                                 │
│  Upgrade for just ৳12,000/yr   │
│                                 │
│  [Upgrade Now →]  [Maybe Later] │
└─────────────────────────────────┘
```

**Files to create:**
- `src/lib/subscription/gates.ts` — Feature gate logic
- `src/lib/subscription/tiers.ts` — Tier definitions
- `src/lib/subscription/check.ts` — Subscription status check
- `src/components/dashboard/trial-banner.tsx` — Trial countdown
- `src/components/dashboard/upgrade-prompt.tsx` — Feature gate prompt

**Deliverables:**
- [ ] 14-day trial starts on signup
- [ ] Trial countdown banner in dashboard
- [ ] Feature gates working (free vs pro)
- [ ] Upgrade prompts on gated features
- [ ] Subscription status persisted in DB

---

### Session 13: BD Payment Integration — bKash + Nagad + SSLCommerz

**What:**
- Payment page with BD payment methods
- bKash integration (most popular mobile banking in BD)
- Nagad integration (government mobile banking)
- SSLCommerz gateway for card payments
- Manual bank transfer option (upload payment proof)
- Payment verification + subscription activation

**Payment Page Design:**
```
┌─────────────────────────────────────┐
│                                     │
│  Upgrade to Pro                     │
│  ৳12,000 / year                    │
│                                     │
│  Choose payment method:             │
│                                     │
│  ┌─────────┐ ┌─────────┐          │
│  │  bKash  │ │  Nagad  │          │
│  │  ৳ ✓    │ │  ৳      │          │
│  └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────────┐      │
│  │  Card   │ │ Bank Transfer│      │
│  │  💳     │ │  🏦         │      │
│  └─────────┘ └─────────────┘      │
│                                     │
│  ─────────────────────────          │
│                                     │
│  bKash Payment:                     │
│  1. Send ৳12,000 to: 017XX-XXXXXX │
│  2. Enter your bKash TrxID:        │
│  ┌───────────────────────────┐     │
│  │ bKash Transaction ID      │     │
│  └───────────────────────────┘     │
│  [Verify Payment →]                 │
│                                     │
│  🔒 Payment is verified manually    │
│     within 24 hours                 │
│                                     │
└─────────────────────────────────────┘
```

**Payment Flow:**
```
User clicks Upgrade → Choose method →
  ├─ bKash: Show merchant number → User sends money → Enter TrxID → Admin verifies
  ├─ Nagad: Same as bKash flow
  ├─ Card: SSLCommerz gateway → Auto-verify
  └─ Bank Transfer: Show bank details → Upload receipt → Admin verifies

Admin verifies → Subscription activated → User gets Pro access
```

> **Note:** For MVP, bKash/Nagad can be semi-manual (user sends, enters TrxID, admin verifies). Auto-verification via bKash/Nagad API is Phase 2 enhancement.

**Files to create:**
- `src/app/(dashboard)/upgrade/page.tsx` — Payment page
- `src/components/subscription/payment-methods.tsx`
- `src/components/subscription/bkash-payment.tsx`
- `src/components/subscription/nagad-payment.tsx`
- `src/components/subscription/bank-transfer.tsx`
- `src/app/api/v1/subscription/pay/route.ts` — Payment submission
- `src/app/api/v1/subscription/verify/route.ts` — Admin verification

**Deliverables:**
- [ ] Payment page with 4 methods
- [ ] bKash semi-manual flow working
- [ ] Nagad semi-manual flow working
- [ ] Bank transfer with receipt upload
- [ ] Payment records in DB
- [ ] Admin can verify payments

---

### Session 14: Subscription Management + Renewal + Expiry

**What:**
- Subscription status in settings
- Renewal reminder emails (7 days before expiry)
- Auto-downgrade on expiry (Pro → Free tier)
- Payment history page
- Admin panel for payment verification

**Deliverables:**
- [ ] Subscription status visible in settings
- [ ] Renewal reminder 7 days before
- [ ] Auto-downgrade on expiry
- [ ] Payment history
- [ ] Admin verification panel

---

## Phase 6: Multi-User Management

> **Goal:** Admin can create/manage users under their AC-ID
> **Sessions:** 2 | **Priority:** 🟡 High | **Depends on:** Phase 1, 3, 5

### Session 15: User Management UI + API

**What:**
- "Team" page in dashboard settings
- Admin can invite users (email + role)
- Invite sends email with link to set password
- Roles: admin, warehouse_manager, sales_manager, viewer
- Admin can deactivate/remove users
- Max 5 users on Pro plan

**Invite Flow:**
```
Admin clicks "Invite Team Member"
  → Enters email + selects role
  → System sends invite email
  → Invitee clicks link → Sets password → Joins team
  → All use same AC-ID to login
```

**Team Page Design:**
```
┌─────────────────────────────────────────┐
│  Team Members                [Invite →] │
│  AC-ID: TC-2025-DHK-0001               │
│  Plan: Pro (5/5 members)               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 👤 Abdul Rahman      Admin   ✅ │    │
│  │    rahman@gmail.com             │    │
│  ├─────────────────────────────────┤    │
│  │ 👤 Karim Uddin      Manager ✅ │    │
│  │    karim@gmail.com              │    │
│  ├─────────────────────────────────┤    │
│  │ 👤 Jamil Hossain    Viewer  ✅ │    │
│  │    jamil@gmail.com              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Files to create:**
- `src/app/(dashboard)/settings/team/page.tsx`
- `src/components/settings/team-list.tsx`
- `src/components/settings/invite-member.tsx`
- `src/app/api/v1/users/invite/route.ts`
- `src/app/api/v1/users/[id]/deactivate/route.ts`
- `src/app/(auth)/accept-invite/page.tsx`

**Deliverables:**
- [ ] Team management page
- [ ] Invite flow with email
- [ ] Role assignment
- [ ] User deactivation
- [ ] Max user limit enforcement (5 for Pro)

---

### Session 16: Role-Based Access Control (RBAC)

**What:**
- Define permissions per role
- Apply RBAC to all dashboard pages
- UI adapts based on role (viewer can't see settings, manager can't see billing)

**Role Permissions Matrix:**

| Feature | Admin | Manager | Viewer |
|---------|-------|---------|--------|
| Dashboard Overview | ✅ | ✅ | ✅ (read-only) |
| Forecast | ✅ | ✅ | ✅ (read-only) |
| Order Triggers | ✅ | ✅ | ❌ |
| Import Data | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ✅ (read-only) |
| Suppliers | ✅ | ✅ | ✅ (read-only) |
| Settings | ✅ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ |
| Team Management | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ (read-only) |
| S&OE Tower | ✅ | ✅ | ❌ |
| AI Assistant | ✅ | ✅ | ✅ |

**Deliverables:**
- [ ] RBAC middleware on all routes
- [ ] Sidebar items hidden based on role
- [ ] Read-only mode for viewer
- [ ] Permission denied page for unauthorized access

---

## Phase 7: Flexibility — Configurable Seasonality

> **Goal:** Users can add/edit/delete custom seasonality types
> **Sessions:** 1 | **Priority:** 🟡 High | **Depends on:** Phase 1

### Session 17: Seasonality Type Management UI

**What:**
- Add "Seasonality" section to Settings page
- CRUD interface for seasonality types
- Seed default BD seasonality types
- Allow custom types (eid_peak, puja_peak, back_to_school, etc.)
- Each type has: name, label (Bangla), months, demand multiplier
- Forecast engine reads from DB instead of hardcoded values

**Default BD Seasonality Types (seeded):**
```
┌──────────────────────────────────────────────────────┐
│  Seasonality Types                    [+ Add Type]   │
│                                                      │
│  🔴 Winter Peak        Nov-Feb    ×1.35   Default   │
│     শীতকালীন চাহিদা বৃদ্ধি                          │
│                                                      │
│  🔵 Pre-Winter Peak    Oct        ×1.20   Default   │
│     শীতের পূর্বে চাহিদা                              │
│                                                      │
│  🟢 Summer Peak        Mar-May    ×1.10   Default   │
│     গ্রীষ্মকালীন চাহিদা                              │
│                                                      │
│  🟡 Monsoon Dip        Jun-Sep    ×0.70   Default   │
│     মৌসুমী চাহিদা হ্রাস                              │
│                                                      │
│  🟣 Eid Peak           Ramadan    ×1.50   Custom    │
│     ঈদের চাহিদা বৃদ্ধি          [Edit] [Delete]   │
│                                                      │
│  🟤 CNY Preparation    Jan        ×1.15   Custom    │
│     চাইনিজ নিউ ইয়ার প্রস্তুতি  [Edit] [Delete]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Add Type Modal:**
```
┌──────────────────────────────────┐
│  Add Seasonality Type            │
│                                  │
│  Name: eid_peak                  │
│  Label: Eid Peak Demand          │
│  লেবেল (বাংলা): ঈদের চাহিদা বৃদ্ধি│
│                                  │
│  Months: [☑Mar] [☑Apr] [☐May]  │
│           [☐Jun] [☐Jul] ...     │
│                                  │
│  Demand Multiplier: [1.50]       │
│  (1.0 = normal, 1.5 = 50% more) │
│                                  │
│  [Save]  [Cancel]                │
└──────────────────────────────────┘
```

**Files to create/modify:**
- `src/components/settings/seasonality-manager.tsx`
- `src/components/settings/seasonality-form.tsx`
- `src/app/api/v1/seasonality-types/route.ts` — CRUD
- `src/lib/forecast/engine.ts` — Read from DB instead of hardcoded
- `prisma/seed.ts` — Seed default seasonality types

**Deliverables:**
- [ ] Seasonality management UI in Settings
- [ ] CRUD operations working
- [ ] Default types seeded
- [ ] Custom types can be added
- [ ] Forecast engine uses DB types

---

## Phase 8: Hardening — Production Ready

> **Goal:** Security, performance, reliability — ready for real users
> **Sessions:** 2 | **Priority:** 🔴 Critical | **Depends on:** All previous

### Session 18: Security Hardening

**What:**
- HTTPS enforcement
- Security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on all API routes
- CORS configuration
- Input sanitization audit
- SQL injection verification (Prisma is safe, but check raw queries)
- CSRF protection
- Dependency audit (`bun audit`)
- .env production template
- Secrets rotation guide

**Rate Limits:**
```
/api/v1/auth/*       → 10 requests/minute (prevent brute force)
/api/v1/imports/*    → 5 requests/minute (prevent abuse)
/api/v1/forecast/*   → 20 requests/minute
/api/v1/subscription → 5 requests/minute
All other API        → 100 requests/minute
```

**Security Headers:**
```typescript
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';",
};
```

**Deliverables:**
- [ ] Security headers applied
- [ ] Rate limiting on all API routes
- [ ] CORS configured
- [ ] Input sanitization complete
- [ ] Dependency audit clean
- [ ] .env template documented

---

### Session 19: Final Integration Testing + Deployment Prep

**What:**
- End-to-end testing of complete user flow
- Landing → Signup → OTP → Onboarding → Import → Forecast → Subscribe
- Multi-user flow
- Mobile responsive audit
- Performance audit (Lighthouse)
- Build optimization
- Deployment guide verification
- Final database migration
- Production .env template

**E2E Test Flow:**
```
1. Visit landing page → Understand product
2. Click "Get Started" → Go to signup
3. Fill signup form → Receive OTP (check email)
4. Enter OTP → Account created → AC-ID shown
5. Onboarding wizard → Skip or complete steps
6. Dashboard loads → All 12 pages accessible
7. Import data → 7-step wizard works
8. Run forecast → 2026 predictions visible
9. Trial banner shows → "14 days remaining"
10. Click upgrade → Payment page
11. Select bKash → Enter TrxID → Submit
12. (Admin verifies payment) → Pro access
13. Invite team member → They receive email
14. Team member logs in with AC-ID
15. All features accessible based on role
```

**Lighthouse Targets:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

**Deliverables:**
- [ ] Complete E2E flow tested
- [ ] Mobile responsive verified
- [ ] Lighthouse scores acceptable
- [ ] Production build succeeds
- [ ] Deployment guide verified
- [ ] Ready for production server

---

## Session Calendar

| Session | Phase | Topic | Key Deliverable | Days |
|---------|-------|-------|-----------------|------|
| **1** | Foundation | DB Schema + PostgreSQL | Migrated schema, AC-ID logic | 1 |
| **2** | Foundation | Auth API (Register+Login+OTP) | Working auth endpoints | 1 |
| **3** | Foundation | Email Service (Resend) | OTP emails sending | 0.5 |
| **4** | Foundation | Auth Middleware | Route protection working | 0.5 |
| **5** | Landing | Hero + Problem + Solution | Landing page structure | 1 |
| **6** | Landing | Features + How It Works | Feature showcase | 1 |
| **7** | Landing | Pricing + FAQ + Footer | Complete landing page | 1 |
| **8** | Auth UI | Signup Page + OTP | Signup flow complete | 1 |
| **9** | Auth UI | Login Page | Login flow complete | 0.5 |
| **10** | Onboarding | Steps 1-4 | Onboarding wizard | 1 |
| **11** | Onboarding | Polish + Demo Loader | Smooth onboarding | 0.5 |
| **12** | Subscription | Trial + Feature Gating | Free/Pro tier working | 1 |
| **13** | Subscription | BD Payment (bKash/Nagad) | Payment flow working | 1.5 |
| **14** | Subscription | Management + Renewal | Subscription lifecycle | 1 |
| **15** | Multi-User | User Management UI | Team management | 1 |
| **16** | Multi-User | RBAC | Role-based access | 0.5 |
| **17** | Seasonality | Configurable Types | Custom seasonality | 1 |
| **18** | Hardening | Security | Production security | 1 |
| **19** | Hardening | Final Testing | Production ready | 1 |
| | | | **TOTAL** | **15.5 days** |

### Parallel Execution Opportunities

These sessions can run in parallel (different developers):

```
Session 5-7 (Landing Page)  ←→  Session 8-9 (Auth UI)
  Can run in parallel since landing and auth UI are independent

Session 10-11 (Onboarding)  ←→  Session 12 (Feature Gating)
  Onboarding UI and subscription logic are independent
```

With 2 developers: **~10 days** total
With 1 developer: **~15.5 days** total

---

## Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | **"One-and-done" subscription** — User uploads data, sees forecast, cancels | 🔴 High | Medium | Living Forecast model + 14-day trial + free tier limitations + ongoing value (recalibration, CNY alerts, order triggers) |
| 2 | **Email deliverability in BD** — OTP emails go to spam | 🟡 Medium | Medium | Use Resend (good deliverability), add phone OTP as backup, clear instructions to check spam |
| 3 | **bKash/Nagad API complexity** — Auto-verification hard to implement | 🟡 Medium | High | Start with semi-manual flow (TrxID entry + admin verify). Auto-verify later. |
| 4 | **PostgreSQL migration issues** — SQLite-specific syntax breaks | 🟡 Medium | Low | Test migration early (Session 1), fix queries incrementally |
| 5 | **Mobile performance** — Heavy charts on low-end BD phones | 🟡 Medium | Medium | Lazy load charts, use skeleton loading, test on real BD Android devices |
| 6 | **User adoption** — BD dealers may not trust SaaS | 🟡 Medium | Medium | Bangla-first UI, familiar Excel import, free trial, WhatsApp support |
| 7 | **Data security concern** — Dealers protective of sales data | 🟡 Medium | Medium | Emphasize encryption, mention data privacy, allow data export/delete |

---

## Priority Decision Matrix

When time is limited, build in this order:

```
1. Auth (Sessions 1-4)          → Without this, nothing is real
2. Landing Page (Sessions 5-7)  → Without this, nobody comes
3. Auth UI (Sessions 8-9)       → Without this, nobody enters
4. Subscription (Sessions 12-14)→ Without this, nobody pays
5. Onboarding (Sessions 10-11)  → Without this, nobody stays
6. Multi-User (Sessions 15-16)  → Without this, teams can't use it
7. Seasonality (Session 17)     → Nice to have, not blocking
8. Hardening (Sessions 18-19)   → Must do before real launch
```

---

> **TrimedCast** — Seasonal Demand & Inventory Forecasting for Bangladesh Motorcycle Parts Market  
> *"Stop guessing. Start forecasting."*  
> Built with ❤️ for BD motorcycle parts dealers
