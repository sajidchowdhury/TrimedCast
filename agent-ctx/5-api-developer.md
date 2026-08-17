# Task 5 - Subscription API Routes (Agent: API Developer)

## Summary
Created all 7 subscription management API route files under `/api/v1/subscription/` with complete business logic for subscription lifecycle management.

## Files Created

### 1. `/src/app/api/v1/subscription/status/route.ts` (GET)
- Returns subscription details with computed status info
- Computes: daysUntilExpiry, inGracePeriod, canRenew, canResume, canCancel, canChangePlan, isTrial, isExpired, statusLabel
- Returns tenant billing info and BDT pricing
- If no subscription exists, returns default trial status

### 2. `/src/app/api/v1/subscription/change-plan/route.ts` (POST)
- Body: `{ tier, billingCycle? }`
- Validates tier is different from current
- Upgrade: immediate access with new period dates
- Downgrade: deferred to next billing period (pending change stored in metadata)
- Cycle change: immediate
- Records SubscriptionEvent with fromTier/toTier and change metadata
- Updates tenant plan field

### 3. `/src/app/api/v1/subscription/cancel/route.ts` (POST)
- Body: `{ reason?, feedback?, immediate? }`
- Validates subscription status (only active/past_due/trial can cancel)
- `immediate=true` only for admin role
- Default: cancel at period end (endsAt = currentPeriodEnd)
- Sets autoRenew=false, records cancellation reason/feedback
- Records SubscriptionEvent

### 4. `/src/app/api/v1/subscription/resume/route.ts` (POST)
- Validates subscription is cancelled AND endsAt is in the future
- Sets status back to active, clears cancelledAt/endsAt
- Re-enables autoRenew
- Updates tenant status to active
- Records SubscriptionEvent

### 5. `/src/app/api/v1/subscription/renew/route.ts` (POST)
- Body: `{ paymentMethod? }`
- Validates subscription is active/past_due/trial
- Creates SubscriptionPayment record (demo mode: auto-succeeds)
- Creates Invoice for the new period
- Updates subscription period dates, lastPaymentAt, clears fail counters
- Updates tenant status to active
- Records SubscriptionEvent

### 6. `/src/app/api/v1/subscription/invoices/route.ts` (GET)
- Paginated with page/per_page query params
- Status filter support (draft/open/paid/void/uncollectible)
- Parses JSON lineItems and usageSummary fields
- Returns tenant-scoped invoices

### 7. `/src/app/api/v1/subscription/process/route.ts` (POST)
- No auth required (cron/scheduler endpoint)
- Body: `{ action: 'check_renewals' | 'check_expiry' | 'check_grace_periods' | 'all' }`
- **check_renewals**: Auto-renews subscriptions where nextPaymentAt <= now, creates payment + invoice
- **check_expiry**: Moves active subscriptions past period end to past_due with 7-day grace period; expires past_due past grace period
- **check_grace_periods**: Expires subscriptions where gracePeriodEnd <= now
- **data_retention_cleanup**: Marks data for cleanup where dataRetentionEnd <= now (30-day retention)
- Returns summary with counts and detail messages

## BDT Pricing Used
- Starter: ৳2,400/month, ৳28,800/year
- Professional: ৳6,900/month, ৳82,800/year
- Enterprise: ৳17,400/month, ৳208,800/year

## Key Patterns
- All routes (except process) use `requireAuth()` for authentication
- AuthError is caught and converted to `unauthorizedError()` response
- All state changes record `SubscriptionEvent` entries
- Demo mode: payments auto-succeed
- Tenant status is kept in sync with subscription status
- Data retention: 30-day window after expiry before cleanup
