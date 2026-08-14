<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('action');  // e.g., 'created', 'updated', 'deleted', 'exported'
            $table->string('subject_type');  // e.g., 'App\Models\Product'
            $table->uuid('subject_id')->nullable();
            $table->jsonb('previous_value')->default('{}');
            $table->jsonb('new_value')->default('{}');
            $table->jsonb('changed_fields')->default('[]');
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('request_url')->nullable();
            $table->string('request_method')->nullable();
            $table->enum('severity', [
                'info',
                'warning',
                'critical',
            ])->default('info');
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('user_id');
            $table->index('subject_type');
            $table->index('subject_id');
            $table->index('action');
            $table->index('created_at');
            $table->index(['subject_type', 'subject_id'], 'audit_subject_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_log');
    }
};
