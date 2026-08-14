<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sop_cycles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->integer('year');
            $table->enum('cycle_type', ['monthly', 'quarterly', 'annual'])->default('monthly');
            $table->integer('cycle_number');  // e.g., month 1-12, quarter 1-4

            // 4-stage SOP process
            $table->enum('stage', [
                'data_gathering',
                'demand_planning',
                'supply_planning',
                'executive_review',
            ])->default('data_gathering');
            $table->timestamp('data_gathering_start')->nullable();
            $table->timestamp('data_gathering_end')->nullable();
            $table->timestamp('demand_planning_start')->nullable();
            $table->timestamp('demand_planning_end')->nullable();
            $table->timestamp('supply_planning_start')->nullable();
            $table->timestamp('supply_planning_end')->nullable();
            $table->timestamp('executive_review_start')->nullable();
            $table->timestamp('executive_review_end')->nullable();

            $table->enum('status', [
                'draft',
                'in_progress',
                'review',
                'approved',
                'rejected',
            ])->default('draft');

            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();

            // Consensus numbers
            $table->jsonb('demand_consensus')->default('{}');
            $table->jsonb('supply_consensus')->default('{}');
            $table->jsonb('variance_analysis')->default('{}');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'year', 'cycle_type', 'cycle_number'], 'sop_cycle_unique_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sop_cycles');
    }
};
