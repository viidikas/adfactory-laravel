<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('markets', function (Blueprint $table) {
            $table->id();
            // code matches the Google Sheet tab name (e.g. "FI", "EEA").
            $table->string('code')->unique();
            $table->string('name');
            // Brand-scoped markets: each market belongs to exactly one brand.
            // The order's brand is derived from its market, so the existing
            // dual-brand template logic (TEMPLATE_CS_ / TEMPLATE_MF_) is untouched.
            $table->string('brand', 20);
            // Defaults to `code`; admin may point a market at a differently named tab.
            $table->string('sheet_tab');
            // Set true during sync when the tab contains a Disclaimer (yes/no) column.
            // Gates activation together with copy count (review-ready check).
            $table->boolean('has_disclaimer')->default(false);
            // New markets are created INACTIVE and are invisible to growth leads
            // until an admin explicitly enables them.
            $table->boolean('active')->default(false);
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('markets');
    }
};
