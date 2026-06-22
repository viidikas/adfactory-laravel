<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Market extends Model
{
    protected $fillable = [
        'code',
        'name',
        'brand',
        'sheet_tab',
        'has_disclaimer',
        'content_hash',
        'confirmed_at',
        'confirmed_by',
        'confirmed_hash',
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
            'confirmed_at' => 'datetime',
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

    public function deliveredClips(): HasMany
    {
        return $this->hasMany(DeliveredClip::class);
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(MarketConfirmation::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /**
     * Deterministic hash of the market's current copy set: the legally-reviewed
     * content. Built from copies ordered by copy_key, each contributing its
     * copy_key, language-sorted copy_text, and per-copy disclaimer flag. Any
     * change to copy text, keys, or disclaimer flags changes the hash.
     */
    public function computeContentHash(): string
    {
        $payload = $this->copies()
            ->orderBy('copy_key')
            ->get(['copy_key', 'copy_text', 'requires_disclaimer'])
            ->map(function (Copy $c) {
                $text = $c->copy_text ?? [];
                ksort($text);

                return [
                    'copy_key' => $c->copy_key,
                    'copy_text' => $text,
                    'disclaimer' => (bool) $c->requires_disclaimer,
                ];
            })
            ->all();

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE));
    }

    /**
     * Whether the market is review-ready and may be enabled: it must have at
     * least one synced copy and a Disclaimer column in its tab. (Confirmation
     * is a separate, additional gate — see isConfirmed().)
     */
    public function isReviewReady(): bool
    {
        return $this->has_disclaimer && $this->copies()->exists();
    }

    /**
     * Whether the market's copies are currently confirmed: a confirmation
     * exists and the confirmed hash still matches the current content hash.
     */
    public function isConfirmed(): bool
    {
        return $this->confirmed_at !== null
            && $this->confirmed_hash !== null
            && $this->confirmed_hash === $this->content_hash;
    }
}
