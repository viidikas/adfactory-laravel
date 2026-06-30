<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only audit trail of every legal decision on a delivered clip:
     * approved, declined, and reset_by_reupload (when an admin replaces the
     * video and the prior decision is invalidated). Rows are never updated.
     */
    public function up(): void
    {
        Schema::create('delivered_clip_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivered_clip_id')->constrained()->cascadeOnDelete();
            // Who acted. Kept (nullable) if the user is later removed, so the
            // trail survives.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action'); // approved | declined | reset_by_reupload
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index('delivered_clip_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivered_clip_reviews');
    }
};
