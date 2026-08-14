<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PurchaseHistory extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'supplier_id',
        'purchase_date',
        'qty_purchased',
        'unit_cost_bdt',
        'total_cost_bdt',
        'purchase_order_number',
        'purchase_type',
        'exchange_rate_usd_bdt',
        'exchange_rate_cny_bdt',
        'lead_time_actual_days',
        'expected_delivery_date',
        'actual_delivery_date',
        'delivery_delay_days',
        'quality_status',
        'quality_reject_pct',
        'metadata',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (PurchaseHistory $history) {
            if (empty($history->id)) {
                $history->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function scopeForDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('purchase_date', [$startDate, $endDate]);
    }

    public function isDelayed(): bool
    {
        return $this->delivery_delay_days > 0;
    }
}
