<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveredClip extends Model
{
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
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
        ];
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

    /**
     * Parse a rendered clip's filename (no extension) into its metadata. The
     * Templater names outputs brand_lang_copyslug_slate_actor_design_format —
     * the copy slug can span several tokens, e.g.
     * "Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9". Each field is
     * matched by pattern, so a non-standard or partial name still yields whatever
     * is recognisable. The `format` here is a fallback when the video can't be
     * probed for its true dimensions.
     *
     * @return array{brand:?string,lang:?string,copy:?string,slate:?string,actor:?string,design:?string,format:?string}
     */
    public static function parseFilename(string $nameNoExt): array
    {
        $out = ['brand' => null, 'lang' => null, 'copy' => null, 'slate' => null, 'actor' => null, 'design' => null, 'format' => null];
        $tokens = array_values(array_filter(explode('_', $nameNoExt), fn ($t) => $t !== ''));
        if (! $tokens) {
            return $out;
        }

        $formatMap = ['16x9' => '16:9', '1x1' => '1:1', '9x16' => '9:16', '4x5' => '4:5', '4x5v1' => '4:5', '4x5v2' => '4:5'];

        // brand — only when the first token is a brand we know.
        if (in_array(strtolower($tokens[0]), ['creditstar', 'monefit'], true)) {
            $out['brand'] = ucfirst(strtolower($tokens[0]));
        }

        // format — a known format token (scan from the end).
        foreach (array_reverse($tokens) as $tok) {
            if (isset($formatMap[strtolower($tok)])) {
                $out['format'] = $formatMap[strtolower($tok)];
                break;
            }
        }

        // design — design1 / d1.
        foreach ($tokens as $tok) {
            if (preg_match('/^design\d+$/i', $tok)) {
                $out['design'] = strtolower($tok);
                break;
            }
            if (preg_match('/^d\d+$/i', $tok)) {
                $out['design'] = 'design'.substr($tok, 1);
                break;
            }
        }

        // slate — 2–4 letters then digits (PU8, TH1, LE12), never a format token.
        $slateIdx = null;
        foreach ($tokens as $i => $tok) {
            if (preg_match('/^[A-Za-z]{2,4}\d+$/', $tok) && ! isset($formatMap[strtolower($tok)])) {
                $out['slate'] = strtoupper($tok);
                $slateIdx = $i;
                break;
            }
        }

        // lang — the 2–3 letter token right after the brand (FI, EN, ES…).
        $langIdx = null;
        if (isset($tokens[1]) && preg_match('/^[A-Za-z]{2,3}$/', $tokens[1])) {
            $out['lang'] = strtoupper($tokens[1]);
            $langIdx = 1;
        }

        // actor — the token immediately after the slate (before design/format).
        if ($slateIdx !== null && isset($tokens[$slateIdx + 1])) {
            $cand = $tokens[$slateIdx + 1];
            if (! preg_match('/^design\d+$/i', $cand) && ! preg_match('/^d\d+$/i', $cand) && ! isset($formatMap[strtolower($cand)])) {
                $out['actor'] = $cand;
            }
        }

        // copy slug — everything between the lang (or brand) and the slate.
        $start = $langIdx !== null ? $langIdx + 1 : ($out['brand'] ? 1 : 0);
        $end = $slateIdx ?? count($tokens);
        if ($end > $start) {
            $out['copy'] = implode(' ', array_slice($tokens, $start, $end - $start));
        }

        return $out;
    }

    /**
     * Slugify a copy line the way the Templater does when it names outputs:
     * strip non-alphanumerics (so "Päätä" → "Pt"), then up to 3 words / 18 chars
     * joined by underscores. Used to match a clip's parsed copy slug back to the
     * full copy text. Mirrors slugifyCopy() in resources/js/lib/templater.js.
     */
    public static function slugifyCopy(?string $copy): string
    {
        if (! $copy) {
            return '';
        }
        $clean = trim(preg_replace('/[^a-zA-Z0-9\s]/', '', $copy));
        $words = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (! $words) {
            return '';
        }

        $slug = '';
        $count = 0;
        foreach ($words as $word) {
            if ($count >= 3) {
                break;
            }
            $next = $slug !== '' ? $slug.'_'.$word : $word;
            if (strlen($next) > 18) {
                break;
            }
            $slug = $next;
            $count++;
        }

        return $slug !== '' ? $slug : substr($words[0], 0, 18);
    }
}
