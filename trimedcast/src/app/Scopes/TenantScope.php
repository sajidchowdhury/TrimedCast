<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the tenant scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = $this->resolveTenantId();

        if ($tenantId) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        }
    }

    /**
     * Extend the query builder with tenant-scoped macros.
     */
    public function extend(Builder $builder): void
    {
        $this->addWithoutTenant($builder);
        $this->addForTenant($builder);
    }

    /**
     * Add the without-tenant macro to the builder.
     */
    protected function addWithoutTenant(Builder $builder): void
    {
        $builder->macro('withoutTenant', function (Builder $builder) {
            return $builder->withoutGlobalScope(static::class);
        });
    }

    /**
     * Add the for-tenant macro to the builder.
     */
    protected function addForTenant(Builder $builder): void
    {
        $builder->macro('forTenant', function (Builder $builder, string $tenantId) {
            return $builder->withoutGlobalScope(static::class)
                ->where($builder->getModel()->getTable() . '.tenant_id', $tenantId);
        });
    }

    /**
     * Resolve the current tenant ID from the authenticated user.
     */
    protected function resolveTenantId(): ?string
    {
        // Check if running in console (artisan commands)
        if (app()->runningInConsole()) {
            // Allow tenant override via --tenant flag
            if ($tenantId = request()->query('tenant_id')) {
                return $tenantId;
            }
            return null;
        }

        // Try to get tenant from authenticated user
        if (auth()->check() && auth()->user()->tenant_id) {
            return auth()->user()->tenant_id;
        }

        // Try to get tenant from request header (for API)
        if ($tenantId = request()->header('X-Tenant-Id')) {
            return $tenantId;
        }

        // Try to get tenant from route parameter
        if ($tenantId = request()->route('tenant_id')) {
            return $tenantId;
        }

        return null;
    }
}
