<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('motorcycle_models', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('brand');
            $table->integer('year');
            $table->integer('engine_cc')->nullable();
            $table->enum('category', [
                'commuter',
                'sports',
                'cruiser',
                'scooter',
                'off_road',
                'electric',
                'three_wheeler',
            ])->default('commuter');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'name', 'brand', 'year'], 'motorcycle_unique_constraint');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('motorcycle_models');
    }
};
