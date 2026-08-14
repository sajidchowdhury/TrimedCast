<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'supplier_id',
        'po_number',
        'order_type',
        'order_date',
        'expected_ship_date',
        'expected_delivery_date',
        'actual_ship_date',
        'actual_delivery_date',
        'qty_ordered',
        'qty_received',
        'qty_rejected',
        'qty_in_transit',
        'unit_cost_bdt',
        'total_cost_bdt',
        'exchange_rate_cny_bdt',
        'exchange_rate_usd_bdt',
        'landed_cost_bdt',
        'customs_duty_bdt',
        'shipping_cost_bdt',
        'agreed_lead_time_days',
        'actual_lead_time_days',
        'delay_days',
        'cny_risk_flag',
        'cny_price_increase_pct',
        'cny_holiday_impact',
        'payment_status',
        'amount_paid_bdt',
        'payment_terms',
        'status',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_ship_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_ship_date' => 'date',
        'actual_delivery_date' => 'date',
        'cny_risk_flag' => 'boolean',
        'cny_holiday_impact' => 'array',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (PurchaseOrder $order) {
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

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function isDelayed(): bool
    {
        return $this->delay_days > 0;
    }

    public function isCnyAffected(): bool
    {
        return $this->cny_risk_flag;
    }

    public function isReceived(): bool
    {
        return in_array($this->status, ['received', 'closed']);
    }
}
