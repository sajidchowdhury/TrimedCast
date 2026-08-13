<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SalesOrder extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'order_number',
        'order_type',
        'order_date',
        'requested_delivery_date',
        'actual_delivery_date',
        'qty_ordered',
        'qty_shipped',
        'qty_backordered',
        'unit_price_bdt',
        'total_amount_bdt',
        'discount_pct',
        'discount_amount_bdt',
        'customer_name',
        'customer_phone',
        'customer_region',
        'sales_channel',
        'promo_event_id',
        'priority',
        'status',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'order_date' => 'date',
        'requested_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (SalesOrder $order) {
            if (empty($order->id)) {
                $order->id = (string) Str::uuid();
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

    public function promoEvent()
    {
        return $this->belongsTo(PromoEvent::class);
    }

    public function isFulfilled(): bool
    {
        return $this->qty_shipped >= $this->qty_ordered;
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
