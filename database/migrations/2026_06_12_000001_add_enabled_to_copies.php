<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('copies', function (Blueprint $table) {
            // Per-copy enablement is the live-gate: only enabled copies are shown
            // to growth leads and allowed in orders. Defaults OFF; an admin ticks
            // copies on the Copies admin page. Reset to OFF on content change.
            $table->boolean('enabled')->default(false)->after('requires_disclaimer');
            $table->timestamp('enabled_at')->nullable()->after('enabled');
            $table->foreignId('enabled_by')->nullable()->after('enabled_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('copies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('enabled_by');
            $table->dropColumn(['enabled', 'enabled_at']);
        });
    }
};
