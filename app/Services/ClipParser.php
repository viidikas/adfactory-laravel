<?php

namespace App\Services;

/**
 * The single authoritative home for parsing the two filename shapes this app
 * deals with. They are DISTINCT formats — do not conflate them:
 *
 *   1. Source library clips   — parse()         — "Category_Slate_Actor_Version"
 *      e.g. "Product Usage_8_Victoria" (the raw footage in the clip library).
 *
 *   2. Rendered Templater outputs — parseRendered() / creativeKey() —
 *      "brand_lang_copyslug_slate_actor_design_format", e.g.
 *      "Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9" (the delivered
 *      clips the Templater produces). slugifyCopy() mirrors how the Templater
 *      slugifies a copy line into that filename's copy tokens.
 *
 * Keeping both here means the token/format regexes live in one place and cannot
 * drift between the model and the controllers. DeliveredClip delegates to the
 * rendered-output methods.
 */
class ClipParser
{
    const VIDEO_EXTS = ['mov', 'mp4', 'm4v', 'avi', 'mxf', 'mkv', 'webm'];

    /**
     * Format tokens the Templater appends to a rendered filename, mapped to
     * their aspect ratio. Single source of truth for both parseRendered() (reads
     * the ratio) and creativeKey() (strips the token). Keep in sync with the
     * Templater's export naming.
     */
    const RENDERED_FORMAT_MAP = ['16x9' => '16:9', '1x1' => '1:1', '9x16' => '9:16', '4x5' => '4:5', '4x5v1' => '4:5', '4x5v2' => '4:5'];

    const CAT_SLUG_MAP = [
        'Product Usage' => 'PU',
        'Product_Usage' => 'PU',
        'Travel and Holiday' => 'TH',
        'Travel_and_Holiday' => 'TH',
        'Home Renovation' => 'HR',
        'Home_Renovation' => 'HR',
        'Lifestyle and Events' => 'LE',
        'Lifestyle_and_Events' => 'LE',
        'Electronics and Devices' => 'EG',
        'Electronics_and_Devices' => 'EG',
        'Financial Relief' => 'FR',
        'Financial_Relief' => 'FR',
    ];

    /**
     * Parse a clip filename and relative path into structured metadata.
     * Port of buildClipEntry() from adfactory-js/clips.js
     */
    public static function parse(string $filename, string $relativePath): array
    {
        $nameNoExt = preg_replace('/\.[^.]+$/', '', $filename);
        $parts = explode('_', $nameNoExt);

        // Strip empty trailing parts (from trailing underscores like "Actor_.mov")
        while (count($parts) > 1 && $parts[count($parts) - 1] === '') {
            array_pop($parts);
        }

        $category = '';
        $slateNum = '';
        $actor = '';
        $version = '';

        if (count($parts) >= 3) {
            $lastPart = end($parts);
            // Detect version: pure digit ("2") or v+digit ("v2")
            $hasVersionSuffix = ctype_digit($lastPart) || preg_match('/^v\d+$/i', $lastPart);

            if ($hasVersionSuffix && count($parts) >= 4) {
                // Strip version, then walk back from end to find slate number
                $version = preg_replace('/^v/i', '', $lastPart);
                $i = count($parts) - 2; // start before version
                while ($i > 0 && ! ctype_digit($parts[$i])) {
                    $i--;
                }
                $slateNum = $parts[$i];
                // Everything between slateNum and version = actors (comma-separated)
                $actorParts = array_slice($parts, $i + 1, count($parts) - $i - 2);
                $actor = implode(', ', array_filter($actorParts));
                $category = implode(' ', array_slice($parts, 0, $i));
            } else {
                // No version: walk back from end to find the slate number
                $i = count($parts) - 1;
                while ($i > 0 && ! ctype_digit($parts[$i])) {
                    $i--;
                }
                if (ctype_digit($parts[$i])) {
                    $slateNum = $parts[$i];
                    // Everything after slateNum = actors (comma-separated)
                    $actorParts = array_slice($parts, $i + 1);
                    $actor = implode(', ', array_filter($actorParts));
                    $category = implode(' ', array_slice($parts, 0, $i));
                } else {
                    // Fallback: no slate number found
                    $actor = $parts[count($parts) - 1];
                    $category = implode(' ', array_slice($parts, 0, count($parts) - 1));
                }
            }
        } elseif (count($parts) === 2) {
            $slateNum = $parts[0];
            $actor = $parts[1];
        } else {
            $actor = $nameNoExt;
        }

        // Try matching category from subfolder name (more reliable)
        $folderParts = explode('/', $relativePath);
        if (count($folderParts) > 1) {
            $subfolderName = $folderParts[count($folderParts) - 2];
            if (isset(self::CAT_SLUG_MAP[$subfolderName])) {
                $category = str_replace('_', ' ', $subfolderName);
            }
        }

        // Compute category slug and slate code
        $catSlug = self::CAT_SLUG_MAP[$category]
            ?? self::CAT_SLUG_MAP[str_replace(' ', '_', $category)]
            ?? strtoupper(substr(preg_replace('/\s+/', '', $category), 0, 2));

        $slate = $slateNum ? $catSlug . $slateNum : '';

        return [
            'id' => $nameNoExt,
            'name' => $filename,
            'name_no_ext' => $nameNoExt,
            'relative_path' => $relativePath,
            'category' => $category,
            'slate' => $slate,
            'slate_num' => $slateNum,
            'actor' => $actor,
            'version' => $version,
        ];
    }

    /**
     * Check if a filename has a video extension.
     */
    public static function isVideo(string $filename): bool
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($ext, self::VIDEO_EXTS);
    }

    /**
     * The "creative" a rendered clip belongs to: its filename with the trailing
     * format token removed, so all formats of one creative share a key
     * (e.g. Creditstar_PL_rodki_na_TH8_Victoria_design2_4x5 →
     * Creditstar_PL_rodki_na_TH8_Victoria_design2). Falls back to the full name
     * when there is no recognisable format token.
     */
    public static function creativeKey(?string $name): string
    {
        $name = (string) $name;
        $tokens = explode('_', $name);
        if (count($tokens) > 1 && array_key_exists(strtolower((string) end($tokens)), self::RENDERED_FORMAT_MAP)) {
            array_pop($tokens);

            return implode('_', $tokens);
        }

        return $name;
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
    public static function parseRendered(string $nameNoExt): array
    {
        $out = ['brand' => null, 'lang' => null, 'copy' => null, 'slate' => null, 'actor' => null, 'design' => null, 'format' => null];
        $tokens = array_values(array_filter(explode('_', $nameNoExt), fn ($t) => $t !== ''));
        if (! $tokens) {
            return $out;
        }

        $formatMap = self::RENDERED_FORMAT_MAP;

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
