<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'market_id',
        'brand',
        'status',
        // Legacy free-text market label; retained until the market_id backfill is
        // verified. New orders set market_id (and keep `market` = market.code).
        'market',
        'note',
        'rendered_clips',
    ];

    protected function casts(): array
    {
        return [
            'rendered_clips' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
