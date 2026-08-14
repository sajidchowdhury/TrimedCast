<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create the parent partitioned table
        Schema::create('purchase_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('supplier_id');
            $table->date('purchase_date');
            $table->integer('qty_purchased');
            $table->decimal('unit_cost_bdt', 12, 2)->default(0.00);
            $table->decimal('total_cost_bdt', 12, 2)->default(0.00);
            $table->string('purchase_order_number')->nullable();
            $table->enum('purchase_type', [
                'regular',
                'emergency',
                'cny_stock_up',
                'bulk_discount',
            ])->default('regular');
            $table->decimal('exchange_rate_usd_bdt', 10, 4)->nullable();
            $table->decimal('exchange_rate_cny_bdt', 10, 4)->nullable();
            $table->integer('lead_time_actual_days')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->integer('delivery_delay_days')->nullable();
            $table->enum('quality_status', [
                'pending_inspection',
                'accepted',
                'partial_reject',
                'rejected',
            ])->default('pending_inspection');
            $table->decimal('quality_reject_pct', 5, 2)->default(0.00);
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('supplier_id');
            $table->index('purchase_date');
        });

        // Convert to partitioned table using raw PostgreSQL
        $sql = <<<SQL
        -- Drop the regular table and recreate as partitioned
        DROP TABLE IF EXISTS purchase_history CASCADE;

        CREATE TABLE purchase_history (
            id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            product_id UUID NOT NULL,
            supplier_id UUID NOT NULL,
            purchase_date DATE NOT NULL,
            qty_purchased INTEGER NOT NULL,
            unit_cost_bdt NUMERIC(12,2) DEFAULT 0.00,
            total_cost_bdt NUMERIC(12,2) DEFAULT 0.00,
            purchase_order_number VARCHAR(255),
            purchase_type VARCHAR(20) DEFAULT 'regular' CHECK (purchase_type IN ('regular', 'emergency', 'cny_stock_up', 'bulk_discount')),
            exchange_rate_usd_bdt NUMERIC(10,4),
            exchange_rate_cny_bdt NUMERIC(10,4),
            lead_time_actual_days INTEGER,
            expected_delivery_date DATE,
            actual_delivery_date DATE,
            delivery_delay_days INTEGER,
            quality_status VARCHAR(20) DEFAULT 'pending_inspection' CHECK (quality_status IN ('pending_inspection', 'accepted', 'partial_reject', 'rejected')),
            quality_reject_pct NUMERIC(5,2) DEFAULT 0.00,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NULL,
            PRIMARY KEY (id, purchase_date)
        ) PARTITION BY RANGE (purchase_date);

        -- Create partitions by year
        CREATE TABLE purchase_history_2022 PARTITION OF purchase_history FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
        CREATE TABLE purchase_history_2023 PARTITION OF purchase_history FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
        CREATE TABLE purchase_history_2024 PARTITION OF purchase_history FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
        CREATE TABLE purchase_history_2025 PARTITION OF purchase_history FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
        CREATE TABLE purchase_history_2026 PARTITION OF purchase_history FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
        CREATE TABLE purchase_history_future PARTITION OF purchase_history FOR VALUES FROM ('2027-01-01') TO ('2030-01-01');

        -- Indexes
        CREATE INDEX idx_purchase_history_tenant ON purchase_history (tenant_id);
        CREATE INDEX idx_purchase_history_product ON purchase_history (product_id);
        CREATE INDEX idx_purchase_history_supplier ON purchase_history (supplier_id);
        CREATE INDEX idx_purchase_history_date ON purchase_history (purchase_date);
        CREATE INDEX idx_purchase_history_tenant_product_date ON purchase_history (tenant_id, product_id, purchase_date);
        SQL;

        \DB::statement($sql);
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_history');
    }
};
