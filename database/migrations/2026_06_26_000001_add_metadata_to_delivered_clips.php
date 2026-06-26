<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Metadata extracted from the rendered clip's filename on upload
     * (brand_lang_copyslug_slate_actor_design_format), so a batch of delivered
     * clips self-describes without manual entry. `format` already exists.
     */
    public function up(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->string('brand')->nullable()->after('name');
            $table->string('lang')->nullable()->after('brand');
            $table->string('slate')->nullable()->after('lang');
            $table->string('actor')->nullable()->after('slate');
            $table->string('design')->nullable()->after('actor');
            // The copy slug parsed from the filename (e.g. "Suunnittele Pt Hae").
            $table->string('copy')->nullable()->after('design');
        });
    }

    public function down(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->dropColumn(['brand', 'lang', 'slate', 'actor', 'design', 'copy']);
        });
    }
};
