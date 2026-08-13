<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->string('order_number');
            $table->enum('order_type', [
                'sales_order',
                'workshop_order',
                'online_order',
                'wholesale_order',
            ])->default('sales_order');
            $table->date('order_date');
            $table->date('requested_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->integer('qty_ordered');
            $table->integer('qty_shipped')->default(0);
            $table->integer('qty_backordered')->default(0);
            $table->decimal('unit_price_bdt', 12, 2)->default(0.00);
            $table->decimal('total_amount_bdt', 12, 2)->default(0.00);
            $table->decimal('discount_pct', 5, 2)->default(0.00);
            $table->decimal('discount_amount_bdt', 12, 2)->default(0.00);
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_region')->nullable();
            $table->string('sales_channel')->nullable();
            $table->uuid('promo_event_id')->nullable();
            $table->enum('priority', [
                'normal',
                'high',
                'urgent',
            ])->default('normal');
            $table->enum('status', [
                'pending',
                'confirmed',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
                'returned',
            ])->default('pending');
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('order_date');
            $table->index('status');
            $table->unique(['tenant_id', 'order_number'], 'sales_order_number_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
