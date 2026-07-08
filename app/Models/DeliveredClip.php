<?php

namespace App\Models;

use App\Services\ClipParser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveredClip extends Model
{
    /** Legal review states. A clip is only downloadable when APPROVED. */
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_DECLINED = 'declined';

    protected $fillable = [
        'market_id',
        'name',
        'brand',
        'lang',
        'slate',
        'actor',
        'design',
        'copy',
        'file_path',
        'file_size',
        'format',
        'thumbnail_path',
        'order_id',
        'uploaded_by',
        'upload_batch_id',
        'creative_key',
        'review_status',
        'reviewed_by',
        'reviewed_at',
        'decline_reason',
        'ad_title',
        'ad_description',
    ];

    protected $attributes = [
        'review_status' => self::STATUS_PENDING,
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function isApproved(): bool
    {
        return $this->review_status === self::STATUS_APPROVED;
    }

    public function isDeclined(): bool
    {
        return $this->review_status === self::STATUS_DECLINED;
    }

    /**
     * The "creative" a clip belongs to: its filename with the trailing format
     * token removed, so all formats of one creative share a key. Delegates to
     * {@see ClipParser::creativeKey()} — the single home for Templater filename
     * logic.
     */
    public static function creativeKey(?string $name): string
    {
        return ClipParser::creativeKey($name);
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** Alias of uploadedBy() (spec name). */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** Append-only audit trail of legal decisions. */
    public function reviews(): HasMany
    {
        return $this->hasMany(DeliveredClipReview::class);
    }

    /**
     * Parse a rendered clip's filename (no extension) into its metadata.
     * Delegates to {@see ClipParser::parseRendered()} — the single home for
     * Templater filename logic.
     *
     * @return array{brand:?string,lang:?string,copy:?string,slate:?string,actor:?string,design:?string,format:?string}
     */
    public static function parseFilename(string $nameNoExt): array
    {
        return ClipParser::parseRendered($nameNoExt);
    }

    /**
     * Slugify a copy line the way the Templater does when it names outputs.
     * Delegates to {@see ClipParser::slugifyCopy()} — the single home for
     * Templater filename logic.
     */
    public static function slugifyCopy(?string $copy): string
    {
        return ClipParser::slugifyCopy($copy);
    }
}
