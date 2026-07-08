<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * The legal clip-review module switch. When ENABLED, legal approval gates clip
 * downloads (the two-gate compliance model) and the whole legal surface — role,
 * /legal route, review queue, approve/decline — is active. When DISABLED, that
 * entire layer is dormant: downloads are no longer gated by review_status, the
 * legal surface is hidden, and growth leads own their own compliance. All legal
 * code stays in the repo; flipping this back ON fully restores prior behavior.
 *
 * Persisted like other admin settings (settings table), read app-wide through
 * enabled(), and cached; setEnabled() busts the cache so a toggle takes effect
 * live. Defaults OFF when the setting has never been written.
 */
class LegalReview
{
    private const SETTING_KEY = 'legal_review_enabled';

    private const CACHE_KEY = 'legal_review_enabled';

    /** Whether the legal clip-review module is currently active. Defaults OFF. */
    public static function enabled(): bool
    {
        return (bool) Cache::rememberForever(self::CACHE_KEY, function () {
            $raw = Setting::get(self::SETTING_KEY, null);

            // Never configured → module is OFF by default.
            return $raw === null ? false : filter_var($raw, FILTER_VALIDATE_BOOLEAN);
        });
    }

    /** Persist the new state and bust the cache so it takes effect immediately. */
    public static function setEnabled(bool $on): void
    {
        Setting::set(self::SETTING_KEY, $on ? '1' : '0');
        Cache::forget(self::CACHE_KEY);
    }

    /** Drop any cached value (e.g. after a direct settings change in tests). */
    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
