<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SalesHistory extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'motorcycle_model_id',
        'sale_date',
        'qty_sold',
        'unit_price_bdt',
        'total_revenue_bdt',
        'sales_channel',
        'customer_region',
        'sale_type',
        'is_promo_sale',
        'promo_event_id',
        'invoice_number',
        'metadata',
    ];

    protected $casts = [
        'sale_date' => 'date',
        'is_promo_sale' => 'boolean',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (SalesHistory $history) {
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

    public function motorcycleModel()
    {
        return $this->belongsTo(MotorcycleModel::class);
    }

    public function promoEvent()
    {
        return $this->belongsTo(PromoEvent::class);
    }

    public function scopeForDateRange($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('sale_date', [$startDate, $endDate]);
    }

    public function scopeForProduct($query, string $productId)
    {
        return $query->where('product_id', $productId);
    }
}
