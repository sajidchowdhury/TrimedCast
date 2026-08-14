<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forecasts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('forecast_setting_id');

            // Forecast identification
            $table->enum('method', [
                'ses',
                'holts',
                'holts_winters',
                'croston',
                'sba',
                'moving_average',
                'regression',
                'ensemble',
            ]);
            $table->date('forecast_start_date');
            $table->date('forecast_end_date');
            $table->integer('forecast_horizon_months');

            // Forecast values
            $table->jsonb('forecast_values')->default('[]');  // [{date, value, lower_ci, upper_ci}]
            $table->jsonb('seasonal_indices')->default('{}');
            $table->jsonb('trend_component')->default('{}');

            // Smoothing coefficients (fitted)
            $table->decimal('alpha_fitted', 6, 4)->nullable();
            $table->decimal('beta_fitted', 6, 4)->nullable();
            $table->decimal('gamma_fitted', 6, 4)->nullable();
            $table->decimal('level_component', 14, 4)->nullable();
            $table->decimal('trend_component_value', 14, 4)->nullable();

            // Error metrics
            $table->decimal('mape', 6, 2)->nullable();        // Mean Absolute Percentage Error
            $table->decimal('rmse', 14, 4)->nullable();        // Root Mean Squared Error
            $table->decimal('mae', 14, 4)->nullable();         // Mean Absolute Error
            $table->decimal('bias', 14, 4)->nullable();        // Mean Error (bias)
            $table->decimal('tracking_signal', 8, 4)->nullable();
            $table->decimal('r_squared', 6, 4)->nullable();
            $table->decimal('aic', 12, 4)->nullable();         // Akaike Information Criterion
            $table->decimal('bic', 12, 4)->nullable();         // Bayesian Information Criterion

            // Training data range
            $table->date('training_data_start')->nullable();
            $table->date('training_data_end')->nullable();
            $table->integer('training_data_points')->nullable();
            $table->integer('outliers_removed')->default(0);

            // Out-of-sample test results
            $table->jsonb('backtest_results')->default('{}');

            // CNY adjustment
            $table->boolean('cny_adjusted')->default(false);
            $table->jsonb('cny_adjustment_details')->default('{}');

            // Promo adjustment
            $table->boolean('promo_adjusted')->default(false);
            $table->jsonb('promo_adjustment_details')->default('{}');

            // Status & versioning
            $table->enum('status', [
                'draft',
                'training',
                'completed',
                'failed',
                'stale',
            ])->default('draft');
            $table->integer('version')->default(1);
            $table->uuid('superseded_by')->nullable();  // Link to newer forecast version

            // Computation metadata
            $table->integer('computation_time_ms')->nullable();
            $table->string('computed_by')->nullable();  // 'auto' or user_id
            $table->timestamp('computed_at')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('forecast_setting_id');
            $table->index('method');
            $table->index('status');
            $table->index(['product_id', 'method', 'status'], 'forecast_product_method_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forecasts');
    }
};
