<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Market extends Model
{
    protected $fillable = [
        'code',
        'name',
        'brand',
        'sheet_tab',
        'has_disclaimer',
        'active',
        'activated_at',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'has_disclaimer' => 'boolean',
            'active' => 'boolean',
            'activated_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    /**
     * Canonical market list used by the seeder. Markets are created INACTIVE;
     * an admin prepares and reviews each one, then explicitly enables it.
     *
     * @return array<int, array{code: string, name: string, brand: string}>
     */
    public static function canonical(): array
    {
        return [
            // Creditstar — one market per country.
            ['code' => 'EE', 'name' => 'Estonia', 'brand' => 'Creditstar'],
            ['code' => 'FI', 'name' => 'Finland', 'brand' => 'Creditstar'],
            ['code' => 'ES', 'name' => 'Spain', 'brand' => 'Creditstar'],
            ['code' => 'CZ', 'name' => 'Czechia', 'brand' => 'Creditstar'],
            ['code' => 'PL', 'name' => 'Poland', 'brand' => 'Creditstar'],
            ['code' => 'SE', 'name' => 'Sweden', 'brand' => 'Creditstar'],
            ['code' => 'DK', 'name' => 'Denmark', 'brand' => 'Creditstar'],
            ['code' => 'UK', 'name' => 'United Kingdom', 'brand' => 'Creditstar'],
            // Monefit — operates EEA-wide, primarily in English: one market.
            ['code' => 'EEA', 'name' => 'Monefit EEA', 'brand' => 'Monefit'],
        ];
    }

    public function copies(): HasMany
    {
        return $this->hasMany(Copy::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /**
     * Whether the market is review-ready and may be enabled: it must have at
     * least one synced copy and a Disclaimer column in its tab.
     */
    public function isReviewReady(): bool
    {
        return $this->has_disclaimer && $this->copies()->exists();
    }
}
