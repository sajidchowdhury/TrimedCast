<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ForecastSetting extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'default_method',
        'enabled_methods',
        'alpha',
        'beta',
        'gamma',
        'seasonal_period',
        'season_type',
        'dry_season_months',
        'pre_monsoon_months',
        'monsoon_months',
        'post_monsoon_months',
        'training_window_months',
        'forecast_horizon_months',
        'min_data_points',
        'outlier_detection_enabled',
        'outlier_threshold',
        'outlier_action',
        'cny_adjustment_enabled',
        'cny_lead_time_buffer_days',
        'cny_stock_up_multiplier',
        'retrain_frequency_days',
        'auto_retrain',
        'mape_threshold',
        'bias_threshold',
    ];

    protected $casts = [
        'enabled_methods' => 'array',
        'dry_season_months' => 'array',
        'pre_monsoon_months' => 'array',
        'monsoon_months' => 'array',
        'post_monsoon_months' => 'array',
        'outlier_detection_enabled' => 'boolean',
        'cny_adjustment_enabled' => 'boolean',
        'auto_retrain' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (ForecastSetting $setting) {
            if (empty($setting->id)) {
                $setting->id = (string) Str::uuid();
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

    public function forecasts()
    {
        return $this->hasMany(Forecast::class);
    }

    public function isMultiplicativeSeason(): bool
    {
        return $this->season_type === 'multiplicative';
    }
}
