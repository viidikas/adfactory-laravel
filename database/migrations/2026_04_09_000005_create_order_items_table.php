<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->string('clip_id');
            $table->string('clip_name');
            $table->string('slate');
            $table->string('category');
            $table->string('actor');
            $table->string('copy_key');
            $table->json('copy_text')->nullable();
            $table->json('langs');
            $table->json('designs');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
