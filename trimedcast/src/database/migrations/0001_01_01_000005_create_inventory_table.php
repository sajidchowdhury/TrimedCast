<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->integer('qty_on_hand')->default(0);
            $table->integer('qty_reserved')->default(0);
            $table->integer('qty_on_order')->default(0);
            $table->integer('qty_in_transit')->default(0);
            $table->integer('qty_available')->storedAs('qty_on_hand - qty_reserved');
            $table->integer('qty_backordered')->default(0);
            $table->decimal('unit_cost_bdt', 12, 2)->default(0.00);
            $table->string('warehouse_location')->nullable();
            $table->string('bin_location')->nullable();
            $table->date('last_received_at')->nullable();
            $table->date('last_sold_at')->nullable();
            $table->integer('days_of_supply')->nullable();
            $table->enum('stock_status', [
                'in_stock',
                'low_stock',
                'out_of_stock',
                'overstock',
            ])->default('in_stock');
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'product_id'], 'inventory_product_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
