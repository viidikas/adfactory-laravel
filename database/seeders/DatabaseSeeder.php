<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create default admin user
        User::firstOrCreate(
            ['email' => 'viljar.sarekanno@creditstar.com'],
            [
                'name' => 'Viljar Sarekanno',
                'role' => 'admin',
            ]
        );
    }
}
