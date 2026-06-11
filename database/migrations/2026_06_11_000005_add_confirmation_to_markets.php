<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('markets', function (Blueprint $table) {
            // Deterministic hash of the market's current synced copy set
            // (copy_keys + copy_text + per-copy disclaimer flag). Recomputed on
            // every sync; compared against confirmed_hash to detect changes.
            $table->string('content_hash')->nullable()->after('has_disclaimer');
            // Legal confirmation that the synced copies match the approved sheet.
            $table->timestamp('confirmed_at')->nullable()->after('content_hash');
            $table->foreignId('confirmed_by')->nullable()->after('confirmed_at')->constrained('users')->nullOnDelete();
            // The content_hash that was confirmed; if it later diverges from
            // content_hash, the confirmation is stale/invalid.
            $table->string('confirmed_hash')->nullable()->after('confirmed_by');
        });
    }

    public function down(): void
    {
        Schema::table('markets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confirmed_by');
            $table->dropColumn(['content_hash', 'confirmed_at', 'confirmed_hash']);
        });
    }
};
