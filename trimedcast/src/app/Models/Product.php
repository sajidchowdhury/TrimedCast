<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'supplier_id',
        'motorcycle_model_id',
        'sku_code',
        'name',
        'description',
        'category',
        'sub_category',
        'oem_part_number',
        'aftermarket_brand',
        'is_oem',
        'demand_pattern',
        'seasonal_weight_dry',
        'seasonal_weight_pre_monsoon',
        'seasonal_weight_monsoon',
        'seasonal_weight_post_monsoon',
        'lead_time_days',
        'safety_stock_qty',
        'reorder_point_qty',
        'min_order_qty',
        'max_order_qty',
        'order_multiple',
        'unit_cost_bdt',
        'selling_price_bdt',
        'abc_class',
        'xyz_class',
        'abc_xyz_category',
        'avg_monthly_demand',
        'demand_std_dev',
        'demand_cv',
        'adi',
        'is_cny_affected',
        'cny_price_impact_pct',
        'lifecycle_stage',
        'is_active',
    ];

    protected $casts = [
        'is_oem' => 'boolean',
        'is_cny_affected' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (empty($product->id)) {
                $product->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function motorcycleModel()
    {
        return $this->belongsTo(MotorcycleModel::class);
    }

    public function inventory()
    {
        return $this->hasOne(Inventory::class);
    }

    public function forecastSettings()
    {
        return $this->hasOne(ForecastSetting::class);
    }

    public function forecasts()
    {
        return $this->hasMany(Forecast::class);
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class);
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function recommendedOrders()
    {
        return $this->hasMany(RecommendedOrder::class);
    }

    public function isSeasonal(): bool
    {
        return $this->demand_pattern === 'seasonal';
    }

    public function isIntermittent(): bool
    {
        return in_array($this->demand_pattern, ['intermittent', 'lumpy']);
    }

    public function getSeasonalWeightForMonth(int $month): float
    {
        return match (true) {
            in_array($month, [11, 12, 1, 2]) => $this->seasonal_weight_dry,
            in_array($month, [3, 4, 5]) => $this->seasonal_weight_pre_monsoon,
            in_array($month, [6, 7, 8, 9]) => $this->seasonal_weight_monsoon,
            $month === 10 => $this->seasonal_weight_post_monsoon,
            default => 1.0,
        };
    }
}
