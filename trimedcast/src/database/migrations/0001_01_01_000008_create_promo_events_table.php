<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->enum('event_type', [
                'eid_sale',
                'puja_sale',
                'new_year_sale',
                'independence_day',
                'flash_sale',
                'seasonal_clearance',
                'launch_promo',
                'trade_show',
                'other',
            ])->default('other');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('expected_uplift_pct', 5, 2)->default(0.00);
            $table->decimal('actual_uplift_pct', 5, 2)->nullable();
            $table->jsonb('affected_product_ids')->default('[]');
            $table->jsonb('affected_category_ids')->default('[]');
            $table->decimal('budget_bdt', 14, 2)->nullable();
            $table->decimal('actual_spend_bdt', 14, 2)->nullable();
            $table->enum('status', [
                'planned',
                'active',
                'completed',
                'cancelled',
            ])->default('planned');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index(['start_date', 'end_date'], 'promo_date_range_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_events');
    }
};
