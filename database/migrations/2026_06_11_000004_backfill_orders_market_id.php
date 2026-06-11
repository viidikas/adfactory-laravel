<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Match existing orders' legacy free-text `market` to markets.code.
        // No-op on a fresh database (no markets/orders yet); the same command can
        // be re-run by an operator after markets are seeded — it is idempotent and
        // only fills rows where market_id is still null. The legacy `market`
        // column is intentionally retained until the backfill is verified.
        if (Schema::hasTable('markets') && Schema::hasTable('orders')) {
            Artisan::call('orders:backfill-market');
        }
    }

    public function down(): void
    {
        // Backfill only populates a nullable column; nothing to reverse.
    }
};
