<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('code')->unique();
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Bangladesh');
            $table->enum('supplier_type', ['local', 'international', 'chinese', 'japanese', 'indian', 'thai'])->default('local');
            $table->integer('avg_lead_time_days')->default(7);
            $table->integer('min_lead_time_days')->default(3);
            $table->integer('max_lead_time_days')->default(14);
            $table->decimal('lead_time_std_dev', 5, 2)->default(2.00);
            $table->decimal('reliability_score', 3, 2)->default(0.80);
            $table->decimal('fill_rate', 5, 2)->default(85.00);
            $table->decimal('on_time_delivery_rate', 5, 2)->default(80.00);
            $table->decimal('quality_score', 5, 2)->default(90.00);
            $table->jsonb('payment_terms')->default('{}');
            $table->jsonb('cny_risk_profile')->default('{}');
            $table->boolean('is_cny_affected')->default(false);
            $table->string('cny_holiday_period')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
