<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit row for a change to the legal-review module switch. One row
 * per actual flip: who ({@see $user_id}), when ({@see $created_at}), and the
 * old→new value ({@see $previous_enabled} → {@see $enabled}). Never updated.
 */
class LegalReviewAudit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'previous_enabled',
        'enabled',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_enabled' => 'boolean',
            'enabled' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
