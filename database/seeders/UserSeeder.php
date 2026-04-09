<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Viljar Särekanno', 'email' => 'viljar.sarekanno@creditstar.com', 'role' => 'admin', 'market' => null],
            ['name' => 'Growth Lead EE', 'email' => 'growth.ee@creditstar.com', 'role' => 'growth_lead', 'market' => 'EE'],
            ['name' => 'Growth Lead FI', 'email' => 'growth.fi@creditstar.com', 'role' => 'growth_lead', 'market' => 'FI'],
            ['name' => 'Growth Lead PL', 'email' => 'growth.pl@creditstar.com', 'role' => 'growth_lead', 'market' => 'PL'],
            ['name' => 'Growth Lead DK', 'email' => 'growth.dk@creditstar.com', 'role' => 'growth_lead', 'market' => 'DK'],
            ['name' => 'Growth Lead ES', 'email' => 'growth.es@creditstar.com', 'role' => 'growth_lead', 'market' => 'ES'],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'role' => $userData['role'],
                    'market' => $userData['market'],
                ]
            );
        }
    }
}
