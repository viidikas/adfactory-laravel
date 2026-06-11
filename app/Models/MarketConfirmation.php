<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit record of a market confirmation lifecycle event.
 * The application never updates or deletes these rows.
 */
class MarketConfirmation extends Model
{
    public const ACTION_CONFIRMED = 'confirmed';
    public const ACTION_INVALIDATED_BY_SYNC = 'invalidated_by_sync';
    public const ACTION_MANUALLY_REVOKED = 'manually_revoked';

    protected $fillable = [
        'market_id',
        'user_id',
        'action',
        'content_hash',
    ];

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
