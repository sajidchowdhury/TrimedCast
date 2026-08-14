<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Inventory extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'qty_on_hand',
        'qty_reserved',
        'qty_on_order',
        'qty_in_transit',
        'qty_available',
        'qty_backordered',
        'unit_cost_bdt',
        'warehouse_location',
        'bin_location',
        'last_received_at',
        'last_sold_at',
        'days_of_supply',
        'stock_status',
        'metadata',
    ];

    protected $casts = [
        'last_received_at' => 'date',
        'last_sold_at' => 'date',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Inventory $inventory) {
            if (empty($inventory->id)) {
                $inventory->id = (string) Str::uuid();
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

    public function isOutOfStock(): bool
    {
        return $this->qty_available <= 0;
    }

    public function isLowStock(): bool
    {
        return $this->stock_status === 'low_stock';
    }

    public function recalculateStockStatus(): void
    {
        if ($this->qty_available <= 0) {
            $this->stock_status = 'out_of_stock';
        } elseif ($this->qty_available <= $this->product->safety_stock_qty) {
            $this->stock_status = 'low_stock';
        } else {
            $this->stock_status = 'in_stock';
        }
        $this->saveQuietly();
    }
}
