<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create default tenant
        $tenant = Tenant::create([
            'name' => 'TrimedCast Demo',
            'slug' => 'trimedcast-demo',
            'domain' => null,
            'subscription_tier' => 'enterprise',
            'subscription_status' => 'active',
            'subscription_expires_at' => now()->addYear(),
            'max_skus' => 5000,
            'max_users' => 50,
            'settings' => [
                'currency' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'date_format' => 'Y-m-d',
                'fiscal_year_start' => 'July',
            ],
        ]);

        // Create super admin user
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'System Admin',
            'email' => 'admin@trimedcast.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        // Create demo manager
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo Manager',
            'email' => 'manager@trimedcast.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'is_active' => true,
        ]);

        // Create demo analyst
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo Analyst',
            'email' => 'analyst@trimedcast.com',
            'password' => Hash::make('password'),
            'role' => 'analyst',
            'is_active' => true,
        ]);
    }
}
