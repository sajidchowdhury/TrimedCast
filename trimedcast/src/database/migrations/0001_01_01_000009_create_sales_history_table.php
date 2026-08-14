<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create the parent partitioned table first
        Schema::create('sales_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('motorcycle_model_id')->nullable();
            $table->date('sale_date');
            $table->integer('qty_sold');
            $table->decimal('unit_price_bdt', 12, 2)->default(0.00);
            $table->decimal('total_revenue_bdt', 12, 2)->default(0.00);
            $table->string('sales_channel')->nullable();
            $table->string('customer_region')->nullable();
            $table->enum('sale_type', [
                'retail',
                'wholesale',
                'online',
                'workshop',
            ])->default('retail');
            $table->boolean('is_promo_sale')->default(false);
            $table->uuid('promo_event_id')->nullable();
            $table->string('invoice_number')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('sale_date');
            $table->index('motorcycle_model_id');
        });

        // Convert to partitioned table using raw PostgreSQL
        // We need to recreate the table as partitioned
        $sql = <<<SQL
        -- Drop the regular table and recreate as partitioned
        DROP TABLE IF EXISTS sales_history CASCADE;

        CREATE TABLE sales_history (
            id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            product_id UUID NOT NULL,
            motorcycle_model_id UUID,
            sale_date DATE NOT NULL,
            qty_sold INTEGER NOT NULL,
            unit_price_bdt NUMERIC(12,2) DEFAULT 0.00,
            total_revenue_bdt NUMERIC(12,2) DEFAULT 0.00,
            sales_channel VARCHAR(255),
            customer_region VARCHAR(255),
            sale_type VARCHAR(20) DEFAULT 'retail' CHECK (sale_type IN ('retail', 'wholesale', 'online', 'workshop')),
            is_promo_sale BOOLEAN DEFAULT FALSE,
            promo_event_id UUID,
            invoice_number VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NULL,
            PRIMARY KEY (id, sale_date)
        ) PARTITION BY RANGE (sale_date);

        -- Create partitions by year
        CREATE TABLE sales_history_2022 PARTITION OF sales_history FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
        CREATE TABLE sales_history_2023 PARTITION OF sales_history FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
        CREATE TABLE sales_history_2024 PARTITION OF sales_history FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
        CREATE TABLE sales_history_2025 PARTITION OF sales_history FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
        CREATE TABLE sales_history_2026 PARTITION OF sales_history FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
        CREATE TABLE sales_history_future PARTITION OF sales_history FOR VALUES FROM ('2027-01-01') TO ('2030-01-01');

        -- Indexes
        CREATE INDEX idx_sales_history_tenant ON sales_history (tenant_id);
        CREATE INDEX idx_sales_history_product ON sales_history (product_id);
        CREATE INDEX idx_sales_history_date ON sales_history (sale_date);
        CREATE INDEX idx_sales_history_motorcycle ON sales_history (motorcycle_model_id);
        CREATE INDEX idx_sales_history_tenant_product_date ON sales_history (tenant_id, product_id, sale_date);
        SQL;

        \DB::statement($sql);
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_history');
    }
};
