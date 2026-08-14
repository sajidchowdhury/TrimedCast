<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();
            $table->enum('subscription_tier', ['starter', 'pro', 'enterprise'])->default('starter');
            $table->enum('subscription_status', ['trial', 'active', 'past_due', 'cancelled'])->default('trial');
            $table->timestamp('subscription_expires_at')->nullable();
            $table->integer('max_skus')->default(500);
            $table->integer('max_users')->default(5);
            $table->jsonb('settings')->default('{}');
            $table->string('stripe_id')->nullable();
            $table->string('pm_type')->nullable();
            $table->string('pm_last_four', 4)->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
