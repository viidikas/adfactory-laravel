<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit row for a legal decision on a delivered clip. One row is
 * written on every approve, decline, and reset_by_reupload. Never updated.
 */
class DeliveredClipReview extends Model
{
    public const ACTION_APPROVED = 'approved';
    public const ACTION_DECLINED = 'declined';
    public const ACTION_RESET = 'reset_by_reupload';

    protected $fillable = [
        'delivered_clip_id',
        'user_id',
        'action',
        'reason',
    ];

    public function deliveredClip(): BelongsTo
    {
        return $this->belongsTo(DeliveredClip::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
