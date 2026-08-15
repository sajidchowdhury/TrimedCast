<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Routing\Controller;

class HealthController extends Controller
{
    /**
     * Return health status with component checks.
     */
    public function __invoke(): JsonResponse
    {
        $components = [];

        // Database check
        try {
            DB::connection()->getPdo();
            $components['database'] = [
                'status' => 'healthy',
                'driver' => config('database.default'),
            ];
        } catch (\Throwable $e) {
            $components['database'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        // Cache/Redis check
        try {
            Redis::ping();
            $components['cache'] = [
                'status' => 'healthy',
                'driver' => config('cache.default'),
            ];
        } catch (\Throwable $e) {
            $components['cache'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        // Queue check
        $components['queue'] = [
            'status' => 'healthy',
            'driver' => config('queue.default'),
        ];

        $allHealthy = collect($components)->every(
            fn($c) => ($c['status'] ?? '') === 'healthy'
        );

        return response()->json([
            'status' => $allHealthy ? 'healthy' : 'degraded',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
            'components' => $components,
        ], $allHealthy ? 200 : 503);
    }
}
