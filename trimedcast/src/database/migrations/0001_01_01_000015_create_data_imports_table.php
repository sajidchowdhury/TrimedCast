<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->string('filename');
            $table->string('original_filename');
            $table->string('file_path');
            $table->integer('file_size_bytes');
            $table->string('mime_type');
            $table->enum('import_type', [
                'sales_history',
                'purchase_history',
                'inventory_snapshot',
                'product_catalog',
                'supplier_catalog',
                'forecast_update',
            ]);
            $table->enum('format', ['csv', 'xlsx', 'json'])->default('csv');

            // Processing status
            $table->enum('status', [
                'uploaded',
                'validating',
                'processing',
                'completed',
                'failed',
                'partially_completed',
            ])->default('uploaded');

            // Row tracking
            $table->integer('total_rows')->default(0);
            $table->integer('processed_rows')->default(0);
            $table->integer('successful_rows')->default(0);
            $table->integer('failed_rows')->default(0);
            $table->integer('skipped_rows')->default(0);
            $table->integer('duplicate_rows')->default(0);

            // Validation results
            $table->jsonb('validation_errors')->default('[]');
            $table->jsonb('column_mapping')->default('{}');
            $table->jsonb('import_summary')->default('{}');

            // Processing metadata
            $table->integer('processing_time_ms')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('error_message')->nullable();
            $table->jsonb('metadata')->default('{}');

            $table->timestamps();

            $table->index('tenant_id');
            $table->index('user_id');
            $table->index('import_type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_imports');
    }
};
