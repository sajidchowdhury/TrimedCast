<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'contact_person',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'supplier_type',
        'avg_lead_time_days',
        'min_lead_time_days',
        'max_lead_time_days',
        'lead_time_std_dev',
        'reliability_score',
        'fill_rate',
        'on_time_delivery_rate',
        'quality_score',
        'payment_terms',
        'cny_risk_profile',
        'is_cny_affected',
        'cny_holiday_period',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_cny_affected' => 'boolean',
        'is_active' => 'boolean',
        'payment_terms' => 'array',
        'cny_risk_profile' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Supplier $supplier) {
            if (empty($supplier->id)) {
                $supplier->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function recommendedOrders()
    {
        return $this->hasMany(RecommendedOrder::class);
    }

    public function isReliable(): bool
    {
        return $this->reliability_score >= 0.80;
    }
}
