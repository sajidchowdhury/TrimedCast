<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recommended_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('supplier_id');
            $table->uuid('forecast_id')->nullable();

            // Order recommendation
            $table->integer('recommended_qty');
            $table->decimal('estimated_cost_bdt', 12, 2)->default(0.00);
            $table->date('order_trigger_date');
            $table->date('expected_delivery_date');

            // Lead time decomposition
            $table->integer('supplier_lead_time_days')->default(0);
            $table->integer('processing_time_days')->default(0);
            $table->integer('shipping_time_days')->default(0);
            $table->integer('customs_clearance_days')->default(0);
            $table->integer('total_lead_time_days')->storedAs(
                'supplier_lead_time_days + processing_time_days + shipping_time_days + customs_clearance_days'
            );

            // Demand justification
            $table->decimal('forecasted_demand', 12, 2)->default(0.00);
            $table->integer('current_stock_qty')->default(0);
            $table->integer('safety_stock_qty')->default(0);
            $table->integer('pending_order_qty')->default(0);
            $table->integer('backorder_qty')->default(0);

            // Urgency scoring
            $table->enum('urgency', [
                'critical',
                'high',
                'medium',
                'low',
                'no_action',
            ])->default('medium');
            $table->decimal('urgency_score', 5, 2)->default(50.00);  // 0-100
            $table->integer('stockout_risk_days')->nullable();  // Days until stockout
            $table->decimal('stockout_probability', 5, 2)->default(0.00);  // 0-100%

            // CNY considerations
            $table->boolean('cny_buffer_recommended')->default(false);
            $table->integer('cny_buffer_qty')->default(0);
            $table->decimal('cny_cost_impact_bdt', 12, 2)->default(0.00);

            // Seasonal considerations
            $table->string('seasonal_note')->nullable();
            $table->decimal('seasonal_multiplier', 4, 2)->default(1.00);

            // SOP cycle linkage
            $table->uuid('sop_cycle_id')->nullable();

            // Review workflow
            $table->enum('status', [
                'pending_review',
                'approved',
                'modified',
                'rejected',
                'converted_to_po',
                'expired',
            ])->default('pending_review');
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->uuid('converted_to_po_id')->nullable();
            $table->text('review_notes')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('supplier_id');
            $table->index('forecast_id');
            $table->index('urgency');
            $table->index('status');
            $table->index('order_trigger_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommended_orders');
    }
};
