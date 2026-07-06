<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ad wording, owned by growth leads (the content designer owns the video).
     * Editing an approved/declined clip's ad copy sends it back to legal review
     * (enforced in the controller). Both nullable — may be filled after upload.
     */
    public function up(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->string('ad_title', 200)->nullable()->after('decline_reason');
            $table->text('ad_description')->nullable()->after('ad_title');
        });
    }

    public function down(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->dropColumn(['ad_title', 'ad_description']);
        });
    }
};
