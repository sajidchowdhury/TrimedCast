<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

// Health check – public, no auth required
Route::get('v1/health', HealthController::class);

Route::middleware(['auth:sanctum', 'tenant'])->prefix('v1')->group(function () {
    // API routes will be registered here
});
