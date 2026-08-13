<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'subscription_tier',
        'subscription_status',
        'subscription_expires_at',
        'max_skus',
        'max_users',
        'settings',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
    ];

    protected $casts = [
        'subscription_expires_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'settings' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (empty($tenant->id)) {
                $tenant->id = (string) Str::uuid();
            }
            if (empty($tenant->slug)) {
                $tenant->slug = Str::slug($tenant->name);
            }
        });
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function motorcycleModels()
    {
        return $this->hasMany(MotorcycleModel::class);
    }

    public function suppliers()
    {
        return $this->hasMany(Supplier::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function promoEvents()
    {
        return $this->hasMany(PromoEvent::class);
    }

    public function sopCycles()
    {
        return $this->hasMany(SopCycle::class);
    }

    public function isOnTrial(): bool
    {
        return $this->subscription_status === 'trial';
    }

    public function isActive(): bool
    {
        return $this->subscription_status === 'active';
    }

    public function isEnterprise(): bool
    {
        return $this->subscription_tier === 'enterprise';
    }
}
