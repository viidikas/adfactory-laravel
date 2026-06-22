<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivered_clips', function (Blueprint $table) {
            $table->id();
            // Market the creative belongs to — clips vanish with the market.
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // Storage path on the NON-public `local` disk (storage/app/private).
            $table->string('file_path');
            $table->bigInteger('file_size')->default(0);
            // "16:9" | "1:1" | "9:16" | "4:5" — nullable.
            $table->string('format')->nullable();
            $table->string('thumbnail_path')->nullable();
            // The order this creative fulfils (orders use UUID ids). Keep the clip
            // if the order is deleted — just drop the link.
            $table->foreignUuid('order_id')->nullable()->constrained()->nullOnDelete();
            // Admin who uploaded it. Keep the clip if the user is removed.
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('market_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivered_clips');
    }
};
