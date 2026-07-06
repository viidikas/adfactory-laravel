<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Format tokens that trail a rendered filename (mirrors parseFilename). */
    private const FORMAT_TOKENS = ['16x9', '1x1', '9x16', '4x5', '4x5v1', '4x5v2'];

    /**
     * Batch identity for delivered clips:
     *  - upload_batch_id: one id shared by every clip created in a single
     *    storeBatch() call (null for single uploads / pre-existing rows).
     *  - creative_key: the filename with the trailing format token removed, so
     *    all formats of one creative group together. Populated on create and
     *    backfilled here for existing rows.
     */
    public function up(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->string('upload_batch_id')->nullable()->after('uploaded_by');
            $table->string('creative_key')->nullable()->after('upload_batch_id');
            $table->index('upload_batch_id');
            $table->index('creative_key');
        });

        // Backfill creative_key for existing rows (batch id stays null).
        foreach (DB::table('delivered_clips')->select('id', 'name')->get() as $row) {
            DB::table('delivered_clips')->where('id', $row->id)
                ->update(['creative_key' => $this->creativeKey((string) $row->name)]);
        }
    }

    private function creativeKey(string $name): string
    {
        $tokens = explode('_', $name);
        if (count($tokens) > 1 && in_array(strtolower((string) end($tokens)), self::FORMAT_TOKENS, true)) {
            array_pop($tokens);

            return implode('_', $tokens);
        }

        return $name;
    }

    public function down(): void
    {
        Schema::table('delivered_clips', function (Blueprint $table) {
            $table->dropIndex(['upload_batch_id']);
            $table->dropIndex(['creative_key']);
            $table->dropColumn(['upload_batch_id', 'creative_key']);
        });
    }
};
