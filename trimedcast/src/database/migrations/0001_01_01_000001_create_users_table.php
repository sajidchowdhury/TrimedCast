<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['super_admin', 'admin', 'manager', 'analyst', 'viewer'])->default('viewer');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->jsonb('settings')->default('{}');
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
