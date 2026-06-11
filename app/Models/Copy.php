<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Copy extends Model
{
    protected $fillable = [
        'market_id',
        'copy_key',
        'copy_text',
        'category',
        'shot',
        'brand',
        'requires_disclaimer',
        'source_row',
    ];

    protected function casts(): array
    {
        return [
            'copy_text' => 'array',
            'requires_disclaimer' => 'boolean',
        ];
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }
}
