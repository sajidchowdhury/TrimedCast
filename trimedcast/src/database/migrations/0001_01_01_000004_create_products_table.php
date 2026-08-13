<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('supplier_id');
            $table->uuid('motorcycle_model_id')->nullable();
            $table->string('sku_code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('category', [
                'engine',
                'transmission',
                'electrical',
                'body_frame',
                'brake_suspension',
                'fuel_system',
                'exhaust',
                'rubber_seal',
                'consumable',
                'accessory',
                'universal',
            ])->default('universal');
            $table->enum('sub_category', [
                'piston_ring',
                'gasket',
                'bearing',
                'chain_sprocket',
                'filter',
                'cable',
                'bulb',
                'tyre',
                'battery',
                'other',
            ])->nullable();
            $table->string('oem_part_number')->nullable();
            $table->string('aftermarket_brand')->nullable();
            $table->boolean('is_oem')->default(true);
            $table->enum('demand_pattern', [
                'stable',
                'seasonal',
                'trending_up',
                'trending_down',
                'lumpy',
                'intermittent',
            ])->default('stable');

            // Seasonal weight fields (Bangladesh seasons)
            $table->decimal('seasonal_weight_dry', 4, 3)->default(1.000);  // Nov-Feb
            $table->decimal('seasonal_weight_pre_monsoon', 4, 3)->default(1.000);  // Mar-May
            $table->decimal('seasonal_weight_monsoon', 4, 3)->default(1.000);  // Jun-Sep
            $table->decimal('seasonal_weight_post_monsoon', 4, 3)->default(1.000);  // Oct

            // Lead time & inventory parameters
            $table->integer('lead_time_days')->default(7);
            $table->integer('safety_stock_qty')->default(0);
            $table->integer('reorder_point_qty')->default(0);
            $table->integer('min_order_qty')->default(1);
            $table->integer('max_order_qty')->nullable();
            $table->integer('order_multiple')->default(1);
            $table->decimal('unit_cost_bdt', 12, 2)->default(0.00);
            $table->decimal('selling_price_bdt', 12, 2)->default(0.00);

            // ABC-XYZ classification
            $table->enum('abc_class', ['A', 'B', 'C'])->nullable();
            $table->enum('xyz_class', ['X', 'Y', 'Z'])->nullable();
            $table->string('abc_xyz_category', 2)->nullable();

            // Demand parameters for forecasting
            $table->decimal('avg_monthly_demand', 12, 2)->default(0.00);
            $table->decimal('demand_std_dev', 12, 2)->default(0.00);
            $table->decimal('demand_cv', 6, 4)->default(0.0000);  // Coefficient of Variation
            $table->integer('adi')->nullable();  // Average Demand Interval

            // CNY risk
            $table->boolean('is_cny_affected')->default(false);
            $table->decimal('cny_price_impact_pct', 5, 2)->default(0.00);

            // Lifecycle
            $table->enum('lifecycle_stage', ['new', 'growth', 'mature', 'decline', 'discontinued'])->default('new');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('supplier_id');
            $table->index('motorcycle_model_id');
            $table->index('category');
            $table->index('abc_xyz_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
