<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RecommendedOrder extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'supplier_id',
        'forecast_id',
        'recommended_qty',
        'estimated_cost_bdt',
        'order_trigger_date',
        'expected_delivery_date',
        'supplier_lead_time_days',
        'processing_time_days',
        'shipping_time_days',
        'customs_clearance_days',
        'total_lead_time_days',
        'forecasted_demand',
        'current_stock_qty',
        'safety_stock_qty',
        'pending_order_qty',
        'backorder_qty',
        'urgency',
        'urgency_score',
        'stockout_risk_days',
        'stockout_probability',
        'cny_buffer_recommended',
        'cny_buffer_qty',
        'cny_cost_impact_bdt',
        'seasonal_note',
        'seasonal_multiplier',
        'sop_cycle_id',
        'status',
        'reviewed_by',
        'reviewed_at',
        'converted_to_po_id',
        'review_notes',
    ];

    protected $casts = [
        'order_trigger_date' => 'date',
        'expected_delivery_date' => 'date',
        'reviewed_at' => 'datetime',
        'cny_buffer_recommended' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (RecommendedOrder $order) {
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

    public function forecast()
    {
        return $this->belongsTo(Forecast::class);
    }

    public function sopCycle()
    {
        return $this->belongsTo(SopCycle::class, 'sop_cycle_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function convertedToPo()
    {
        return $this->belongsTo(PurchaseOrder::class, 'converted_to_po_id');
    }

    public function isCritical(): bool
    {
        return $this->urgency === 'critical';
    }

    public function isPendingReview(): bool
    {
        return $this->status === 'pending_review';
    }
}
