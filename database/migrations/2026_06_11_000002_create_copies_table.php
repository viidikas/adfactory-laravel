<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('copies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            $table->string('copy_key');
            // Keyed by language, e.g. {"en": "...", "et": "...", ...} — as today.
            $table->json('copy_text');
            // Category + shot retained from the sheet so the copy picker can match
            // copies to a clip's category / slate (existing parsing conventions).
            $table->string('category')->nullable();
            $table->string('shot')->nullable();
            // Brand retained from the sheet row for fidelity; market scoping is the
            // primary filter (a market's tab is single-brand).
            $table->string('brand')->nullable();
            // From the tab's Disclaimer (yes/no) column: whether After Effects should
            // overlay this market's disclaimer image on clips using this copy.
            $table->boolean('requires_disclaimer')->default(false);
            $table->integer('source_row')->nullable();
            $table->timestamps();

            $table->unique(['market_id', 'copy_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('copies');
    }
};
