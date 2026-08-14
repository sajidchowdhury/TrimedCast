<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ========================================
        // FOREIGN KEY CONSTRAINTS
        // ========================================

        // Users -> Tenants
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });

        // Motorcycle Models -> Tenants
        Schema::table('motorcycle_models', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });

        // Suppliers -> Tenants
        Schema::table('suppliers', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });

        // Products -> Tenants, Suppliers, MotorcycleModels
        Schema::table('products', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->onDelete('restrict');
            $table->foreign('motorcycle_model_id')
                ->references('id')
                ->on('motorcycle_models')
                ->onDelete('set null');
        });

        // Inventory -> Tenants, Products
        Schema::table('inventory', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
        });

        // Forecast Settings -> Tenants, Products
        Schema::table('forecast_settings', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
        });

        // SOP Cycles -> Tenants
        Schema::table('sop_cycles', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('approved_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        // Promo Events -> Tenants
        Schema::table('promo_events', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });

        // Forecasts -> Tenants, Products, ForecastSettings
        Schema::table('forecasts', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
            $table->foreign('forecast_setting_id')
                ->references('id')
                ->on('forecast_settings')
                ->onDelete('cascade');
        });

        // Sales Orders -> Tenants, Products
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('restrict');
            $table->foreign('promo_event_id')
                ->references('id')
                ->on('promo_events')
                ->onDelete('set null');
        });

        // Purchase Orders -> Tenants, Products, Suppliers
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('restrict');
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->onDelete('restrict');
        });

        // Recommended Orders -> Tenants, Products, Suppliers
        Schema::table('recommended_orders', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->onDelete('cascade');
            $table->foreign('forecast_id')
                ->references('id')
                ->on('forecasts')
                ->onDelete('set null');
            $table->foreign('sop_cycle_id')
                ->references('id')
                ->on('sop_cycles')
                ->onDelete('set null');
            $table->foreign('reviewed_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        // Data Imports -> Tenants, Users
        Schema::table('data_imports', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });

        // Audit Log -> Tenants
        Schema::table('audit_log', function (Blueprint $table) {
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });

        // ========================================
        // CHECK CONSTRAINTS (Raw PostgreSQL)
        // ========================================

        \DB::statement("
            ALTER TABLE products
            ADD CONSTRAINT chk_seasonal_weights_positive
            CHECK (
                seasonal_weight_dry > 0
                AND seasonal_weight_pre_monsoon > 0
                AND seasonal_weight_monsoon > 0
                AND seasonal_weight_post_monsoon > 0
            )
        ");

        \DB::statement("
            ALTER TABLE products
            ADD CONSTRAINT chk_selling_price_gte_cost
            CHECK (selling_price_bdt >= 0 AND unit_cost_bdt >= 0)
        ");

        \DB::statement("
            ALTER TABLE inventory
            ADD CONSTRAINT chk_qty_on_hand_non_negative
            CHECK (qty_on_hand >= 0 AND qty_reserved >= 0 AND qty_on_order >= 0)
        ");

        \DB::statement("
            ALTER TABLE forecast_settings
            ADD CONSTRAINT chk_alpha_range
            CHECK (alpha > 0 AND alpha < 1)
        ");

        \DB::statement("
            ALTER TABLE forecast_settings
            ADD CONSTRAINT chk_beta_range
            CHECK (beta >= 0 AND beta < 1)
        ");

        \DB::statement("
            ALTER TABLE forecast_settings
            ADD CONSTRAINT chk_gamma_range
            CHECK (gamma >= 0 AND gamma < 1)
        ");

        \DB::statement("
            ALTER TABLE suppliers
            ADD CONSTRAINT chk_reliability_score_range
            CHECK (reliability_score >= 0 AND reliability_score <= 1)
        ");

        \DB::statement("
            ALTER TABLE recommended_orders
            ADD CONSTRAINT chk_urgency_score_range
            CHECK (urgency_score >= 0 AND urgency_score <= 100)
        ");

        \DB::statement("
            ALTER TABLE recommended_orders
            ADD CONSTRAINT chk_stockout_probability_range
            CHECK (stockout_probability >= 0 AND stockout_probability <= 100)
        ");

        // ========================================
        // ADDITIONAL INDEXES
        // ========================================

        \DB::statement("
            CREATE INDEX idx_products_tenant_category
            ON products (tenant_id, category)
        ");

        \DB::statement("
            CREATE INDEX idx_products_tenant_abc_xyz
            ON products (tenant_id, abc_xyz_category)
        ");

        \DB::statement("
            CREATE INDEX idx_inventory_tenant_stock_status
            ON inventory (tenant_id, stock_status)
        ");

        \DB::statement("
            CREATE INDEX idx_forecasts_product_date_range
            ON forecasts (product_id, forecast_start_date, forecast_end_date)
        ");

        \DB::statement("
            CREATE INDEX idx_recommended_orders_tenant_urgency
            ON recommended_orders (tenant_id, urgency, order_trigger_date)
        ");

        \DB::statement("
            CREATE INDEX idx_audit_log_tenant_date
            ON audit_log (tenant_id, created_at DESC)
        ");

        \DB::statement("
            CREATE INDEX idx_purchase_orders_supplier_status
            ON purchase_orders (supplier_id, status)
        ");

        \DB::statement("
            CREATE INDEX idx_sales_orders_product_status
            ON sales_orders (product_id, status)
        ");
    }

    public function down(): void
    {
        // Drop additional indexes
        \DB::statement("DROP INDEX IF EXISTS idx_products_tenant_category");
        \DB::statement("DROP INDEX IF EXISTS idx_products_tenant_abc_xyz");
        \DB::statement("DROP INDEX IF EXISTS idx_inventory_tenant_stock_status");
        \DB::statement("DROP INDEX IF EXISTS idx_forecasts_product_date_range");
        \DB::statement("DROP INDEX IF EXISTS idx_recommended_orders_tenant_urgency");
        \DB::statement("DROP INDEX IF EXISTS idx_audit_log_tenant_date");
        \DB::statement("DROP INDEX IF EXISTS idx_purchase_orders_supplier_status");
        \DB::statement("DROP INDEX IF EXISTS idx_sales_orders_product_status");

        // Drop CHECK constraints
        \DB::statement("ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_seasonal_weights_positive");
        \DB::statement("ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_selling_price_gte_cost");
        \DB::statement("ALTER TABLE inventory DROP CONSTRAINT IF EXISTS chk_qty_on_hand_non_negative");
        \DB::statement("ALTER TABLE forecast_settings DROP CONSTRAINT IF EXISTS chk_alpha_range");
        \DB::statement("ALTER TABLE forecast_settings DROP CONSTRAINT IF EXISTS chk_beta_range");
        \DB::statement("ALTER TABLE forecast_settings DROP CONSTRAINT IF EXISTS chk_gamma_range");
        \DB::statement("ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_reliability_score_range");
        \DB::statement("ALTER TABLE recommended_orders DROP CONSTRAINT IF EXISTS chk_urgency_score_range");
        \DB::statement("ALTER TABLE recommended_orders DROP CONSTRAINT IF EXISTS chk_stockout_probability_range");

        // Drop foreign keys (order matters - child tables first)
        Schema::table('audit_log', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['user_id']);
        });

        Schema::table('data_imports', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['user_id']);
        });

        Schema::table('recommended_orders', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
            $table->dropForeign(['supplier_id']);
            $table->dropForeign(['forecast_id']);
            $table->dropForeign(['sop_cycle_id']);
            $table->dropForeign(['reviewed_by']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
            $table->dropForeign(['supplier_id']);
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
            $table->dropForeign(['promo_event_id']);
        });

        Schema::table('forecasts', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
            $table->dropForeign(['forecast_setting_id']);
        });

        Schema::table('promo_events', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
        });

        Schema::table('sop_cycles', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['approved_by']);
        });

        Schema::table('forecast_settings', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
        });

        Schema::table('inventory', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['product_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['supplier_id']);
            $table->dropForeign(['motorcycle_model_id']);
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
        });

        Schema::table('motorcycle_models', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
        });
    }
};
