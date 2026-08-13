<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'tenant'])->prefix('v1')->group(function () {
    // API routes will be registered here
});
