<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('supplier_id');
            $table->string('po_number');
            $table->enum('order_type', [
                'standard',
                'emergency',
                'cny_stock_up',
                'blanket',
                'consignment',
            ])->default('standard');

            // Dates timeline
            $table->date('order_date');
            $table->date('expected_ship_date')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_ship_date')->nullable();
            $table->date('actual_delivery_date')->nullable();

            // Quantities
            $table->integer('qty_ordered');
            $table->integer('qty_received')->default(0);
            $table->integer('qty_rejected')->default(0);
            $table->integer('qty_in_transit')->default(0);

            // Pricing
            $table->decimal('unit_cost_bdt', 12, 2)->default(0.00);
            $table->decimal('total_cost_bdt', 12, 2)->default(0.00);
            $table->decimal('exchange_rate_cny_bdt', 10, 4)->nullable();
            $table->decimal('exchange_rate_usd_bdt', 10, 4)->nullable();
            $table->decimal('landed_cost_bdt', 12, 2)->nullable();
            $table->decimal('customs_duty_bdt', 12, 2)->default(0.00);
            $table->decimal('shipping_cost_bdt', 12, 2)->default(0.00);

            // Lead time tracking
            $table->integer('agreed_lead_time_days')->nullable();
            $table->integer('actual_lead_time_days')->nullable();
            $table->integer('delay_days')->default(0);

            // CNY risk
            $table->boolean('cny_risk_flag')->default(false);
            $table->decimal('cny_price_increase_pct', 5, 2)->default(0.00);
            $table->jsonb('cny_holiday_impact')->default('{}');

            // Payment
            $table->enum('payment_status', [
                'pending',
                'partial',
                'paid',
                'overdue',
            ])->default('pending');
            $table->decimal('amount_paid_bdt', 12, 2)->default(0.00);
            $table->string('payment_terms')->nullable();

            // Status
            $table->enum('status', [
                'draft',
                'submitted',
                'confirmed',
                'in_production',
                'shipped',
                'received',
                'partial_receipt',
                'cancelled',
                'closed',
            ])->default('draft');

            $table->text('notes')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('supplier_id');
            $table->index('order_date');
            $table->index('status');
            $table->index('cny_risk_flag');
            $table->unique(['tenant_id', 'po_number'], 'purchase_order_number_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
