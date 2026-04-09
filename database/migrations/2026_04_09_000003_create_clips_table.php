<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clips', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('name_no_ext');
            $table->string('relative_path');
            $table->string('category')->nullable();
            $table->string('slate')->nullable();
            $table->string('slate_num')->nullable();
            $table->string('actor')->nullable();
            $table->string('version')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clips');
    }
};
