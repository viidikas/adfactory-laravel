<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only audit trail of every confirmation lifecycle event. This is
        // the legal record of who confirmed what content, and when it was
        // invalidated. Rows are never updated or deleted by the application.
        Schema::create('market_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            // Null for automated events (invalidated_by_sync).
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // confirmed | invalidated_by_sync | manually_revoked
            $table->string('action');
            // The market content_hash at the moment of the event.
            $table->string('content_hash')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_confirmations');
    }
};
