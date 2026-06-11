<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Nullable for now: legacy rows are backfilled by matching the old
            // free-text `market` string to markets.code. The old column is kept
            // until the backfill is verified. New orders always set market_id.
            $table->foreignId('market_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            // Snapshot of the copy's disclaimer flag at order time. Growth leads
            // cannot edit it; it is derived server-side from the copy.
            $table->boolean('requires_disclaimer')->default(false)->after('copy_text');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('requires_disclaimer');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('market_id');
        });
    }
};
