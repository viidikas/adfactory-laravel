<?php

namespace Database\Seeders;

use App\Models\Market;
use Illuminate\Database\Seeder;

class MarketSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Market::canonical() as $market) {
            // Idempotent: create missing markets without disturbing existing ones
            // (so re-seeding never flips an admin-enabled market back to inactive).
            Market::firstOrCreate(
                ['code' => $market['code']],
                [
                    'name' => $market['name'],
                    'brand' => $market['brand'],
                    'sheet_tab' => $market['code'],
                    'active' => false,
                ]
            );
        }
    }
}
