<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forecast_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');

            // Forecast method configuration
            $table->enum('default_method', [
                'ses',
                'holts',
                'holts_winters',
                'croston',
                'sba',
                'moving_average',
                'regression',
                'ensemble',
            ])->default('holts_winters');
            $table->jsonb('enabled_methods')->default('["ses", "holts_winters", "croston"]');

            // Smoothing parameters
            $table->decimal('alpha', 6, 4)->default(0.3000);    // Level
            $table->decimal('beta', 6, 4)->default(0.1000);     // Trend
            $table->decimal('gamma', 6, 4)->default(0.1000);    // Seasonality

            // Seasonal periods
            $table->integer('seasonal_period')->default(12);  // Monthly data = 12 months
            $table->enum('season_type', [
                'additive',
                'multiplicative',
            ])->default('multiplicative');

            // Bangladesh season definitions (months as arrays)
            $table->jsonb('dry_season_months')->default('[11, 12, 1, 2]');       // Nov-Feb
            $table->jsonb('pre_monsoon_months')->default('[3, 4, 5]');           // Mar-May
            $table->jsonb('monsoon_months')->default('[6, 7, 8, 9]');            // Jun-Sep
            $table->jsonb('post_monsoon_months')->default('[10]');               // Oct

            // Training window
            $table->integer('training_window_months')->default(24);
            $table->integer('forecast_horizon_months')->default(6);
            $table->integer('min_data_points')->default(12);

            // Outlier detection
            $table->boolean('outlier_detection_enabled')->default(true);
            $table->decimal('outlier_threshold', 4, 2)->default(2.50);  // Z-score threshold
            $table->enum('outlier_action', ['remove', 'cap', 'flag'])->default('cap');

            // CNY adjustment
            $table->boolean('cny_adjustment_enabled')->default(false);
            $table->decimal('cny_lead_time_buffer_days', 5, 1)->default(0.0);
            $table->decimal('cny_stock_up_multiplier', 4, 2)->default(1.00);

            // Model retraining
            $table->integer('retrain_frequency_days')->default(7);
            $table->boolean('auto_retrain')->default(true);

            // Accuracy thresholds
            $table->decimal('mape_threshold', 5, 2)->default(25.00);
            $table->decimal('bias_threshold', 5, 2)->default(10.00);

            $table->timestamps();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'product_id'], 'forecast_settings_product_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forecast_settings');
    }
};
