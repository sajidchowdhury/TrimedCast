<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetTenantId
{
    /**
     * Handle an incoming request.
     *
     * Resolves the tenant from the authenticated user and sets it
     * in the application container so that the TenantScope can
     * filter queries appropriately.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip tenant resolution for unauthenticated requests
        if (!Auth::check()) {
            return $next($request);
        }

        $user = Auth::user();

        // Verify the user has a tenant assigned
        if (empty($user->tenant_id)) {
            Auth::logout();
            return redirect()->route('login')
                ->with('error', 'Your account is not associated with any organization.');
        }

        // Verify the tenant is active
        $tenant = $user->tenant;

        if (!$tenant) {
            Auth::logout();
            return redirect()->route('login')
                ->with('error', 'Organization not found.');
        }

        if ($tenant->trashed()) {
            Auth::logout();
            return redirect()->route('login')
                ->with('error', 'This organization has been deactivated.');
        }

        // Check subscription status
        if (in_array($tenant->subscription_status, ['past_due', 'cancelled'])) {
            // Allow access to billing/settings routes
            if (!$request->is('api/v1/billing/*') && !$request->is('api/v1/subscription/*')) {
                return response()->json([
                    'message' => 'Subscription is ' . $tenant->subscription_status . '. Please update your billing information.',
                    'subscription_status' => $tenant->subscription_status,
                ], 402);
            }
        }

        // Set tenant in the container for global access
        app()->instance('current_tenant', $tenant);
        app()->instance('current_tenant_id', $tenant->id);

        // Set tenant ID in request for easy access
        $request->attributes->set('tenant', $tenant);
        $request->attributes->set('tenant_id', $tenant->id);

        return $next($request);
    }
}
