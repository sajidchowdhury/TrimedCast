# Multi-Tenancy & SaaS Architecture

> **TrimedCast** — Integrated Seasonal Demand & Inventory Forecasting System  
> For motorcycle parts businesses in Bangladesh · Multi-Tenant SaaS Platform  
> Document version: 1.0 · Last updated: 2025-07-09

---

## Table of Contents

1. [Tenancy Model Decision](#1-tenancy-model-decision)
2. [Tenant Lifecycle](#2-tenant-lifecycle)
3. [Data Isolation Strategy](#3-data-isolation-strategy)
4. [Subscription Tiers](#4-subscription-tiers)
5. [Billing Integration](#5-billing-integration)
6. [Feature Gating](#6-feature-gating)
7. [Tenant-Specific Configuration](#7-tenant-specific-configuration)
8. [Scaling Architecture](#8-scaling-architecture)
9. [Multi-Tenant SaaS Admin Dashboard](#9-multi-tenant-saas-admin-dashboard)
10. [Security Considerations](#10-security-considerations)

---

## 1. Tenancy Model Decision

### 1.1 Model Comparison

| Criteria | Schema-per-Tenant | Shared DB + `tenant_id` | Hybrid |
|---|---|---|---|
| **Data Isolation** | ★★★★★ Physical separation | ★★★☆☆ Logical separation via column | ★★★★☆ Schemas for paid, shared for free |
| **Cost at Current Scale** | ★★☆☆☆ Higher (N × schema overhead) | ★★★★★ Lowest | ★★★☆☆ Medium |
| **Operational Complexity** | ★★☆☆☆ Migrations × N schemas | ★★★★★ Single migration path | ★★★☆☆ Dual migration paths |
| **Query Performance** | ★★★★☆ No tenant filter needed | ★★★☆☆ Index on tenant_id required | ★★★★☆ Mixed |
| **Scaling Ceiling** | ★★★★★ Thousands of schemas | ★★★★☆ Millions of rows (with partitioning) | ★★★★★ Best of both |
| **Migration Simplicity** | ★★☆☆☆ Per-schema DDL | ★★★★★ Single DDL | ★★☆☆☆ Two DDL tracks |
| **Backup/Restore** | ★★☆☆☆ Per-schema | ★★★★★ Single DB backup | ★★★☆☆ Both strategies |
| **Tenant Provisioning Speed** | ★★★☆☆ Schema creation = seconds | ★★★★★ Row insert = milliseconds | ★★★☆☆ Variable |
| **Regulatory Compliance** | ★★★★★ Strong isolation story | ★★★☆☆ Requires RLS overlay | ★★★★☆ Tiered compliance |

### 1.2 Decision: Shared Database with `tenant_id` Column

**Rationale:**

1. **Simpler Migration** — One schema to evolve. A single `php artisan migrate` updates all tenants simultaneously. Schema-per-tenant would require running migrations across hundreds of schemas with partial-failure rollback complexity.

2. **Lower Cost at Current Scale** — TrimedCast targets SMB motorcycle parts shops in Bangladesh (hundreds of tenants, not tens of thousands). A single PostgreSQL database with proper indexing keeps infrastructure costs under $50/mo vs. $200+ for schema-per-tenant at the same tenant count.

3. **Faster Provisioning** — New tenant = one row in `tenants` table + one row in `forecast_settings`. Schema-per-tenant requires `CREATE SCHEMA` + DDL replication, adding 2-5 seconds of cold-start latency.

4. **Upgrade Path** — When we reach enterprise scale (1000+ tenants or regulatory requirements for physical isolation), we migrate high-value tenants to dedicated schemas using PostgreSQL's `pg_dump`/`pg_restore` per-schema, while keeping SMB tenants on the shared model. The hybrid model becomes the evolution, not a revolution.

5. **Defense-in-Depth** — Logical isolation via `tenant_id` global scopes is augmented by PostgreSQL Row-Level Security (RLS) policies, making the shared model nearly as secure as schema-per-tenant at the database level.

### 1.3 Laravel Implementation

**Package:** `spatie/laravel-tenancy` (v2.x) — chosen over `stancl/tenancy` for simpler shared-database model alignment.

```
composer require spatie/laravel-tenancy
```

**Core Concepts:**

```
┌─────────────────────────────────────────────────────────┐
│                  Laravel Application                      │
│                                                           │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ SetTenantId  │───▶│  TenantScope │───▶│  Eloquent   │  │
│  │ Middleware   │    │  (Global)    │    │  Models     │  │
│  └─────────────┘    └──────────────┘    └─────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ JWT Token   │    │ WHERE        │    │ BelongsTo   │  │
│  │ tenant_id   │    │ tenant_id=X  │    │ Tenant      │  │
│  └─────────────┘    └──────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tenant Lifecycle

### 2.1 State Machine

```
                    ┌──────────┐
                    │          │
         register   │  PENDING │
        ──────────▶ │          │
                    └────┬─────┘
                         │ provision()
                         ▼
                    ┌──────────┐      trial_expired()
                    │  TRIAL   │─────────────────────┐
                    │ (14 days)│                      │
                    └────┬─────┘                      │
                         │ subscribe()                │
                         ▼                            ▼
                    ┌──────────┐               ┌──────────┐
                    │  ACTIVE  │◀─reactivate()│SUSPENDED │
                    │          │──────────────▶│(read-only)│
                    └────┬─────┘  past_due()  └────┬─────┘
                         │     +7d grace            │
                         │ cancel()                 │ delete_request()
                         ▼                          ▼
                    ┌──────────┐               ┌──────────┐
                    │CANCELLED │               │ DELETING │
                    │(end of    │               │(30-day   │
                    │ billing   │               │ retain)  │
                    │ period)   │               └────┬─────┘
                    └──────────┘                     │ purge()
                                                     ▼
                                               ┌──────────┐
                                               │ DELETED  │
                                               │(hard)    │
                                               └──────────┘
```

### 2.2 Registration Flow

```php
// app/Http/Controllers/Auth/RegisterController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    public function __construct(
        private TenantProvisioningService $provisioningService
    ) {}

    public function register(Request $request)
    {
        $validated = $request->validate([
            'company_name'    => ['required', 'string', 'max:255'],
            'subdomain'       => ['required', 'string', 'alpha_dash', 'min:3', 'max:63',
                                  'unique:tenants,subdomain'],
            'admin_name'      => ['required', 'string', 'max:255'],
            'admin_email'     => ['required', 'email', 'unique:users,email'],
            'admin_password'  => ['required', 'confirmed', Password::defaults()],
            'tier'            => ['required', 'in:starter,pro,enterprise'],
            'phone'           => ['nullable', 'string', 'max:20'],
        ]);

        $tenant = DB::transaction(function () use ($validated) {
            // 1. Create tenant record
            $tenant = Tenant::create([
                'name'           => $validated['company_name'],
                'subdomain'      => $validated['subdomain'],
                'tier'           => $validated['tier'],
                'status'         => 'trial',
                'trial_ends_at'  => now()->addDays(14),
            ]);

            // 2. Create admin user (scoped to tenant)
            $user = User::create([
                'tenant_id'  => $tenant->id,
                'name'       => $validated['admin_name'],
                'email'      => $validated['admin_email'],
                'password'   => Hash::make($validated['admin_password']),
                'phone'      => $validated['phone'] ?? null,
                'role'       => 'tenant_admin',
            ]);

            // 3. Auto-provision tenant resources
            $this->provisioningService->provision($tenant);

            return $tenant;
        });

        // 4. Create Stripe customer (async to avoid blocking)
        DispatchCreateStripeCustomer::dispatch($tenant);

        // 5. Send welcome email with onboarding link
        SendWelcomeEmail::dispatch($tenant, $tenant->users()->first());

        return response()->json([
            'message' => 'Registration successful. Check your email for onboarding instructions.',
            'tenant'  => $tenant->only(['id', 'name', 'subdomain', 'tier', 'trial_ends_at']),
        ], 201);
    }
}
```

### 2.3 Tenant Provisioning Service

```php
// app/Services/TenantProvisioningService.php

namespace App\Services;

use App\Models\Tenant;
use App\Models\ForecastSetting;
use Illuminate\Support\Facades\DB;

class TenantProvisioningService
{
    /**
     * Provision all default resources for a new tenant.
     * This runs inside the registration DB transaction.
     */
    public function provision(Tenant $tenant): void
    {
        // 1. Create forecast_settings with Bangladesh defaults
        ForecastSetting::create([
            'tenant_id'               => $tenant->id,
            'default_holding_cost_pct'=> 0.25,        // 25% annual (common for BD auto parts)
            'default_ordering_cost'   => 500.00,       // BDT 500 per order
            'default_lead_time_days' => 14,            // 2 weeks typical for BD imports
            'currency'               => 'BDT',
            'winter_months'          => [11, 12, 1, 2], // Nov-Feb (Bangladesh winter)
            'monsoon_months'         => [6, 7, 8, 9],   // Jun-Sep (Bangladesh monsoon)
            'cny_enabled'           => true,            // Chinese New Year affects supply
            'cny_start_month'       => 1,               // January (approx)
            'cny_duration_days'     => 21,              // ~3 weeks factory shutdown
            'forecast_horizon_days'  => 90,             // 3-month forecast horizon
            'confidence_level'      => 0.95,            // 95% confidence interval
            'reorder_point_method'  => 'safety_stock',  // Default reorder method
            'auto_forecast_enabled'  => false,          // Off until onboarding complete
        ]);

        // 2. Create default warehouse
        $tenant->warehouses()->create([
            'name'     => 'Main Warehouse',
            'code'     => 'WH-001',
            'is_active'=> true,
        ]);

        // 3. Create default inventory transaction categories
        $defaultCategories = [
            ['name' => 'Purchase Receipt', 'type' => 'in'],
            ['name' => 'Customer Sale',    'type' => 'out'],
            ['name' => 'Return to Supplier', 'type' => 'out'],
            ['name' => 'Customer Return',  'type' => 'in'],
            ['name' => 'Adjustment (+)',   'type' => 'in'],
            ['name' => 'Adjustment (-)',   'type' => 'out'],
            ['name' => 'Transfer In',      'type' => 'in'],
            ['name' => 'Transfer Out',     'type' => 'out'],
        ];

        foreach ($defaultCategories as $cat) {
            $tenant->transactionCategories()->create($cat);
        }

        // 4. Create onboarding progress tracker
        $tenant->onboardingProgress()->create([
            'steps' => [
                'upload_products'    => ['completed' => false, 'required' => true],
                'upload_sales_data'  => ['completed' => false, 'required' => true],
                'configure_warehouse'=> ['completed' => false, 'required' => true],
                'run_first_forecast'=> ['completed' => false, 'required' => false],
                'review_settings'   => ['completed' => false, 'required' => false],
            ],
            'current_step' => 'upload_products',
        ]);

        // 5. Initialize usage counters for the billing period
        $tenant->usageCounters()->create([
            'forecast_runs' => 0,
            'ai_queries'    => 0,
            'sku_count'     => 0,
            'period_start'  => now()->startOfMonth(),
            'period_end'    => now()->endOfMonth(),
        ]);
    }
}
```

### 2.4 Tenant Suspension Logic

```php
// app/Services/TenantSuspensionService.php

namespace App\Services;

use App\Models\Tenant;
use App\Enums\TenantStatus;
use Carbon\Carbon;

class TenantSuspensionService
{
    /**
     * Check and transition tenant status based on subscription state.
     * Called daily via scheduler or on Stripe webhook.
     */
    public function evaluateTenantStatus(Tenant $tenant): Tenant
    {
        return match (true) {
            // Active subscription → ensure active
            $tenant->subscription?->stripe_status === 'active'
                => $this->activate($tenant),

            // Past due + within grace period → warn but allow
            $tenant->subscription?->stripe_status === 'past_due'
                && $this->withinGracePeriod($tenant)
                => $this->markPastDue($tenant),

            // Past due + grace period expired → suspend (read-only)
            $tenant->subscription?->stripe_status === 'past_due'
                && ! $this->withinGracePeriod($tenant)
                => $this->suspend($tenant),

            // Trial expired without subscribing → suspend
            $tenant->status === TenantStatus::Trial
                && $tenant->trial_ends_at?->isPast()
                => $this->suspend($tenant),

            // Cancelled subscription at period end → mark cancelled
            $tenant->subscription?->stripe_status === 'canceled'
                => $this->cancel($tenant),

            default => $tenant,
        };
    }

    private function withinGracePeriod(Tenant $tenant): bool
    {
        $pastDueSince = $tenant->subscription->past_due_since
            ?? $tenant->subscription->updated_at;

        return $pastDueSince->addDays(7)->isFuture();
    }

    private function suspend(Tenant $tenant): Tenant
    {
        $tenant->update([
            'status'          => TenantStatus::Suspended,
            'suspended_at'    => now(),
            'suspension_reason' => 'subscription_past_due',
        ]);

        // Notify tenant admin
        NotifyTenantSuspended::dispatch($tenant);

        return $tenant;
    }

    // ... activate(), markPastDue(), cancel() implementations
}
```

### 2.5 Tenant Deletion (Soft Delete + 30-Day Retention)

```php
// app/Services/TenantDeletionService.php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TenantDeletionService
{
    /**
     * Initiate tenant deletion: soft-delete + schedule purge.
     */
    public function requestDeletion(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            // 1. Export all tenant data first (GDPR portability)
            $exportPath = $this->exportTenantData($tenant);

            // 2. Soft-delete the tenant
            $tenant->update([
                'status'            => 'deleting',
                'deletion_requested_at' => now(),
                'deletion_scheduled_at' => now()->addDays(30),
                'data_export_path'  => $exportPath,
            ]);

            // 3. Send confirmation email with download link
            SendDeletionConfirmation::dispatch($tenant, $exportPath);

            // 4. Schedule the actual purge job for 30 days from now
            PurgeTenantData::dispatch($tenant)->delay(now()->addDays(30));
        });
    }

    /**
     * Export all tenant data to a ZIP file for portability.
     */
    private function exportTenantData(Tenant $tenant): string
    {
        $export = new TenantDataExport($tenant);
        $fileName = "tenant-exports/{$tenant->id}/" . now()->format('Y-m-d') . '-full-export.zip';

        return $export->storeAs($fileName, 'local');
    }

    /**
     * Hard purge all tenant data after retention period.
     * Called by PurgeTenantData queued job.
     */
    public function purge(Tenant $tenant): void
    {
        // Safety: don't purge if deletion wasn't requested
        if (! $tenant->deletion_requested_at) {
            return;
        }

        // Safety: don't purge before scheduled date
        if ($tenant->deletion_scheduled_at->isFuture()) {
            return;
        }

        DB::transaction(function () use ($tenant) {
            $tenantId = $tenant->id;

            // Delete all tenant-scoped records (order matters for FK constraints)
            $tables = [
                'inventory_transactions', 'forecast_results', 'demand_forecasts',
                'reorder_alerts', 'sku_seasonality_overrides', 'products',
                'warehouses', 'forecast_settings', 'usage_events',
                'users', 'onboarding_progress', 'transaction_categories',
            ];

            foreach ($tables as $table) {
                DB::table($table)->where('tenant_id', $tenantId)->delete();
            }

            // Purge tenant files from storage
            Storage::disk('s3')->deleteDirectory("tenants/{$tenantId}");

            // Finally, hard-delete the tenant record
            $tenant->forceDelete();
        });

        Log::info("Tenant {$tenantId} data purged successfully.");
    }
}
```

---

## 3. Data Isolation Strategy

### 3.1 Isolation Layers (Defense-in-Depth)

```
┌─────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                              │
│                                                                   │
│  Client Request                                                   │
│       │                                                           │
│       ▼                                                           │
│  ┌──────────────┐                                                │
│  │ ① JWT Auth   │  Extract tenant_id from token (signed,         │
│  │   Middleware │  cannot be tampered)                            │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ ② SetTenantId│  Inject tenant_id into request context         │
│  │   Middleware │  Reject if token tenant ≠ subdomain tenant      │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ ③ TenantScope│  Global Eloquent scope: WHERE tenant_id = X    │
│  │  (App Level) │  Applied automatically to all tenant models     │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ ④ PostgreSQL  │  Row-Level Security (RLS) — even if app       │
│  │    RLS       │  scope is bypassed, DB enforces isolation       │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ ⑤ Cache/Queue│  Redis keys prefixed: tenant:123:cache_key     │
│  │   Isolation  │  Queue jobs tagged: tenant_id=123              │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ ⑥ File Store │  S3 namespace: s3://bucket/tenants/123/...    │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 BelongsToTenant Trait

```php
// app/Traits/BelongsToTenant.php

namespace App\Traits;

use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Apply this trait to every Eloquent model that belongs to a tenant.
 * This ensures the TenantScope global scope is always applied,
 * and provides convenience methods for tenant relationship.
 *
 * @property int $tenant_id
 * @mixin Model
 */
trait BelongsToTenant
{
    /**
     * Boot the trait. Called automatically by Eloquent.
     */
    protected static function bootBelongsToTenant(): void
    {
        // Apply the global scope so every query includes WHERE tenant_id = X
        static::addGlobalScope(new TenantScope());

        // Automatically set tenant_id when creating a new model
        static::creating(function (Model $model) {
            if (empty($model->tenant_id)) {
                $model->tenant_id = tenant()->id();
            }
        });
    }

    /**
    G     * Belongs-to relationship to Tenant model.
     */
    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Check if this model belongs to the current tenant.
     */
    public function isCurrentTenant(): bool
    {
        return $this->tenant_id === tenant()->id();
    }

    /**
     * Query without tenant scope — use with extreme caution.
     * Only for super-admin operations.
     */
    public static function withoutTenantScope(): Builder
    {
        return static::withoutGlobalScope(TenantScope::class);
    }

    /**
     * Query for a specific tenant (super-admin use).
     */
    public static function forTenant(int $tenantId): Builder
    {
        return static::withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $tenantId);
    }
}
```

### 3.3 TenantScope Global Scope

```php
// app/Scopes/TenantScope.php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Log;

/**
 * Global scope that automatically filters all queries by the current tenant.
 *
 * This is the PRIMARY defense layer for data isolation at the application level.
 * Every model using BelongsToTenant trait gets this scope applied automatically.
 *
 * The scope resolves the current tenant_id from the tenant() helper,
 * which is set by the SetTenantId middleware during the request lifecycle.
 */
class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = $this->resolveTenantId();

        if ($tenantId !== null) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        } else {
            // No tenant in context — this is a code path we want to be aware of.
            // In production, this typically means a super-admin or artisan command.
            // Log a warning so we can audit unscoped queries.
            if (app()->environment('production')) {
                Log::warning('TenantScope applied without tenant context', [
                    'model'  => get_class($model),
                    'action' => 'unscoped_query',
                ]);
            }
        }
    }

    /**
     * Extend the query builder with tenant-scoped methods.
     */
    public function extend(Builder $builder): void
    {
        // Add a method to explicitly query across all tenants (super-admin)
        $builder->macro('allTenants', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });
    }

    /**
     * Resolve the current tenant ID from the application context.
     */
    private function resolveTenantId(): ?int
    {
        // Priority: request context → session → artisan option
        if ($id = app('current_tenant_id')) {
            return (int) $id;
        }

        return null;
    }
}
```

### 3.4 SetTenantId Middleware

```php
// app/Http/Middleware/SetTenantId.php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * This middleware runs AFTER authentication. It:
 * 1. Extracts tenant_id from the authenticated user's JWT/token
 * 2. Validates it matches the requested subdomain
 * 3. Sets the tenant context for the entire request lifecycle
 * 4. Rejects cross-tenant access attempts (security event)
 */
class SetTenantId
{
    public function handle(Request $request, Closure $next): Response
    {
        // Must be authenticated first
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $tokenTenantId = $user->tenant_id;

        // Resolve expected tenant from subdomain
        $subdomain = $request->route('tenant_subdomain')
            ?? $request->header('X-Tenant-Subdomain')
            ?? $this->extractSubdomain($request);

        if (! $subdomain) {
            // API requests without subdomain: use token's tenant_id directly
            $tenant = Tenant::where('id', $tokenTenantId)->first();
        } else {
            $tenant = Tenant::where('subdomain', $subdomain)->first();
        }

        // ① Tenant must exist and be accessible
        if (! $tenant || ! $tenant->isAccessible()) {
            abort(404, 'Tenant not found or not accessible.');
        }

        // ② CRITICAL: Token tenant_id must match the resolved tenant
        //    This prevents a user from tenant A accessing tenant B's data
        //    by manipulating the subdomain or header.
        if ((int) $tokenTenantId !== (int) $tenant->id) {
            // Security event: log for audit
            $this->logCrossTenantAttempt($user, $tokenTenantId, $tenant->id, $request);

            abort(403, 'Cross-tenant access denied.');
        }

        // ③ Check tenant status
        if ($tenant->status === 'suspended') {
            // Allow read-only access (GET requests only)
            if (! $request->isMethod('GET')) {
                abort(403, 'Account suspended. Read-only access only.');
            }
        }

        if ($tenant->status === 'deleting') {
            abort(403, 'Account is scheduled for deletion.');
        }

        // ④ Set tenant context globally for this request
        App::instance('current_tenant_id', $tenant->id);
        App::instance('current_tenant', $tenant);

        // ⑤ Set tenant context for the spatie/laravel-tenancy helper
        tenant()->setId($tenant->id);

        // ⑥ Prefix all cache/queue operations for this request
        $this->configureTenantPrefixes($tenant);

        return $next($request);
    }

    /**
     * Extract subdomain from the HTTP host header.
     * e.g., "acmemotors.trimedcast.com" → "acmemotors"
     */
    private function extractSubdomain(Request $request): ?string
    {
        $host = $request->getHost();
        $baseDomain = config('tenancy.base_domain', 'trimedcast.com');

        if (str_ends_with($host, ".{$baseDomain}")) {
            return str_before($host, ".{$baseDomain}");
        }

        return null; // Custom domain or apex domain
    }

    /**
     * Log cross-tenant access attempts as security events.
     */
    private function logCrossTenantAttempt(
        $user,
        int $tokenTenantId,
        int $requestedTenantId,
        Request $request
    ): void {
        \App\Models\SecurityEvent::create([
            'type'           => 'cross_tenant_access_attempt',
            'user_id'        => $user->id,
            'token_tenant_id'=> $tokenTenantId,
            'target_tenant_id'=> $requestedTenantId,
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'url'            => $request->fullUrl(),
            'occurred_at'    => now(),
        ]);

        \Illuminate\Support\Facades\Log::security('Cross-tenant access attempt', [
            'user_id'      => $user->id,
            'from_tenant'  => $tokenTenantId,
            'to_tenant'    => $requestedTenantId,
            'ip'           => $request->ip(),
        ]);
    }

    /**
     * Configure tenant-specific prefixes for cache and queue.
     */
    private function configureTenantPrefixes(Tenant $tenant): void
    {
        // Redis cache prefix
        config()->set('cache.prefix', "tenant:{$tenant->id}:" . config('cache.prefix'));

        // Queue job tags
        app('queue')->addJobTag("tenant_id={$tenant->id}");
    }
}
```

**Middleware Registration:**

```php
// app/Http/Kernel.php

protected $middlewareGroups = [
    'api' => [
        // ...
        \App\Http\Middleware\SetTenantId::class,  // After auth
    ],
    'web' => [
        // ...
        \App\Http\Middleware\SetTenantId::class,  // After auth
    ],
];

// Order matters: Authenticate → SetTenantId → CheckSubscriptionTier
```

### 3.5 PostgreSQL Row-Level Security (RLS) Policies

```sql
-- ============================================================
-- PostgreSQL Row-Level Security (RLS) for TrimedCast
-- Defense-in-depth: even if the application scope is bypassed
-- (e.g., raw DB query, artisan tinker), the DB enforces isolation.
-- ============================================================

-- Step 1: Create a session variable mechanism for the current tenant
-- The app sets this via: DB::statement("SET app.current_tenant_id = ?", [$tenantId])
-- This happens in the SetTenantId middleware after authentication.

-- Step 2: Enable RLS on all tenant-scoped tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_seasonality_overrides ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies
-- Each table gets two policies:
--   a) SELECT/UPDATE/DELETE: only rows where tenant_id matches session var
--   b) INSERT: only allow inserting with tenant_id matching session var

-- --- Products ---
CREATE POLICY tenant_select_products ON products
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_products ON products
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_products ON products
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_products ON products
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Warehouses ---
CREATE POLICY tenant_select_warehouses ON warehouses
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_warehouses ON warehouses
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_warehouses ON warehouses
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_warehouses ON warehouses
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Inventory Transactions ---
CREATE POLICY tenant_select_inventory_transactions ON inventory_transactions
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_inventory_transactions ON inventory_transactions
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_inventory_transactions ON inventory_transactions
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_inventory_transactions ON inventory_transactions
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Demand Forecasts ---
CREATE POLICY tenant_select_demand_forecasts ON demand_forecasts
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_demand_forecasts ON demand_forecasts
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_demand_forecasts ON demand_forecasts
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_demand_forecasts ON demand_forecasts
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Forecast Results ---
CREATE POLICY tenant_select_forecast_results ON forecast_results
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_forecast_results ON forecast_results
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_forecast_results ON forecast_results
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_forecast_results ON forecast_results
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Users ---
CREATE POLICY tenant_select_users ON users
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_users ON users
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_users ON users
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_delete_users ON users
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- --- Forecast Settings ---
CREATE POLICY tenant_select_forecast_settings ON forecast_settings
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_insert_forecast_settings ON forecast_settings
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

CREATE POLICY tenant_update_forecast_settings ON forecast_settings
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::integer)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Step 4: Grant table access to the application DB role (not superuser)
-- The app connects as 'trimedcast_app' role, which is subject to RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
    TO trimedcast_app;

-- Step 5: Super-admin bypass role (for migrations, admin dashboards)
-- This role can bypass RLS — use with extreme caution
-- CREATE ROLE trimedcast_superadmin BYPASSRLS;
```

**Setting the tenant context at the DB level (from Laravel):**

```php
// Added to SetTenantId middleware, after tenant resolution:
public function handle(Request $request, Closure $next): Response
{
    // ... tenant resolution logic ...

    // Set PostgreSQL session variable for RLS
    DB::statement(
        "SET app.current_tenant_id = ?",
        [$tenant->id]
    );

    return $next($request);
}
```

### 3.6 Cache & Queue Isolation

```php
// app/Services/TenantCacheService.php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * All cache keys are automatically prefixed with the tenant ID
 * to prevent cross-tenant cache leakage.
 */
class TenantCacheService
{
    private function prefix(string $key): string
    {
        return "tenant:" . tenant()->id() . ":{$key}";
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::get($this->prefix($key), $default);
    }

    public function put(string $key, mixed $value, ?int $ttl = null): bool
    {
        return Cache::put($this->prefix($key), $value, $ttl);
    }

    public function forget(string $key): bool
    {
        return Cache::forget($this->prefix($key));
    }

    /**
     * Flush all cache entries for the current tenant.
     */
    public function flushTenant(): bool
    {
        $prefix = "tenant:" . tenant()->id() . ":";
        // Use Redis SCAN to find and delete all keys with this prefix
        $redis = Cache::getRedis();
        $cursor = null;

        do {
            [$cursor, $keys] = $redis->scan(
                $cursor,
                ['match' => "{$prefix}*", 'count' => 100]
            );
            if (!empty($keys)) {
                $redis->del(...$keys);
            }
        } while ($cursor !== 0);

        return true;
    }
}
```

**Queue Job Tagging:**

```php
// All queued jobs include tenant_id as a tag for monitoring and debugging

// app/Jobs/RunForecastJob.php
class RunForecastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tenantId;
    public int $productId;

    public function __construct(int $tenantId, int $productId)
    {
        $this->tenantId = $tenantId;
        $this->productId = $productId;

        // Tag the job for monitoring
        $this->onQueue('forecasts');
    }

    public function tags(): array
    {
        return [
            "tenant:{$this->tenantId}",
            "product:{$this->productId}",
        ];
    }

    public function handle(): void
    {
        // Set tenant context for this job execution
        app()->instance('current_tenant_id', $this->tenantId);
        DB::statement("SET app.current_tenant_id = ?", [$this->tenantId]);

        // ... forecast logic ...
    }
}
```

### 3.7 File Storage Isolation

```php
// app/Services/TenantStorageService.php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class TenantStorageService
{
    private string $disk = 's3';

    /**
     * Get the tenant-prefixed path for a file.
     * All files stored under: tenants/{tenant_id}/...
     */
    private function tenantPath(string $path): string
    {
        return "tenants/" . tenant()->id() . "/{$path}";
    }

    /**
     * Store an uploaded file in tenant namespace.
     */
    public function store(UploadedFile $file, string $directory): string
    {
        $path = $file->store(
            $this->tenantPath($directory),
            $this->disk
        );

        return $path;
    }

    /**
     * Get a pre-signed URL for a tenant file (time-limited access).
     */
    public function temporaryUrl(string $path, int $minutes = 5): string
    {
        return Storage::disk($this->disk)->temporaryUrl(
            $this->tenantPath($path),
            now()->addMinutes($minutes)
        );
    }

    /**
     * Delete all files for a tenant (used during purge).
     */
    public function deleteAllTenantFiles(): bool
    {
        return Storage::disk($this->disk)->deleteDirectory(
            "tenants/" . tenant()->id()
        );
    }
}
```

---

## 4. Subscription Tiers

### 4.1 Tier Definitions

| Tier | Price/mo | Max SKUs | Max Users | Key Features |
|---|---|---|---|---|
| **Starter** | $29 | 200 | 3 | Basic forecasting (regression only), 1 warehouse, Email support |
| **Pro** | $79 | 1,000 | 10 | Prophet + regression, multi-warehouse, Ask AI (50 queries/mo), Excel import, Priority support |
| **Enterprise** | $199 | Unlimited | Unlimited | All models + Prophet, unlimited AI, custom seasonal models, API access, SSO, Dedicated support |

### 4.2 Feature Matrix

| Feature | Starter | Pro | Enterprise |
|---|:---:|:---:|:---:|
| Regression forecasting | ✅ | ✅ | ✅ |
| Prophet forecasting | ❌ | ✅ | ✅ |
| Ensemble forecasting | ❌ | ❌ | ✅ |
| Single warehouse | ✅ | ✅ | ✅ |
| Multi-warehouse | ❌ | ✅ | ✅ |
| Ask AI queries | ❌ | 50/mo | Unlimited |
| Excel import/export | ❌ | ✅ | ✅ |
| CSV import/export | ✅ | ✅ | ✅ |
| Custom seasonal models | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| SSO (SAML/OIDC) | ❌ | ❌ | ✅ |
| Per-tenant backup | ❌ | ❌ | ✅ |
| Custom domain | ❌ | ❌ | ✅ |
| Email support | ✅ | — | — |
| Priority support | — | ✅ | — |
| Dedicated support | — | — | ✅ |
| Dashboard sharing | ❌ | ✅ | ✅ |
| Webhook notifications | ❌ | ❌ | ✅ |

### 4.3 Tier Model

```php
// app/Models/Tier.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tier extends Model
{
    protected $fillable = [
        'name', 'slug', 'price_cents', 'stripe_price_id',
        'max_skus', 'max_users', 'features',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'max_skus'    => 'integer',
        'max_users'   => 'integer',
        'features'    => 'array',
    ];

    public function isUnlimitedSkus(): bool
    {
        return $this->max_skus === -1; // -1 = unlimited
    }

    public function isUnlimitedUsers(): bool
    {
        return $this->max_users === -1;
    }

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? []);
    }

    public static function bySlug(string $slug): ?self
    {
        return static::where('slug', $slug)->first();
    }
}
```

### 4.4 Tier Seeder

```php
// database/seeders/TierSeeder.php

namespace Database\Seeders;

use App\Models\Tier;
use Illuminate\Database\Seeder;

class TierSeeder extends Seeder
{
    public function run(): void
    {
        $tiers = [
            [
                'name'          => 'Starter',
                'slug'          => 'starter',
                'price_cents'   => 2900,
                'stripe_price_id'=> 'price_starter_monthly',
                'max_skus'      => 200,
                'max_users'     => 3,
                'features'      => [
                    'regression_forecasting',
                    'single_warehouse',
                    'csv_import',
                    'email_support',
                    'dashboard',
                ],
            ],
            [
                'name'          => 'Pro',
                'slug'          => 'pro',
                'price_cents'   => 7900,
                'stripe_price_id'=> 'price_pro_monthly',
                'max_skus'      => 1000,
                'max_users'     => 10,
                'features'      => [
                    'regression_forecasting',
                    'prophet_forecasting',
                    'multi_warehouse',
                    'csv_import',
                    'excel_import',
                    'ask_ai',
                    'dashboard',
                    'dashboard_sharing',
                    'priority_support',
                ],
            ],
            [
                'name'          => 'Enterprise',
                'slug'          => 'enterprise',
                'price_cents'   => 19900,
                'stripe_price_id'=> 'price_enterprise_monthly',
                'max_skus'      => -1,  // unlimited
                'max_users'     => -1,  // unlimited
                'features'      => [
                    'regression_forecasting',
                    'prophet_forecasting',
                    'ensemble_forecasting',
                    'multi_warehouse',
                    'csv_import',
                    'excel_import',
                    'ask_ai',
                    'custom_seasonal_models',
                    'api_access',
                    'sso',
                    'per_tenant_backup',
                    'custom_domain',
                    'dashboard',
                    'dashboard_sharing',
                    'webhook_notifications',
                    'dedicated_support',
                ],
            ],
        ];

        foreach ($tiers as $tier) {
            Tier::updateOrCreate(
                ['slug' => $tier['slug']],
                $tier
            );
        }
    }
}
```

---

## 5. Billing Integration

### 5.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    BILLING ARCHITECTURE                       │
│                                                                │
│  ┌───────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  TrimedCast│────▶│ Laravel      │────▶│   Stripe     │    │
│  │  Frontend  │     │  Cashier     │     │   API        │    │
│  └───────────┘     └──────┬───────┘     └──────┬───────┘    │
│                            │                      │           │
│                            │  ◀── Webhooks ──────│           │
│                            │                      │           │
│                     ┌──────▼───────┐              │           │
│                     │ Subscription │              │           │
│                     │ Model        │              │           │
│                     └──────┬───────┘              │           │
│                            │                      │           │
│                     ┌──────▼───────┐     ┌──────────────┐    │
│                     │ Usage Events │     │ Invoice Gen  │    │
│                     │ Table        │────▶│ (Monthly)    │    │
│                     └──────────────┘     └──────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Subscription Lifecycle

```
register ──▶ TRIAL (14 days)
                 │
                 ├── subscribe() ──▶ ACTIVE
                 │                      │
                 │                      ├── payment fails ──▶ PAST_DUE
                 │                      │                      │
                 │                      │                      ├── within 7 days ──▶ ACTIVE (payment recovered)
                 │                      │                      │
                 │                      │                      └── after 7 days ──▶ SUSPENDED
                 │                      │
                 │                      ├── cancel() ──▶ CANCELLED (active until period4 period end)
                 │                      │
                 │                      └── resume() ◀── CANCELLED (before period0 period end)
                 │
                 └── trial expires ──3─▶ EXPIRED (suspended)
```

### 5.3 Laravel Cashier Setup

```php
// app/Models/Tenant.php (relevant billing methods)

namespace App\Models;

use Laravel\Cashier\Billable;

class Tenant extends Model
{
    use Billable;

    // Cashier uses this model as the "2 Stripe customer
    // By default, Cashier uses the User model — we override to use Tenant

    protected $fillable = [
        'name', 'subdomain', 'tier', 'status',
        'trial_ends_at', 'stripe_id', 'pm_type', 'pm_last_four',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
    ];

    /**
     * Get the Stripe price ID for the tenant's current tier.
     */
    public function getStripePriceId(): ?string
    {
        return Tier::bySlug($this->tier)?->stripe_price_id;
    }

    /**
     * Create or get the Stripe subscription for this tenant.
     */
    public function createOrUpdateSubscription(): void
    {
        $priceId = $this->getStripePriceId();

        if ($this->subscribed()) {
            // Swap tier (proration handled by Stripe)
            $this->subscription()->swap($priceId);
        } else {
            // New subscription with 14-day trial
            $this->newSubscription('default', $priceId)
                ->trialUntil($this->trial_ends_at ?? now()->addDays(14))
                ->create();
        }
    }

    /**
     * Check if the tenant is on trial.
     */
    public function onTrial(): bool
    {
        return $this->trial_ends_at?->isFuture() ?? false;
    }

    /**
     * Check if the tenant is on grace period (past_due within 7 days).
     */
    public function onGracePeriod(): bool
    {
        if (! $this->hasIncompletePayment()) {
            return false;
        }

        $pastDueSince = $this->subscription()?->updated_at;

        return $pastDueSince?->addDays(7)->isFuture() ?? false;
    }
}
```

### 5.4 Usage Metering

```sql
-- Usage events table: tracks billable actions per tenant per billing period
CREATE TABLE usage_events (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
    event_type      VARCHAR(50) NOT NULL,   -- 'forecast_run', 'ai_query', 'sku_created'
    event_metadata  JSONB DEFAULT '{}',     -- context: product_id, model_type, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast aggregation queries
CREATE INDEX idx_usage_events_tenant_type_date
    ON usage_events (tenant_id, event_type, created_at);

-- Partition by month for efficient querying and archival
-- (PostgreSQL 12+ declarative partitioning)
CREATE TABLE usage_events_partitioned (
    id              BIGSERIAL,
    tenant_id       INTEGER NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    event_metadata  JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions automatically via pg_partman or a scheduler
```

```php
// app/Services/UsageMeteringService.php

namespace App\Services;

use App\Models\UsageEvent;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class UsageMeteringService
{
    /**
     * Record a billable event for the current tenant.
     */
    public function record(string $eventType, array $metadata = []): UsageEvent
    {
        return UsageEvent::create([
            'tenant_id'      => tenant()->id(),
            'event_type'     => $eventType,
            'event_metadata' => $metadata,
        ]);
    }

    /**
     * Get usage counts for the current billing period.
     */
    public function getCurrentPeriodUsage(): array
    {
        $tenant = tenant();
        $periodStart = $tenant->subscription()?->cycle_starts_at ?? now()->startOfMonth();
        $periodEnd = $tenant->subscription()?->cycle_ends_at ?? now()->endOfMonth();

        $usage = UsageEvent::where('tenant_id', $tenant->id())
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->select('event_type', DB::raw('COUNT(*) as count'))
            ->groupBy('event_type')
            ->pluck('count', 'event_type');

        return [
            'forecast_runs' => (int) ($usage['forecast_run'] ?? 0),
            'ai_queries'    => (int) ($usage['ai_query'] ?? 0),
            'sku_count'     => $tenant->products()->count(),
            'period_start'  => $periodStart,
            'period_end'    => $periodEnd,
        ];
    }

    /**
     * Check if the tenant has exceeded a usage limit.
     */
    public function hasExceededLimit(string $limitType): bool
    {
        $tenant = tenant();
        $usage = $this->getCurrentPeriodUsage();
        $tier = Tier::bySlug($tenant->tier);

        return match ($limitType) {
            'forecast_runs' => false, // No limit on forecast runs currently
            'ai_queries'    => $tier->slug === 'pro'
                                && $usage['ai_queries'] >= 50,
            'sku_count'     => ! $tier->isUnlimitedSkus()
                                && $usage['sku_count'] >= $tier->max_skus,
            default => false,
        };
    }

    /**
     * Get remaining AI queries for Pro tier.
     */
    public function remainingAiQueries(): ?int
    {
        $tenant = tenant();
        $tier = Tier::bySlug($tenant->tier);

        if ($tier->slug === 'enterprise') {
            return null; // Unlimited
        }

        if ($tier->slug === 'starter') {
            return 0; // Not available
        }

        $usage = $this->getCurrentPeriodUsage();
        return max(0, 50 - $usage['ai_queries']);
    }
}
```

### 5.5 Invoice Generation

```php
// app/Services/InvoiceService.php

namespace App\Services;

use App\Models\Tenant;
use Laravel\Cashier\Invoice;

class InvoiceService
{
    /**
     * Generate a monthly invoice with usage breakdown.
     * Called by Stripe webhook or monthly scheduler.
     */
    public function generateInvoice(Tenant $tenant): array
    {
        $usageService = app(UsageMeteringService::class);
        $usage = $usageService->getCurrentPeriodUsage();
        $tier = Tier::bySlug($tenant->tier);

        // Base subscription amount
        $baseAmount = $tier->price_cents;

        // Overage charges (e.g., AI queries beyond Pro limit)
        $overage = $this->calculateOverage($tenant, $usage);

        // Build invoice line items
        $lineItems = [
            [
                'description' => "TrimedCast {$tier->name} Plan — Monthly",
                'amount'      => $baseAmount,
                'currency'    => 'usd',
            ],
        ];

        if ($overage['ai_overage_cents'] > 0) {
            $lineItems[] = [
                'description' => "AI Query Overage — {$overage['ai_overage_count']} queries @ \$0.10 each",
                'amount'      => $overage['ai_overage_cents'],
                'currency'    => 'usd',
            ];
        }

        // Add usage summary to Stripe invoice metadata
        if ($tenant->stripe_id) {
            $tenant->asStripeCustomer()->invoices->create([
                'metadata' => [
                    'forecast_runs' => $usage['forecast_runs'],
                    'ai_queries'    => $usage['ai_queries'],
                    'sku_count'     => $usage['sku_count'],
                    'period'        => $usage['period_start']->format('M Y'),
                ],
            ]);
        }

        return [
            'tenant_id'  => $tenant->id,
            'line_items' => $lineItems,
            'total_cents'=> $baseAmount + $overage['ai_overage_cents'],
            'usage'      => $usage,
        ];
    }

    private function calculateOverage(Tenant $tenant, array $usage): array
    {
        $tier = Tier::bySlug($tenant->tier);
        $overageCount = 0;

        // AI query overage for Pro tier (50 included, $0.10 each after)
        if ($tier->slug === 'pro' && $usage['ai_queries'] > 50) {
            $overageCount = $usage['ai_queries'] - 50;
        }

        return [
            'ai_overage_count'  => $overageCount,
            'ai_overage_cents'  => $overageCount * 10, // $0.10 each
        ];
    }
}
```

### 5.6 Stripe Webhook Handler

```php
// app/Http/Controllers/StripeWebhookController.php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\TenantSuspensionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;
use Stripe\Event;

class StripeWebhookController extends CashierWebhookController
{
    /**
     * Handle stripe webhook events.
     * All webhook handlers must be idempotent.
     */
    public function handleWebhook(Request $request)
    {
        $payload = $request->all();
        $method = 'handle' . studly_case(str_replace('.', '_', $payload['type']));

        if (method_exists($this, $method)) {
            return $this->{$method}($payload);
        }

        return $this->successMethod();
    }

    /**
     * Handle: customer.subscription.updated
     */
    protected function handleCustomerSubscriptionUpdated(array $payload): void
    {
        $tenant = $this->findTenantByStripeId($payload['data']['object']['customer']);

        if (! $tenant) {
            return;
        }

        $suspensionService = app(TenantSuspensionService::class);
        $suspensionService->evaluateTenantStatus($tenant);
    }

    /**
     * Handle: customer.subscription.deleted
     */
    protected function handleCustomerSubscriptionDeleted(array $payload): void
    {
        $tenant = $this->findTenantByStripeId($payload['data']['object']['customer']);

        if (! $tenant) {
            return;
        }

        $tenant->update(['status' => 'cancelled']);

        // Schedule data* final data access period
        NotifySubscriptionCancelled::dispatch($tenant);
    }

    /**
     * Handle: invoice.payment_failed
     */
    protected function handleInvoicePaymentFailed(array $payload): void
    {
        $tenant = $this->findTenantByStripeId($payload['data']['object']['customer']);

        if (! $tenant) {
            return;
        }

        Log::warning("Payment failed for tenant {$tenant->id}", [
            'attempt' => $payload['data']['object']['attempt_count'] ?? 1,
        ]);

        // Stripe will retry automatically. We handle grace period in our scheduler.
    }

    /**
     * Handle: invoice.payment_succeeded
     */
    protected function handleInvoicePaymentSucceeded(array $payload): void
    {
        $tenant = $this->findTenantByStripeId($payload['data']['object']['customer']);

        if (! $tenant && $tenant->status !== 'active') {
            // Reactivate suspended tenant
            $tenant->update(['status' => 'active', 'suspended_at' => null]);
            NotifyTenantReactivated::dispatch($tenant);
        }
    }

    /**
     * Handle: customer.subscription.trial_will_end
     * Sent 3 days before trial ends.
     */
    protected function handleCustomerSubscriptionTrialWillEnd(array $payload): void
    {
        $tenant = $this->findTenantByStripeId($payload['data']['object']['customer']);

        if ($tenant) {
            NotifyTrialEnding::dispatch($tenant);
        }
    }

    private function findTenantByStripeId(string $stripeId): ?Tenant
    {
        return Tenant::where('stripe_id', $stripeId)->first();
    }
}
```

**Webhook Route Registration:**

```php
// routes/web.php
Route::post('stripe/webhook', [StripeWebhookController::class, 'handleWebhook'])
    ->name('cashier.webhook');

// Ensure the route is EXCLUDED from CSRF and tenant middleware
// In VerifyCsrfToken middleware:
protected $except = ['stripe/webhook'];
```

---

## 6. Feature Gating

### 6.1 Feature Flags Configuration

```php
// config/features.php

return [
    /*
    |--------------------------------------------------------------------------
    | Feature Flags per Subscription Tier
    |--------------------------------------------------------------------------
    |
    | Each feature maps to the tiers that have access.
    | The CheckSubscriptionTier middleware uses this to validate access.
    |
    */

    'forecasting_models' => [
        'regression' => ['starter', 'pro', 'enterprise'],
        'prophet'    => ['pro', 'enterprise'],
        'ensemble'   => ['enterprise'],
    ],

    'capabilities' => [
        'multi_warehouse'      => ['pro', 'enterprise'],
        'ask_ai'              => ['pro', 'enterprise'],
        'custom_seasonal_models'=> ['enterprise'],
        'api_access'          => ['enterprise'],
        'sso'                 => ['enterprise'],
        'excel_import'        => ['pro', 'enterprise'],
        'dashboard_sharing'   => ['pro', 'enterprise'],
        'webhook_notifications'=> ['enterprise'],
        'per_tenant_backup'   => ['enterprise'],
        'custom_domain'       => ['enterprise'],
    ],

    'limits' => [
        'ai_queries_per_month' => [
            'starter'   => 0,
            'pro'       => 50,
            'enterprise'=> -1,  // unlimited
        ],
        'max_skus' => [
            'starter'   => 200,
            'pro'       => 1000,
            'enterprise'=> -1,  // unlimited
        ],
        'max_users' => [
            'starter'   => 3,
            'pro'       => 10,
            'enterprise'=> -1,  // unlimited
        ],
    ],
];
```

### 6.2 CheckSubscriptionTier Middleware

```php
// app/Http/Middleware/CheckSubscriptionTier.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates that the current tenant's subscription tier
 * has access to the requested feature.
 *
 * Usage in routes:
 *   Route::get('/forecasts/prophet', ...)->middleware('feature:prophet_forecasting');
 *   Route::post('/ai/ask', ...)->middleware('feature:ask_ai');
 *   Route::get('/api/data', ...)->middleware('feature:api_access');
 */
class CheckSubscriptionTier
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = tenant();

        // Trial tenants get access to their selected tier's features
        $tier = $tenant->tier;

        // Check if the tenant's tier includes this feature
        if (! $this->hasFeature($tier, $feature)) {
            return $this->denyAccess($feature, $tier);
        }

        // For features with usage limits, check if limit is exceeded
        if ($this->isUsageLimited($feature) && $this->isLimitExceeded($feature)) {
            return $this->limitExceededResponse($feature);
        }

        return $next($request);
    }

    /**
     * Check if a tier has access to a feature.
     */
    private function hasFeature(string $tier, string $feature): bool
    {
        $features = config('features.capabilities');

        // Check forecasting model features
        $forecastingFeatures = config('features.forecasting_models');
        if (isset($forecastingFeatures[$feature])) {
            return in_array($tier, $forecastingFeatures[$feature]);
        }

        // Check capability features
        if (isset($features[$feature])) {
            return in_array($tier, $features[$feature]);
        }

        // Unknown feature — deny by default
        return false;
    }

    /**
     * Check if the feature has a usage limit (e.g., AI queries).
     */
    private function isUsageLimited(string $feature): bool
    {
        return in_array($feature, ['ask_ai']);
    }

    /**
     * Check if the usage limit for a feature is exceeded.
     */
    private function isLimitExceeded(string $feature): bool
    {
        $meteringService = app(\App\Services\UsageMeteringService::class);

        return match ($feature) {
            'ask_ai' => $meteringService->hasExceededLimit('ai_queries'),
            default  => false,
        };
    }

    /**
     * Return a 403 with upgrade suggestion.
     */
    private function denyAccess(string $feature, string $currentTier): Response
    {
        $upgradeTiers = $this->getUpgradeTiersForFeature($feature);

        return response()->json([
            'error'   => 'feature_not_available',
            'message' => "The '{$feature}' feature is not available on your current plan.",
            'current_tier'  => $currentTier,
            'upgrade_to'    => $upgradeTiers,
            'upgrade_url'   => url('/billing/upgrade'),
        ], 403);
    }

    /**
     * Return a 429 with usage limit info.
     */
    private function limitExceededResponse(string $feature): Response
    {
        $meteringService = app(\App\Services\UsageMeteringService::class);

        return response()->json([
            'error'   => 'usage_limit_exceeded',
            'message' => "You have exceeded your monthly limit for '{$feature}'.",
            'remaining' => 0,
            'upgrade_url' => url('/billing/upgrade'),
        ], 429);
    }

    /**
     * Find the lowest tier(s) that include this feature.
     */
    private function getUpgradeTiersForFeature(string $feature): array
    {
        $allFeatures = array_merge(
            config('features.forecasting_models', []),
            config('features.capabilities', [])
        );

        if (! isset($allFeatures[$feature])) {
            return [];
        }

        return $allFeatures[$feature];
    }
}
```

**Middleware Registration:**

```php
// app/Http/Kernel.php

protected $routeMiddleware = [
    // ...
    'feature' => \App\Http\Middleware\CheckSubscriptionTier::class,
];
```

**Route Usage:**

```php
// routes/api.php

use App\Http\Middleware\CheckSubscriptionTier;

Route::middleware(['auth:sanctum', 'tenant', 'feature:prophet_forecasting'])
    ->prefix('forecasts/prophet')
    ->group(function () {
        Route::post('/', [ProphetForecastController::class, 'generate']);
        Route::get('/{id}', [ProphetForecastController::class, 'show']);
    });

Route::middleware(['auth:sanctum', 'tenant', 'feature:ask_ai'])
    ->prefix('ai')
    ->group(function () {
        Route::post('/ask', [AskAiController::class, 'ask']);
    });

Route::middleware(['auth:sanctum', 'tenant', 'feature:api_access'])
    ->prefix('external-api')
    ->group(function () {
        Route::get('/products', [ExternalApiController::class, 'products']);
        Route::get('/forecasts', [ExternalApiController::class, 'forecasts']);
    });
```

### 6.3 Blade Directive for Frontend Feature Gating

```php
// app/Providers/AppServiceProvider.php

public function boot(): void
{
    Blade::if('feature', function (string $feature) {
        $tenant = tenant();
        if (! $tenant) return false;

        $tier = $tenant->tier;
        $allFeatures = array_merge(
            config('features.forecasting_models', []),
            config('features.capabilities', [])
        );

        return isset($allFeatures[$feature]) && in_array($tier, $allFeatures[$feature]);
    });
}
```

```blade
{{-- Blade usage in views --}}

@feature('prophet_forecasting')
    <button onclick="runProphet()">Run Prophet Forecast</button>
@else
    <button class="opacity-50 cursor-not-allowed" title="Upgrade to Pro">
        Run Prophet Forecast 🔒
    </button>
@endfeature

@feature('ask_ai')
    <div id="ask-ai-widget">
        {{-- AI chat widget --}}
    </div>
@endfeature
```

---

## 7. Tenant-Specific Configuration

### 7.1 Settings Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│               CONFIGURATION RESOLUTION ORDER                 │
│                                                               │
│  ① SKU Override      (highest priority)                       │
│     sku_seasonality_overrides table                          │
│     e.g., "Brake pads: CNY impact = HIGH (critical import)"  │
│                                                               │
│  ② Category Default                                            │
│     category_forecast_defaults table                          │
│     e.g., "Brake parts: holding cost = 30%"                  │
│                                                               │
│  ③ Tenant Setting                                              │
│     forecast_settings table (one row per tenant)              │
│     e.g., "Default holding cost = 25%, BDT currency"         │
│                                                               │
│  ④ System Default       (lowest priority)                     │
│     config/forecasting.php                                    │
│     e.g., "Holding cost = 20%, USD currency"                 │
│                                                               │
│  Resolution: Check ① → ② → ③ → ④, use first found         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Forecast Settings Model

```php
// app/Models/ForecastSetting.php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ForecastSetting extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'default_holding_cost_pct',
        'default_ordering_cost',
        'default_lead_time_days',
        'currency',
        'winter_months',
        'monsoon_months',
        'summer_months',
        'cny_enabled',
        'cny_start_month',
        'cny_duration_days',
        'forecast_horizon_days',
        'confidence_level',
        'reorder_point_method',
        'safety_stock_method',
        'auto_forecast_enabled',
        'forecast_frequency',
        'week_starts_on',
        'fiscal_year_start_month',
    ];

    protected $casts = [
        'default_holding_cost_pct'=> 'decimal:4',
        'default_ordering_cost'   => 'decimal:2',
        'default_lead_time_days'  => 'integer',
        'winter_months'          => 'array',
        'monsoon_months'         => 'array',
        'summer_months'          => 'array',
        'cny_enabled'           => 'boolean',
        'cny_duration_days'     => 'integer',
        'forecast_horizon_days'  => 'integer',
        'confidence_level'      => 'decimal:4',
        'auto_forecast_enabled'  => 'boolean',
        'fiscal_year_start_month'=> 'integer',
    ];

    /**
     * Resolve a setting value through the full hierarchy.
     *
     * @param  string  $key  Setting key (e.g., 'holding_cost_pct')
     * @param  int|null  $skuId  Optional SKU ID for override lookup
     * @param  int|null  $categoryId  Optional category ID for default lookup
     */
    public function resolve(
        string $key,
        ?int $skuId = null,
        ?int $categoryId = null
    ): mixed {
        // Level 1: SKU Override
        if ($skuId) {
            $override = SkuSeasonalityOverride::where('product_id', $skuId)
                ->where('setting_key', $key)
                ->value('setting_value');

            if ($override !== null) {
                return $override;
            }
        }

        // Level 2: Category Default
        if ($categoryId) {
            $categoryDefault = CategoryForecastDefault::where('category_id', $categoryId)
                ->where('setting_key', $key)
                ->value('setting_value');

            if ($categoryDefault !== null) {
                return $categoryDefault;
            }
        }

        // Level 3: Tenant Setting
        $tenantValue = $this->getAttribute(
            $this->keyToAttribute($key)
        );

        if ($tenantValue !== null) {
            return $tenantValue;
        }

        // Level 4: System Default
        return config("forecasting.defaults.{$key}");
    }

    /**
     * Map setting keys to model attribute names.
     */
    private function keyToAttribute(string $key): string
    {
        return match ($key) {
            'holding_cost_pct'  => 'default_holding_cost_pct',
            'ordering_cost'     => 'default_ordering_cost',
            'lead_time_days'    => 'default_lead_time_days',
            default => $key,
        };
    }
}
```

### 7.3 System Defaults Config

```php
// config/forecasting.php

return [
    /*
    |--------------------------------------------------------------------------
    | System-Wide Forecast Defaults
    |--------------------------------------------------------------------------
    | These serve as the lowest-priority fallback in the settings hierarchy.
    | Tenant settings, category defaults, and SKU overrides take precedence.
    */

    'defaults' => [
        'holding_cost_pct'  => 0.20,     // 20% annual
        'ordering_cost'     => 500.00,    // BDT 500
        'lead_time_days'    => 14,        // 2 weeks
        'currency'          => 'BDT',
        'confidence_level'  => 0.95,      // 95% CI
        'forecast_horizon'  => 90,        // 3 months
        'safety_stock_method'=> 'standard',
        'reorder_method'    => 'eoq',
    ],

    'seasons' => [
        'bangladesh' => [
            'winter'  => [11, 12, 1, 2],   // Nov-Feb
            'monsoon' => [6, 7, 8, 9],     // Jun-Sep
            'summer'  => [3, 4, 5],        // Mar-May
        ],
        'latin_america' => [
            'winter'  => [6, 7, 8],        // Jun-Aug (Southern hemisphere)
            'monsoon' => [],               // Not applicable
            'summer'  => [12, 1, 2],       // Dec-Feb
        ],
        'southeast_asia' => [
            'winter'  => [12, 1],          // Dec-Jan (mild)
            'monsoon' => [5, 6, 7, 8, 9, 10], // May-Oct
            'summer'  => [3, 4, 11],       // Mar-Apr, Nov
        ],
    ],

    'cny' => [
        'default_enabled'  => true,
        'default_start_month' => 1,
        'default_duration_days'=> 21,
        'supply_impact_pct' => 0.80,  // 80% supply reduction during CNY
    ],

    'models' => [
        'regression' => [
            'min_data_points'  => 12,
            'max_lookback_days'=> 365,
        ],
        'prophet' => [
            'min_data_points'  => 30,
            'max_lookback_days'=> 730,
            'default_params'   => [
                'seasonality_mode'     => 'multiplicative',
                'yearly_seasonality'   => 'auto',
                'weekly_seasonality'   => false,
                'daily_seasonality'    => false,
                'changepoint_prior_scale'=> 0.05,
            ],
        ],
    ],
];
```

### 7.4 Example: Seasonal Configuration Differences

```
┌────────────────────────────────────────────────────────────────────────┐
│            SEASONAL CONFIG: BANGLADESH vs LATIN AMERICA                 │
│                                                                          │
│  Bangladesh (Dhaka)                  Latin America (São Paulo)           │
│  ─────────────────                   ────────────────────────            │
│  Winter: Nov,Dec,Jan,Feb            Winter: Jun,Jul,Aug                  │
│  ░░░░░░░░░░░░░░░░░░░░               ░░░░░░░░░░░░░░░░                   │
│         ▼▼▼▼                              ▼▼▼                           │
│  Nov Dec Jan Feb Mar ... Oct         Jan Feb ... Jun Jul Aug ... Dec    │
│                                                                          │
│  Monsoon: Jun,Jul,Aug,Sep           Rainy: Dec,Jan,Feb                  │
│  ░░░░░░░░░░░░░░░░░░░░               ░░░░░░░░░░░░░░░░                   │
│               ▼▼▼▼                   ▼▼▼                                │
│  Jun Jul Aug Sep                     Dec Jan Feb                         │
│                                                                          │
│  CNY Impact: HIGH (imports from CN)  CNY Impact: LOW (local supply)     │
│  Currency: BDT                       Currency: BRL                      │
│  Holding Cost: 25%                   Holding Cost: 18%                  │
│  Lead Time: 14 days                  Lead Time: 7 days                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.5 SKU Override Table

```sql
CREATE TABLE sku_seasonality_overrides (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
    product_id      INTEGER NOT NULL REFERENCES products(id),
    setting_key     VARCHAR(100) NOT NULL,  -- 'holding_cost_pct', 'lead_time_days', etc.
    setting_value   JSONB NOT NULL,         -- flexible value storage
    reason          TEXT,                    -- "Brake pads imported, high CNY impact"
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, product_id, setting_key)
);

CREATE INDEX idx_sku_overrides_product ON sku_seasonality_overrides (tenant_id, product_id);
```

---

## 8. Scaling Architecture

### 8.1 Infrastructure Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        TRIMEDCAST PRODUCTION ARCHITECTURE                  │
│                                                                             │
│                          ┌─────────────┐                                   │
│                          │  Cloudflare │                                   │
│                          │  CDN + WAF  │                                   │
│                          └──────┬──────┘                                   │
│                                 │                                           │
│                          ┌──────▼──────┐                                   │
│                          │   Load     │                                    │
│                          │  Balancer  │                                    │
│                          │ (ALB/NLB)  │                                    │
│                          └──────┬──────┘                                   │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                  │                       │
│       ┌──────▼──────┐   ┌─────▼───────┐   ┌─────▼───────┐               │
│       │  Laravel     │   │  Laravel    │   │  Laravel    │               │
│       │  App Server  │   │  App Server │   │  App Server │               │
│       │  (Node 1)   │   │  (Node 2)   │   │  (Node N)   │               │
│       └──────┬──────┘   └─────┬───────┘   └─────┬───────┘               │
│              │                 │                  │                       │
│              └────────┬───────┴──────────┬──────┘                       │
│                       │                  │                                │
│              ┌────────▼────────┐  ┌─────▼───────┐                        │
│              │ Redis Cluster   │  │ PostgreSQL  │                        │
│              │ ┌─────┐┌─────┐ │  │  Primary    │                        │
│              │ │Cache││Queue│ │  └─────┬───────┘                        │
│              │ │Shard││Shard│ │        │                                   │
│              │ └─────┘└─────┘ │  ┌─────▼───────┐                        │
│              └────────────────┘  │  Read       │                        │
│                                  │  Replica 1  │                        │
│              ┌────────────────┐  └─────────────┘                        │
│              │  S3 / R2       │                                         │
│              │  ┌───────────┐ │  ┌─────────────┐                        │
│              │  │ tenants/  │ │  │ Read        │                        │
│              │  │  123/     │ │  │ Replica 2   │                        │
│              │  │  456/     │ │  └─────────────┘                        │
│              │  └───────────┘ │                                         │
│              └────────────────┘                                         │
│                                                                             │
│              ┌────────────────────────────────────┐                        │
│              │    Python Forecast Service (K8s)    │                        │
│              │  ┌─────┐  ┌─────┐  ┌─────┐       │                        │
│              │  │ Pod │  │ Pod │  │ Pod │       │                        │
│              │  │  1  │  │  2  │  │  N  │       │                        │
│              │  └──┬──┘  └──┬──┘  └──┬──┘       │                        │
│              │     └────────┴────────┘           │                        │
│              │     HPA: scale on queue depth     │                        │
│              └────────────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Horizontal Scaling — Laravel App Servers

```yaml
# docker-compose.prod.yml (simplified)

services:
  laravel:
    image: trimedcast/app:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 1G
    environment:
      - APP_ENV=production
      - DB_HOST=postgres-primary
      - DB_REPLICA_HOST=postgres-replica-1,postgres-replica-2
      - REDIS_HOST=redis-cluster
      - QUEUE_CONNECTION=redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Read/Write Connection Splitting:**

```php
// config/database.php

'connections' => [

    'pgsql' => [
        'driver'    => 'pgsql',
        'host'      => env('DB_HOST', 'postgres-primary'),
        // ... write goes to primary
    ],

    'pgsql_read' => [
        'driver'    => 'pgsql',
        'host'      => env('DB_REPLICA_HOST', 'postgres-replica-1'),
        // ... reads go to replica for dashboard queries
    ],
],
```

```php
// app/Models/DemandForecast.php

class DemandForecast extends Model
{
    // Dashboard queries (read-heavy) use replica
    protected $connection = 'pgsql_read';

    // Write operations (forecast generation) use primary
    public static function storeResults(array $results): void
    {
        static::onWriteConnection()->insert($results);
    }
}
```

### 8.3 Python Forecast Service — Kubernetes Deployment

```yaml
# k8s/forecast-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: forecast-service
  namespace: trimedcast
spec:
  replicas: 2
  selector:
    matchLabels:
      app: forecast-service
  template:
    metadata:
      labels:
        app: forecast-service
    spec:
      containers:
        - name: forecast-worker
          image: trimedcast/forecast-service:latest
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: trimedcast-secrets
                  key: redis-url
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: trimedcast-secrets
                  key: db-host
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 15
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: forecast-hpa
  namespace: trimedcast
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: forecast-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: redis_queue_depth
          selector:
            matchLabels:
              queue: forecasts
        target:
          type: AverageValue
          averageValue: "5"   # Scale up when >5 jobs per pod
```

### 8.4 Redis Cluster Configuration

```
┌─────────────────────────────────────────────────────────┐
│                  REDIS CLUSTER (6 nodes)                  │
│                                                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Master 1│  │ Master 2│  │ Master 3│                  │
│  │ Cache   │  │ Queue   │  │ Sessions│                  │
│  │ shard 0 │  │ shard 1 │  │ shard 2 │                  │
│  └────┬────┘  └────┬────┘  └────┬────┘                  │
│       │             │             │                        │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐                  │
│  │ Replica1│  │ Replica2│  │ Replica3│                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                           │
│  Key namespace: tenant:{id}:{purpose}:{key}              │
│  e.g.: tenant:42:cache:forecast:product-123              │
│        tenant:42:queue:forecasts                          │
│        tenant:42:session:admin                            │
└─────────────────────────────────────────────────────────┘
```

### 8.5 Database Scaling Strategy

```sql
-- Partitioning for large tenant-scoped tables (PostgreSQL 12+)
-- Forecast results can grow very large; partition by tenant_id + month

CREATE TABLE forecast_results (
    id              BIGSERIAL,
    tenant_id       INTEGER NOT NULL,
    product_id      INTEGER NOT NULL,
    model_type      VARCHAR(50) NOT NULL,
    forecast_date   DATE NOT NULL,
    predicted_demand DECIMAL(12,2),
    lower_bound     DECIMAL(12,2),
    upper_bound     DECIMAL(12,2),
    mape            DECIMAL(6,4),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, tenant_id, created_at)
) PARTITION BY HASH (tenant_id);

-- Create 8 hash partitions for even distribution
CREATE TABLE forecast_results_p0 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE forecast_results_p1 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE forecast_results_p2 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE forecast_results_p3 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE forecast_results_p4 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE forecast_results_p5 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE forecast_results_p6 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE forecast_results_p7 PARTITION OF forecast_results
    FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- Similarly partition inventory_transactions by month (range)
-- for efficient archival of old transaction data
CREATE TABLE inventory_transactions (
    id              BIGSERIAL,
    tenant_id       INTEGER NOT NULL,
    product_id      INTEGER NOT NULL,
    warehouse_id    INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity        DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, transaction_date)
) PARTITION BY RANGE (transaction_date);

-- Monthly partitions (created by pg_partman)
CREATE TABLE inventory_transactions_2025_01
    PARTITION OF inventory_transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE inventory_transactions_2025_02
    PARTITION OF inventory_transactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... auto-created by pg_partman going forward
```

### 8.6 CDN & Static Assets

```
┌────────────────────────────────────────────────────────┐
│                STATIC ASSET DELIVERY                     │
│                                                          │
│  Browser ──▶ Cloudflare CDN ──▶ Laravel (origin)       │
│                                                          │
│  Cached at edge:                                         │
│    /build/assets/*    (JS, CSS, fonts) — 1 year cache   │
│    /images/*          (tenant logos, product images)     │
│                                                          │
│  Not cached:                                             │
│    /api/*             (dynamic data)                     │
│    /forecast/*       (computation results)               │
│                                                          │
│  Tenant-specific assets:                                 │
│    s3://trimedcast-assets/tenants/{id}/logo.png         │
│    → Cloudflare R2 → CDN edge cache                     │
└────────────────────────────────────────────────────────┘
```

---

## 9. Multi-Tenant SaaS Admin Dashboard

### 9.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   SUPER-ADMIN DASHBOARD                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Super-Admin Panel (separate Laravel route group)    │     │
│  │  Domain: admin.trimedcast.com                        │     │
│  │  Auth: 2FA required, separate guard                  │     │
│  │  No tenant_id scope (cross-tenant access)            │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐      │
│  │ Tenant  │  │Subscriptn│  │ Usage   │  │ Revenue  │      │
│  │ Mgmt    │  │ Mgmt     │  │ Metrics │  │ Metrics  │      │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘      │
│                                                                │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐      │
│  │Security │  │ System   │  │ Support │  │ Feature  │      │
│  │ Events  │  │ Health   │  │ Tools   │  │ Flags    │      │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Super-Admin Routes

```php
// routes/admin.php

use App\Http\Middleware\SuperAdminAuth;

Route::prefix('admin')
    ->domain('admin.trimedcast.com')
    ->middleware([SuperAdminAuth::class, '2fa'])
    ->group(function () {

        // Tenant Management
        Route::get('/tenants', [Admin\TenantController::class, 'index']);
        Route::get('/tenants/{tenant}', [Admin\TenantController::class, 'show']);
        Route::post('/tenants/{tenant}/suspend', [Admin\TenantController::class, 'suspend']);
        Route::post('/tenants/{tenant}/reactivate', [Admin\TenantController::class, 'reactivate']);
        Route::post('/tenants/{tenant}/extend-trial', [Admin\TenantController::class, 'extendTrial']);
        Route::post('/tenants/{tenant}/reset-password', [Admin\TenantController::class, 'resetPassword']);
        Route::post('/tenants/{tenant}/impersonate', [Admin\TenantController::class, 'impersonate']);

        // Subscription Management
        Route::get('/subscriptions', [Admin\SubscriptionController::class, 'index']);
        Route::post('/subscriptions/{tenant}/override-tier', [Admin\SubscriptionController::class, 'overrideTier']);
        Route::post('/subscriptions/{tenant}/apply-credit', [Admin\SubscriptionController::class, 'applyCredit']);

        // System Metrics
        Route::get('/metrics/overview', [Admin\MetricsController::class, 'overview']);
        Route::get('/metrics/revenue', [Admin\MetricsController::class, 'revenue']);
        Route::get('/metrics/usage', [Admin\MetricsController::class, 'usage']);
        Route::get('/metrics/forecast-quality', [Admin\MetricsController::class, 'forecastQuality']);

        // Security Events
        Route::get('/security/events', [Admin\SecurityController::class, 'events']);
        Route::get('/security/cross-tenant-attempts', [Admin\SecurityController::class, 'crossTenantAttempts']);

        // System Health
        Route::get('/system/health', [Admin\SystemController::class, 'health']);
        Route::get('/system/queue-status', [Admin\SystemController::class, 'queueStatus']);
    });
```

### 9.3 Super-Admin Metrics Controller

```php
// app/Http/Controllers/Admin/MetricsController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\UsageEvent;
use App\Models\ForecastResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MetricsController extends Controller
{
    /**
     * System-wide overview metrics.
     */
    public function overview(Request $request)
    {
        return response()->json([
            // Tenant counts
            'tenants' => [
                'total'        => Tenant::count(),
                'active'       => Tenant::where('status', 'active')->count(),
                'trial'        => Tenant::where('status', 'trial')->count(),
                'suspended'    => Tenant::where('status', 'suspended')->count(),
                'cancelled'    => Tenant::where('status', 'cancelled')->count(),
            ],

            // Revenue metrics
            'revenue' => [
                'mrr'          => $this->calculateMRR(),
                'arr'          => $this->calculateMRR() * 12,
                'churn_rate'   => $this->calculateChurnRate(),
                'avg_revenue_per_tenant' => $this->calculateARPT(),
            ],

            // Usage metrics
            'usage' => [
                'total_forecast_runs'  => $this->monthlyCount('forecast_run'),
                'total_ai_queries'    => $this->monthlyCount('ai_query'),
                'total_skus_tracked'  => DB::table('products')->count(),
            ],

            // Forecast quality
            'forecast_quality' => [
                'avg_mape' => $this->calculatePlatformAvgMape(),
            ],

            // Tier distribution
            'tier_distribution' => Tenant::select('tier', DB::raw('COUNT(*) as count'))
                ->groupBy('tier')
                ->pluck('count', 'tier'),
        ]);
    }

    /**
     * Calculate Monthly Recurring Revenue.
     */
    private function calculateMRR(): float
    {
        $tierPrices = [
            'starter'    => 29.00,
            'pro'        => 79.00,
            'enterprise' => 199.00,
        ];

        $mrr = 0;
        foreach ($tierPrices as $tier => $price) {
            $count = Tenant::where('status', 'active')
                ->where('tier', $tier)
                ->count();
            $mrr += $count * $price;
        }

        return round($mrr, 2);
    }

    /**
     * Calculate monthly churn rate.
     * Churn = tenants lost this month / tenants at start of month
     */
    private function calculateChurnRate(): float
    {
        $startOfMonth = now()->startOfMonth();
        $startOfLastMonth = now()->subMonth()->startOfMonth();

        $tenantsAtStart = Tenant::where('created_at', '<', $startOfMonth)
            ->where('status', '!=', 'cancelled')
            ->count();

        $churnedThisMonth = Tenant::where('status', 'cancelled')
            ->whereBetween('updated_at', [$startOfMonth, now()])
            ->count();

        if ($tenantsAtStart === 0) return 0;

        return round(($churnedThisMonth / $tenantsAtStart) * 100, 2);
    }

    /**
     * Calculate average MAPE across the entire platform.
     */
    private function calculatePlatformAvgMape(): ?float
    {
        return ForecastResult::where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('mape')
            ->avg('mape');
    }

    private function calculateARPT(): float
    {
        $activeTenants = Tenant::where('status', 'active')->count();
        if ($activeTenants === 0) return 0;

        return round($this->calculateMRR() / $activeTenants, 2);
    }

    private function monthlyCount(string $eventType): int
    {
        return UsageEvent::where('event_type', $eventType)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }
}
```

### 9.4 Impersonation (Support Tool)

```php
// app/Http/Controllers/Admin/TenantController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TenantController extends Controller
{
    /**
     * Impersonate a user in a tenant for support purposes.
     * Creates a temporary impersonation session with audit trail.
     */
    public function impersonate(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:10', // Must document reason
        ]);

        // Log the impersonation event
        SecurityEvent::create([
            'type'           => 'admin_impersonation',
            'super_admin_id' => Auth::id(),
            'target_tenant_id'=> $tenant->id,
            'reason'         => $validated['reason'],
            'ip_address'     => $request->ip(),
            'occurred_at'    => now(),
        ]);

        // Get the tenant admin to impersonate
        $tenantAdmin = User::where('tenant_id', $tenant->id)
            ->where('role', 'tenant_admin')
            ->firstOrFail();

        // Create impersonation token (time-limited, 1 hour)
        $token = $tenantAdmin->createToken('impersonation', [
            'impersonated_by' => Auth::id(),
            'expires_at'      => now()->addHour()->toIso8601String(),
        ])->plainTextToken;

        return response()->json([
            'message'       => 'Impersonation session started. Expires in 1 hour.',
            'impersonation_url' => "https://{$tenant->subdomain}.trimedcast.com/impersonate?token={$token}",
            'expires_at'    => now()->addHour()->toIso8601String(),
        ]);
    }

    /**
     * Extend a tenant's trial period.
     */
    public function extendTrial(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'days'   => 'required|integer|min:1|max:30',
            'reason' => 'required|string',
        ]);

        $tenant->update([
            'trial_ends_at' => $tenant->trial_ends_at->addDays($validated['days']),
        ]);

        AuditLog::create([
            'action'  => 'trial_extended',
            'subject' => 'tenant',
            'subject_id' => $tenant->id,
            'performed_by' => Auth::id(),
            'details' => [
                'days_added' => $validated['days'],
                'reason'     => $validated['reason'],
            ],
        ]);

        return response()->json([
            'message' => "Trial extended by {$validated['days']} days.",
            'new_trial_end' => $tenant->fresh()->trial_ends_at,
        ]);
    }
}
```

---

## 10. Security Considerations

### 10.1 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEFENSE-IN-DEPTH LAYERS                           │
│                                                                       │
│  Layer 1: Network         Cloudflare WAF + DDoS protection           │
│  Layer 2: Transport       TLS 1.3 everywhere (HSTS enforced)        │
│  Layer 3: Authentication  JWT + Sanctum, 2FA for admins             │
│  Layer 4: Authorization   Tenant scope + Feature gating + RBAC      │
│  Layer 5: Application     Input validation, CSRF, XSS prevention    │
│  Layer 6: Database        PostgreSQL RLS (row-level security)        │
│  Layer 7: Audit           All access logged, cross-tenant alerted   │
│  Layer 8: Data            Encryption at rest (AES-256) + in transit │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Tenant ID in JWT Token (Tamper-Proof)

```php
// app/Services/Auth/JwtTenantClaimService.php

namespace App\Services\Auth;

use App\Models\User;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;

class JwtTenantClaimService
{
    /**
     * Build a JWT with tenant_id as a signed claim.
     *
     * CRITICAL: The tenant_id is INSIDE the signed token.
     * It cannot be modified without invalidating the signature.
     * The SetTenantId middleware reads this claim — NOT from
     * the request body or headers which could be tampered.
     */
    public function buildToken(User $user): string
    {
        $config = Configuration::forSymmetricSigner(
            new Sha256(),
            InMemory::plainText(config('app.jwt_secret'))
        );

        $now = new \DateTimeImmutable();

        $token = $config->builder()
            ->issuedBy(config('app.url'))
            ->permittedFor(config('app.url'))
            ->identifiedBy(uniqid())
            ->issuedAt($now)
            ->canOnlyBeUsedAfter($now)
            ->expiresAt($now->modify('+1 hour'))
            ->withClaim('uid', $user->id)
            ->withClaim('tid', $user->tenant_id)    // ← Tenant ID in token
            ->withClaim('tier', $user->tenant->tier)
            ->withClaim('role', $user->role)
            ->getToken($config->signer(), $config->signingKey());

        return $token->toString();
    }

    /**
     * Extract and validate the tenant_id from a JWT.
     * Returns null if token is invalid or expired.
     */
    public function extractTenantId(string $token): ?int
    {
        try {
            $parsed = $this->parse($token);
            return $parsed->claims()->get('tid');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
```

**Why NOT in URL paths:**

```
❌  GET /api/tenants/42/products     ← tenant_id in URL (enumeration risk)
❌  GET /api/t/42/products           ← shortened but same problem

✅  GET /api/products                ← tenant_id from JWT token
    Authorization: Bearer eyJ...    ← tid: 42 inside signed token
    X-Tenant-Subdomain: acmemotors  ← validated against token's tid
```

### 10.3 API Rate Limiting Per Tenant

```php
// app/Http/Middleware/TenantRateLimiter.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rate limiting per tenant (not just per user/IP).
 *
 * A single tenant with 10 users shouldn't get 10x the rate limit.
 * The limit is shared across all users within the tenant.
 */
class TenantRateLimiter
{
    public function handle(Request $request, Closure $next, string $limitType = 'api'): Response
    {
        $tenantId = tenant()->id();
        $tier = tenant()->tier;

        // Rate limits per tier per minute
        $limits = config("features.rate_limits.{$limitType}");

        $maxAttempts = $limits[$tier] ?? $limits['default'];

        $key = "tenant_rate:{$limitType}:{$tenantId}";

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($key);

            return response()->json([
                'error'   => 'rate_limit_exceeded',
                'message' => "Rate limit exceeded. Retry after {$retryAfter} seconds.",
                'retry_after' => $retryAfter,
            ], 429, [
                'Retry-After' => $retryAfter,
                'X-RateLimit-Limit' => $maxAttempts,
                'X-RateLimit-Remaining' => 0,
            ]);
        }

        RateLimiter::hit($key, 60); // 60-second decay

        $response = $next($request);

        // Add rate limit headers to successful responses
        $remaining = $maxAttempts - RateLimiter::attempts($key);
        $response->headers->set('X-RateLimit-Limit', (string) $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', (string) max(0, $remaining));

        return $response;
    }
}
```

```php
// config/features.php (rate limits section)

'rate_limits' => [
    'api' => [
        'starter'    => 60,    // 60 req/min
        'pro'        => 120,   // 120 req/min
        'enterprise' => 300,   // 300 req/min
        'default'    => 60,
    ],
    'forecast' => [
        'starter'    => 10,    // 10 forecast req/min
        'pro'        => 30,    // 30 forecast req/min
        'enterprise' => 60,    // 60 forecast req/min
        'default'    => 10,
    ],
    'ai' => [
        'starter'    => 0,     // Not available
        'pro'        => 10,    // 10 AI req/min
        'enterprise' => 30,    // 30 AI req/min
        'default'    => 0,
    ],
],
```

### 10.4 Audit Logging for Cross-Tenant Access Attempts

```sql
-- security_events table: audit log for all security-relevant events
CREATE TABLE security_events (
    id              BIGSERIAL PRIMARY KEY,
    type            VARCHAR(100) NOT NULL,
    -- Types: 'cross_tenant_access_attempt', 'admin_impersonation',
    --       'rate_limit_exceeded', 'suspicious_query_pattern',
    --       'permission_escalation_attempt', 'data_export'

    user_id         INTEGER REFERENCES users(id),
    tenant_id       INTEGER REFERENCES tenants(id),
    token_tenant_id INTEGER,          -- The tenant_id in the JWT
    target_tenant_id INTEGER,         -- The tenant_id they tried to access
    ip_address      INET,
    user_agent      TEXT,
    url             TEXT,
    request_method  VARCHAR(10),
    details         JSONB DEFAULT '{}',
    severity        VARCHAR(20) DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'critical'
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_by     INTEGER REFERENCES users(id),
    resolved_at     TIMESTAMPTZ
);

-- Indexes for security monitoring queries
CREATE INDEX idx_security_events_type_date
    ON security_events (type, occurred_at DESC);
CREATE INDEX idx_security_events_tenant
    ON security_events (tenant_id, occurred_at DESC);
CREATE INDEX idx_security_events_unresolved
    ON security_events (severity, occurred_at DESC) WHERE NOT resolved;
```

```php
// app/Services/SecurityAuditService.php

namespace App\Services;

use App\Models\SecurityEvent;
use Illuminate\Http\Request;

class SecurityAuditService
{
    /**
     * Log a security event with full context.
     */
    public function log(
        string $type,
        ?Request $request = null,
        array $context = [],
        string $severity = 'medium'
    ): SecurityEvent {
        return SecurityEvent::create([
            'type'            => $type,
            'user_id'         => auth()->id(),
            'tenant_id'       => tenant()->id() ?? $context['tenant_id'] ?? null,
            'token_tenant_id' => $context['token_tenant_id'] ?? null,
            'target_tenant_id'=> $context['target_tenant_id'] ?? null,
            'ip_address'      => $request?->ip(),
            'user_agent'      => $request?->userAgent(),
            'url'             => $request?->fullUrl(),
            'request_method'  => $request?->method(),
            'details'         => $context,
            'severity'        => $severity,
            'occurred_at'     => now(),
        ]);
    }

    /**
     * Get unresolved high-severity events (for admin dashboard alerts).
     */
    public function getUnresolvedAlerts(): \Illuminate\Support\Collection
    {
        return SecurityEvent::where('resolved', false)
            ->whereIn('severity', ['high', 'critical'])
            ->orderByDesc('occurred_at')
            ->limit(50)
            ->get();
    }

    /**
     * Get cross-tenant access attempt statistics.
     */
    public function getCrossTenantStats(int $days = 30): array
    {
        $since = now()->subDays($days);

        return [
            'total_attempts' => SecurityEvent::where('type', 'cross_tenant_access_attempt')
                ->where('occurred_at', '>=', $since)
                ->count(),
            'unique_ips' => SecurityEvent::where('type', 'cross_tenant_access_attempt')
                ->where('occurred_at', '>=', $since)
                ->distinct('ip_address')
                ->count('ip_address'),
            'by_user' => SecurityEvent::where('type', 'cross_tenant_access_attempt')
                ->where('occurred_at', '>=', $since)
                ->select('user_id', DB::raw('COUNT(*) as attempts'))
                ->groupBy('user_id')
                ->having('attempts', '>', 3)
                ->orderByDesc('attempts')
                ->limit(10)
                ->get(),
        ];
    }
}
```

### 10.5 Data Export (GDPR / Data Portability)

```php
// app/Exports/TenantDataExport.php

namespace App\Exports;

use App\Models\Tenant;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class TenantDataExport implements WithMultipleSheets
{
    public function __construct(private Tenant $tenant) {}

    public function sheets(): array
    {
        return [
            'Products'             => new TenantSheetExport($this->tenant, 'products'),
            'Warehouses'           => new TenantSheetExport($this->tenant, 'warehouses'),
            'Inventory_Transactions'=> new TenantSheetExport($this->tenant, 'inventory_transactions'),
            'Demand_Forecasts'     => new TenantSheetExport($this->tenant, 'demand_forecasts'),
            'Forecast_Results'     => new TenantSheetExport($this->tenant, 'forecast_results'),
            'Forecast_Settings'   => new TenantSheetExport($this->tenant, 'forecast_settings'),
            'Users'               => new TenantSheetExport($this->tenant, 'users'),
            'Reorder_Alerts'      => new TenantSheetExport($this->tenant, 'reorder_alerts'),
            'Usage_Events'        => new TenantSheetExport($this->tenant, 'usage_events'),
        ];
    }
}

// app/Exports/TenantSheetExport.php

namespace App\Exports;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class TenantSheetExport implements FromArray, WithHeadings
{
    public function __construct(
        private Tenant $tenant,
        private string $table
    ) {}

    public function array(): array
    {
        $records = DB::table($this->table)
            ->where('tenant_id', $this->tenant->id)
            ->get()
            ->map(fn ($row) => (array) $row)
            ->toArray();

        // Audit the export event
        app(SecurityAuditService::class)->log('data_export', null, [
            'table'     => $this->table,
            'row_count' => count($records),
        ]);

        return $records;
    }

    public function headings(): array
    {
        // Get column names from the first row
        $firstRow = DB::table($this->table)
            ->where('tenant_id', $this->tenant->id)
            ->first();

        return $firstRow ? array_keys((array) $firstRow) : [];
    }
}
```

```php
// app/Http/Controllers/TenantDataExportController.php

namespace App\Http\Controllers;

use App\Exports\TenantDataExport;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class TenantDataExportController extends Controller
{
    /**
     * Export all tenant data as a multi-sheet Excel file.
     * Available to tenant admins. Enterprise tier can also get JSON/CSV.
     */
    public function export(Request $request)
    {
        $tenant = tenant();
        $format = $request->query('format', 'xlsx');

        $fileName = "trimedcast-export-{$tenant->subdomain}-" . now()->format('Y-m-d') . ".{$format}";

        // Rate limit: max 1 export per hour per tenant
        $key = "export:{$tenant->id}";
        if (cache()->has($key)) {
            return response()->json([
                'error' => 'Export already requested recently. Please wait before requesting again.',
            ], 429);
        }
        cache()->put($key, true, 3600); // 1 hour

        return Excel::download(new TenantDataExport($tenant), $fileName);
    }
}
```

### 10.6 Per-Tenant Backup (Enterprise Tier)

```php
// app/Services/TenantBackupService.php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TenantBackupService
{
    /**
     * Create a backup of a single tenant's data.
     * Only available for Enterprise tier tenants.
     *
     * Uses PostgreSQL's COPY for fast export + pg_dump for schema.
     */
    public function createBackup(Tenant $tenant): string
    {
        // Verify enterprise tier
        if ($tenant->tier !== 'enterprise') {
            throw new \InvalidArgumentException('Per-tenant backups require Enterprise tier.');
        }

        $timestamp = now()->format('Y-m-d-His');
        $backupDir = "backups/tenant-{$tenant->id}/{$timestamp}";

        // Tables to backup (tenant-scoped only)
        $tables = [
            'products', 'warehouses', 'inventory_transactions',
            'demand_forecasts', 'forecast_results', 'reorder_alerts',
            'forecast_settings', 'users', 'sku_seasonality_overrides',
            'transaction_categories', 'usage_events',
        ];

        foreach ($tables as $table) {
            $data = DB::table($table)
                ->where('tenant_id', $tenant->id)
                ->get();

            Storage::disk('s3')->put(
                "{$backupDir}/{$table}.json",
                $data->toJson(JSON_PRETTY_PRINT)
            );
        }

        // Also backup tenant files
        $files = Storage::disk('s3')->allFiles("tenants/{$tenant->id}");
        foreach ($files as $file) {
            $relativePath = str_replace("tenants/{$tenant->id}/", '', $file);
            Storage::disk('s3')->copy(
                $file,
                "{$backupDir}/files/{$relativePath}"
            );
        }

        // Record backup metadata
        $tenant->backups()->create([
            'path'       => $backupDir,
            'size_bytes' => Storage::disk('s3')->directorySize($backupDir),
            'tables'     => $tables,
            'created_at' => now(),
        ]);

        return $backupDir;
    }

    /**
     * Schedule automatic weekly backups for all enterprise tenants.
     * Called by the scheduler.
     */
    public function scheduleWeeklyBackups(): void
    {
        Tenant::where('tier', 'enterprise')
            ->where('status', 'active')
            ->each(function (Tenant $tenant) {
                CreateTenantBackup::dispatch($tenant)
                    ->onQueue('backups');
            });
    }
}
```

### 10.7 Security Middleware Stack Summary

```php
// app/Http/Kernel.php — Final middleware order

protected $middlewareGroups = [
    'api' => [
        // 1. Rate limiting (before auth to prevent brute force)
        \Illuminate\Routing\Middleware\ThrottleRequests::class,

        // 2. Authentication
        \App\Http\Middleware\Authenticate::class,

        // 3. Tenant context (AFTER auth — needs user's tenant_id)
        \App\Http\Middleware\SetTenantId::class,

        // 4. Feature gating (AFTER tenant — needs tenant's tier)
        // Applied per-route via 'feature:' middleware

        // 5. Tenant rate limiting (AFTER tenant — needs tenant_id)
        \App\Http\Middleware\TenantRateLimiter::class,
    ],
];

// Middleware priority (Laravel executes in this order for intersecting middleware)
protected $middlewarePriority = [
    \Illuminate\Foundation\Http\Middleware\HandlePatches::class,
    \Illuminate\Routing\Middleware\ThrottleRequests::class,
    \App\Http\Middleware\Authenticate::class,
    \App\Http\Middleware\SetTenantId::class,
    \App\Http\Middleware\CheckSubscriptionTier::class,
    \App\Http\Middleware\TenantRateLimiter::class,
];
```

---

## Appendix A: Database Migration — Tenants Table

```php
// database/migrations/2025_01_01_000001_create_tenants_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('subdomain')->unique();
            $table->string('tier')->default('starter');
            $table->string('status')->default('trial'); // trial, active, suspended, cancelled, deleting
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
            $table->timestamp('deletion_requested_at')->nullable();
            $table->timestamp('deletion_scheduled_at')->nullable();
            $table->string('data_export_path')->nullable();

            // Stripe billing fields
            $table->string('stripe_id')->nullable()->unique();
            $table->string('pm_type')->nullable();
            $table->string('pm_last_four', 4)->nullable();
            $table->timestamp('trial_ends_at_stripe')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('forecast_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->decimal('default_holding_cost_pct', 6, 4)->default(0.25);
            $table->decimal('default_ordering_cost', 12, 2)->default(500.00);
            $table->integer('default_lead_time_days')->default(14);
            $table->string('currency', 3)->default('BDT');
            $table->json('winter_months')->nullable();
            $table->json('monsoon_months')->nullable();
            $table->json('summer_months')->nullable();
            $table->boolean('cny_enabled')->default(true);
            $table->integer('cny_start_month')->default(1);
            $table->integer('cny_duration_days')->default(21);
            $table->integer('forecast_horizon_days')->default(90);
            $table->decimal('confidence_level', 6, 4)->default(0.95);
            $table->string('reorder_point_method')->default('safety_stock');
            $table->string('safety_stock_method')->default('standard');
            $table->boolean('auto_forecast_enabled')->default(false);
            $table->string('forecast_frequency')->default('weekly');
            $table->integer('week_starts_on')->default(0); // 0=Sunday
            $table->integer('fiscal_year_start_month')->default(7); // July (Bangladesh)
            $table->timestamps();

            $table->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forecast_settings');
        Schema::dropIfExists('tenants');
    }
};
```

## Appendix B: Environment Configuration

```bash
# .env.production (relevant SaaS settings)

# Tenancy
TENANCY_BASE_DOMAIN=trimedcast.com
TENANCY_GUARD=sanctum

# Stripe
STRIPE_KEY=pk_live_...
STRIPE_SECRET=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_starter_monthly
STRIPE_PRICE_PRO=price_pro_monthly
STRIPE_PRICE_ENTERPRISE=price_enterprise_monthly

# Redis (cluster mode)
REDIS_HOST=redis-cluster.trimedcast.internal
REDIS_PASSWORD=...
REDIS_CLUSTER=redis

# Database
DB_HOST=postgres-primary.trimedcast.internal
DB_REPLICA_HOST=postgres-replica-1.trimedcast.internal,postgres-replica-2.trimedcast.internal
DB_DATABASE=trimedcast
DB_USERNAME=trimedcast_app
DB_PASSWORD=...

# S3 / Cloudflare R2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=auto
AWS_BUCKET=trimedcast-assets
AWS_ENDPOINT=https://trimedcast-assets.r2.cloudflarestorage.com

# Python Forecast Service
FORECAST_SERVICE_URL=http://forecast-service.trimedcast.svc.cluster.local:8000
FORECAST_SERVICE_TIMEOUT=120
```

## Appendix C: Key Database Indexes for Multi-Tenant Performance

```sql
-- Every tenant-scoped table MUST have a composite index on (tenant_id, ...)
-- This is critical for the Shared-DB model to perform well.

-- Products
CREATE INDEX idx_products_tenant_id ON products (tenant_id);
CREATE INDEX idx_products_tenant_sku ON products (tenant_id, sku_code);
CREATE INDEX idx_products_tenant_category ON products (tenant_id, category_id);

-- Inventory Transactions
CREATE INDEX idx_inventory_tx_tenant_date ON inventory_transactions (tenant_id, transaction_date DESC);
CREATE INDEX idx_inventory_tx_tenant_product ON inventory_transactions (tenant_id, product_id, transaction_date DESC);

-- Demand Forecasts
CREATE INDEX idx_demand_forecasts_tenant_product ON demand_forecasts (tenant_id, product_id);
CREATE INDEX idx_demand_forecasts_tenant_date ON demand_forecasts (tenant_id, forecast_date DESC);

-- Forecast Results
CREATE INDEX idx_forecast_results_tenant_product ON forecast_results (tenant_id, product_id, model_type);

-- Reorder Alerts
CREATE INDEX idx_reorder_alerts_tenant_status ON reorder_alerts (tenant_id, status, created_at DESC);

-- Users
CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_users_tenant_email ON users (tenant_id, email);

-- Usage Events (covered in Section 5.4)
-- Security Events (covered in Section 10.4)
```

---

> **Document maintained by:** TrimedCast Engineering Team  
> **Next review date:** 2025-10-09  
> **Change log:** v1.0 — Initial comprehensive architecture document
