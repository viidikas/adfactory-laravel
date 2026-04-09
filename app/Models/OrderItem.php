<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'clip_id',
        'clip_name',
        'slate',
        'category',
        'actor',
        'copy_key',
        'copy_text',
        'langs',
        'designs',
    ];

    protected function casts(): array
    {
        return [
            'copy_text' => 'array',
            'langs' => 'array',
            'designs' => 'array',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
