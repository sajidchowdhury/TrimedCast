<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Forecast extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'forecast_setting_id',
        'method',
        'forecast_start_date',
        'forecast_end_date',
        'forecast_horizon_months',
        'forecast_values',
        'seasonal_indices',
        'trend_component',
        'alpha_fitted',
        'beta_fitted',
        'gamma_fitted',
        'level_component',
        'trend_component_value',
        'mape',
        'rmse',
        'mae',
        'bias',
        'tracking_signal',
        'r_squared',
        'aic',
        'bic',
        'training_data_start',
        'training_data_end',
        'training_data_points',
        'outliers_removed',
        'backtest_results',
        'cny_adjusted',
        'cny_adjustment_details',
        'promo_adjusted',
        'promo_adjustment_details',
        'status',
        'version',
        'superseded_by',
        'computation_time_ms',
        'computed_by',
        'computed_at',
    ];

    protected $casts = [
        'forecast_start_date' => 'date',
        'forecast_end_date' => 'date',
        'training_data_start' => 'date',
        'training_data_end' => 'date',
        'computed_at' => 'datetime',
        'forecast_values' => 'array',
        'seasonal_indices' => 'array',
        'trend_component' => 'array',
        'backtest_results' => 'array',
        'cny_adjustment_details' => 'array',
        'promo_adjustment_details' => 'array',
        'cny_adjusted' => 'boolean',
        'promo_adjusted' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Forecast $forecast) {
            if (empty($forecast->id)) {
                $forecast->id = (string) Str::uuid();
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

    public function forecastSetting()
    {
        return $this->belongsTo(ForecastSetting::class);
    }

    public function supersededBy()
    {
        return $this->belongsTo(Forecast::class, 'superseded_by');
    }

    public function recommendedOrders()
    {
        return $this->hasMany(RecommendedOrder::class, 'forecast_id');
    }

    public function isAccurate(): bool
    {
        return $this->mape !== null && $this->mape <= 25.0;
    }

    public function isStale(): bool
    {
        return $this->status === 'stale';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
