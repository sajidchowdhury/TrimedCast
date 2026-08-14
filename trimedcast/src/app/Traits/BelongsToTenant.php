<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    /**
     * Boot the BelongsToTenant trait for the model.
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        // Auto-set tenant_id when creating models
        static::creating(function (Model $model) {
            if (empty($model->tenant_id)) {
                $tenantId = self::resolveCurrentTenantId();
                if ($tenantId) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    /**
     * Resolve the current tenant ID.
     */
    protected static function resolveCurrentTenantId(): ?string
    {
        // Try authenticated user
        if (auth()->check() && auth()->user()->tenant_id) {
            return auth()->user()->tenant_id;
        }

        // Try request header
        if ($tenantId = request()->header('X-Tenant-Id')) {
            return $tenantId;
        }

        // Try route parameter
        if ($tenantId = request()->route('tenant_id')) {
            return $tenantId;
        }

        return null;
    }

    /**
     * Get the tenant that owns this model.
     */
    public function tenant()
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }

    /**
     * Determine if the model belongs to a given tenant.
     */
    public function belongsToTenant(string $tenantId): bool
    {
        return $this->tenant_id === $tenantId;
    }

    /**
     * Scope to get all records without tenant filtering.
     */
    public function scopeAllTenants($query)
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }

    /**
     * Scope to filter by a specific tenant.
     */
    public function scopeForTenant($query, string $tenantId)
    {
        return $query->withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $tenantId);
    }
}
