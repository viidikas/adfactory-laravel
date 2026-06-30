<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Legal review gate for delivered clips. A clip is only downloadable by leads
     * once review_status = approved — independent of market/copy confirmation.
     * Stored as a string (pending|approved|declined) rather than a DB enum to
     * avoid Postgres enum-alter friction; the values are enforced in the app.
     */
    public function up(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->string('review_status')->default('pending')->after('uploaded_by');
            $table->foreignId('reviewed_by')->nullable()->after('review_status')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->text('decline_reason')->nullable()->after('reviewed_at');
            $table->index('review_status');
        });
    }

    public function down(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_status', 'reviewed_at', 'decline_reason']);
        });
    }
};
