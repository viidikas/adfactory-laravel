<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only audit of every flip of the legal-review module switch. Turning a
 * compliance control on/off must be traceable: who changed it, when, and the
 * old→new value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_review_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('previous_enabled');
            $table->boolean('enabled');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_review_audits');
    }
};
