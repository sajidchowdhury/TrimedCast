<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PromoEvent extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'event_type',
        'description',
        'start_date',
        'end_date',
        'expected_uplift_pct',
        'actual_uplift_pct',
        'affected_product_ids',
        'affected_category_ids',
        'budget_bdt',
        'actual_spend_bdt',
        'status',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'affected_product_ids' => 'array',
        'affected_category_ids' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (PromoEvent $event) {
            if (empty($event->id)) {
                $event->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class, 'promo_event_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->start_date <= now()->toDateString()
            && $this->end_date >= now()->toDateString();
    }

    public function isUpcoming(): bool
    {
        return $this->status === 'planned' && $this->start_date > now()->toDateString();
    }
}
