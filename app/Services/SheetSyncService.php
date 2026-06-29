<?php

namespace App\Services;

use App\Models\Copy;
use App\Models\Market;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Syncs each market's copy set from its own tab in the configured spreadsheet.
 *
 * One spreadsheet (Setting `sheet_url`), one tab per market. The tab name must
 * match the market's `sheet_tab` (defaults to its code). Sync works for INACTIVE
 * markets too — that is the whole point of the staged rollout: an admin prepares
 * and reviews a market before enabling it.
 *
 * Reserved (structural) columns, case-insensitive: category, shot, brand,
 * disclaimer. Every OTHER header that is a 2-letter code (en, et, fi, pl, da,
 * sv, ru, …) is treated as a language column — the set is not hardcoded, so a
 * tab can carry whatever languages it needs. EN is required and is the
 * copy_key source. The `disclaimer` column holds a per-row yes/no flag; the
 * actual disclaimer asset is selected inside After Effects by (market, yes/no).
 *
 * Approval column: a tab may carry a "<market-code> copy approved" column (e.g.
 * "es copy approved"; the un-prefixed "copy approved" is also accepted). When
 * present it is authoritative — it holds the APPROVED local-language text. Such
 * a tab is "approval-gated": only rows with a filled approval cell are synced
 * at all (blank-approval rows are dropped, so a market's copy set is exactly its
 * approved copies and nothing pending ever surfaces), and every synced copy is
 * enabled straight from the sheet — no manual per-copy review. The raw draft
 * language column is ignored in favor of the approved text. Tabs without this
 * column keep the legacy manual-enablement behavior.
 *
 * Suggestion column: an optional "suggestion" review column may carry a corrected
 * English version. On an approval-gated tab a filled Suggestion is the copy's
 * English — it overrides the draft `en` column for both the stored en text and
 * the copy_key; a blank cell falls back to `en`. Rows are still gated on the `en`
 * column, so review-note rows (blank `en`, text only in Suggestion) never become
 * copies.
 */
class SheetSyncService
{
    /** Structural (non-language) columns. Any other 2-letter header is a language. */
    private const RESERVED_COLS = ['category', 'shot', 'brand', 'disclaimer'];

    private const CATEGORY_NORMALIZE = [
        'home reno' => 'Home Renovation',
        'home renovation' => 'Home Renovation',
        'lifestyle/events' => 'Lifestyle and Events',
        'lifestyle and events' => 'Lifestyle and Events',
        'electronics and e' => 'Electronics and Devices',
        'electronics and devices' => 'Electronics and Devices',
        'financial relief' => 'Financial Relief',
        'product usage' => 'Product Usage',
        'travel' => 'Travel and Holiday',
        'travel and holiday' => 'Travel and Holiday',
    ];

    /**
     * Sync every market and return a validation report.
     *
     * @return array{markets: array<int, array<string, mixed>>, synced: int, issues: array<int, string>}
     */
    public function syncAll(): array
    {
        $results = [];
        $issues = [];
        $synced = 0;

        foreach (Market::orderBy('code')->get() as $market) {
            $result = $this->syncMarket($market);
            $results[] = $result;

            if ($result['ok']) {
                $synced++;
            }

            foreach ($result['issues'] as $issue) {
                $issues[] = "{$market->code}: {$issue}";
            }
        }

        return [
            'markets' => $results,
            'synced' => $synced,
            'issues' => $issues,
        ];
    }

    /**
     * Sync a single market's tab into the `copies` table.
     *
     * @return array{market_id: int, code: string, ok: bool, copy_count: int, has_disclaimer: bool, issues: array<int, string>}
     */
    public function syncMarket(Market $market): array
    {
        $issues = [];

        $sheetUrl = Setting::get('sheet_url');
        if (! $sheetUrl) {
            return $this->result($market, false, 0, $market->has_disclaimer, ['No sheet_url configured']);
        }

        $csv = $this->fetchTabCsv($sheetUrl, $market->sheet_tab);
        if ($csv === null) {
            return $this->result($market, false, $market->copies()->count(), $market->has_disclaimer, ['Tab not found or could not be fetched']);
        }

        $parsed = $this->parseCsv($csv, $market->code);
        if ($parsed === null) {
            return $this->result($market, false, $market->copies()->count(), $market->has_disclaimer, ['Tab is empty or missing required EN column']);
        }

        [$rows, $hasDisclaimerColumn, $approvalGated, $collisions] = $parsed;

        if (! $hasDisclaimerColumn) {
            $issues[] = 'Tab has no Disclaimer column';
        }

        // Surface any copy-key collisions that were auto-disambiguated, so an
        // admin can reword the sheet for cleaner keys if they want to.
        foreach ($collisions as $collision) {
            $issues[] = $collision;
        }

        if (empty($rows)) {
            $issues[] = $approvalGated ? 'No approved copies in this tab yet' : 'Tab has no copy rows';
        }

        // Replace the market's copy set with the freshly synced rows so the
        // approved set always matches the sheet (stale copies are removed).
        //
        // Enablement depends on whether the tab carries an approval column:
        //  • Approval-gated tab — the sheet is the source of truth. A copy is
        //    enabled iff its "<code> copy approved" cell is filled; a blank cell
        //    disables it. No manual review toggle is involved.
        //  • Ungated tab (UK/EE/EEA today) — the legacy manual gate stands: a new
        //    or content-changed copy resets to DISABLED for admin re-review, and
        //    an unchanged copy keeps its existing enable state.
        DB::transaction(function () use ($market, $rows, $hasDisclaimerColumn, $approvalGated) {
            $seen = [];
            foreach ($rows as $row) {
                $existing = $market->copies()->where('copy_key', $row['copy_key'])->first();

                $attrs = [
                    'copy_text' => $row['copy_text'],
                    'category' => $row['category'],
                    'shot' => $row['shot'],
                    'brand' => $row['brand'],
                    'requires_disclaimer' => $row['requires_disclaimer'],
                    'source_row' => $row['source_row'],
                ];

                if ($approvalGated) {
                    // Every synced row in a gated market is approved (blank-approval
                    // rows are dropped at parse time), so it is enabled. Approval is
                    // the sheet's, never an admin's, so enabled_by is always null —
                    // including for a copy that an admin had enabled before its tab
                    // became gated. enabled_at is stamped once on first enable and
                    // kept stable across re-syncs.
                    $attrs['enabled'] = true;
                    $attrs['enabled_by'] = null;
                    if (! $existing || ! $existing->enabled) {
                        $attrs['enabled_at'] = Carbon::now();
                    }
                } elseif (! $existing || $this->copyContentChanged($existing, $row)) {
                    // New or changed content must be re-enabled by an admin. Unchanged
                    // copies keep their existing enable state (attrs omits it).
                    $attrs['enabled'] = false;
                    $attrs['enabled_at'] = null;
                    $attrs['enabled_by'] = null;
                }

                Copy::updateOrCreate(
                    ['market_id' => $market->id, 'copy_key' => $row['copy_key']],
                    $attrs
                );
                $seen[] = $row['copy_key'];
            }

            $market->copies()->whereNotIn('copy_key', $seen ?: [''])->delete();

            $market->forceFill([
                'has_disclaimer' => $hasDisclaimerColumn,
                'last_synced_at' => Carbon::now(),
            ])->save();
        });

        return $this->result($market, true, count($rows), $hasDisclaimerColumn, $issues);
    }

    /**
     * @param  array<int, string>  $issues
     * @return array{market_id: int, code: string, ok: bool, copy_count: int, has_disclaimer: bool, issues: array<int, string>}
     */
    private function result(Market $market, bool $ok, int $copyCount, bool $hasDisclaimer, array $issues): array
    {
        return [
            'market_id' => $market->id,
            'code' => $market->code,
            'ok' => $ok,
            'copy_count' => $copyCount,
            'has_disclaimer' => $hasDisclaimer,
            'issues' => $issues,
        ];
    }

    /**
     * Whether a synced row differs from the stored copy in any reviewed field
     * (text, shot, category, or disclaimer flag) — i.e. it must be re-enabled.
     *
     * copy_text is compared on meaningful content only: empty-language entries
     * are stripped from the stored value first, so a legacy copy_text
     * ({en:'x', et:'', fr:'', …}) and the new sparse shape ({en:'x'}) count as
     * UNCHANGED when the actual text matches — re-syncing after this change must
     * not spuriously reset enablement.
     */
    private function copyContentChanged(Copy $existing, array $row): bool
    {
        $existingText = array_filter(
            (array) $existing->copy_text,
            fn ($v) => $v !== null && $v !== ''
        );

        return $existingText != $row['copy_text']
            || (string) $existing->shot !== (string) $row['shot']
            || (string) $existing->category !== (string) $row['category']
            || (bool) $existing->requires_disclaimer !== (bool) $row['requires_disclaimer'];
    }

    /**
     * Fetch one named tab from the spreadsheet as CSV, or null on failure.
     *
     * Uses the gviz endpoint, which selects a tab BY NAME (the export endpoint
     * needs a numeric gid). Requires the sheet to be link-readable, as today.
     */
    private function fetchTabCsv(string $url, string $tab): ?string
    {
        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $url, $idMatch);
        if (! $idMatch) {
            return null;
        }

        $sheetId = $idMatch[1];
        $csvUrl = "https://docs.google.com/spreadsheets/d/{$sheetId}/gviz/tq?tqx=out:csv&sheet=".rawurlencode($tab);

        try {
            $response = Http::timeout(30)->get($csvUrl);

            if (! $response->successful()) {
                return null;
            }

            $body = $response->body();

            // gviz returns an HTML error document (not CSV) for an unknown tab.
            if (str_contains($body, '<!DOCTYPE') || str_starts_with(ltrim($body), '<')) {
                return null;
            }

            return $body;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Parse a tab's CSV into normalized copy rows.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: bool, 2: bool, 3: array<int, string>}|null
     *         [rows, hasDisclaimerColumn, approvalGated, collisionMessages], or null if unusable.
     */
    private function parseCsv(string $csv, string $marketCode): ?array
    {
        $lines = array_map('str_getcsv', explode("\n", trim($csv)));
        if (count($lines) < 2) {
            return null;
        }

        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), $lines[0]);

        $col = [];
        foreach (self::RESERVED_COLS as $name) {
            $idx = array_search($name, $headers, true);
            $col[$name] = $idx !== false ? $idx : null;
        }

        // Language columns: any 2-letter header that isn't a reserved column.
        // First occurrence wins if a code is duplicated.
        $langCols = [];
        foreach ($headers as $idx => $header) {
            if (preg_match('/^[a-z]{2}$/', $header)
                && ! in_array($header, self::RESERVED_COLS, true)
                && ! array_key_exists($header, $langCols)) {
                $langCols[$header] = $idx;
            }
        }

        // EN is required to treat a row as a copy line, and is the copy_key source.
        if (! array_key_exists('en', $langCols)) {
            return null;
        }

        $hasDisclaimerColumn = $col['disclaimer'] !== null;

        // "Suggestion" review column: a filled cell carries the corrected English.
        $suggestionIdx = array_search('suggestion', $headers, true);
        $suggestionIdx = $suggestionIdx === false ? null : $suggestionIdx;

        // Approval column: "<market-code> copy approved" (e.g. "es copy approved")
        // or the bare "copy approved". When present it is the source of truth —
        // it holds the APPROVED local-language text; a blank cell means the copy
        // is not approved. The raw draft language column is then ignored in favor
        // of this text. The approved text is stored under the market's local
        // language: the single non-EN language column (es/pl/sv/…), or EN itself
        // for an English-only market. Multiple non-EN columns are ambiguous, so
        // the tab falls back to ungated parsing.
        $approvedIdx = $this->findApprovedColumn($headers, $marketCode);
        $localLang = null;
        if ($approvedIdx !== null) {
            $nonEn = array_values(array_filter(array_keys($langCols), fn ($l) => $l !== 'en'));
            $localLang = match (count($nonEn)) {
                1 => $nonEn[0],
                0 => 'en',
                default => null,
            };
        }
        $approvalGated = $approvedIdx !== null && $localLang !== null;

        $rows = [];
        for ($i = 1; $i < count($lines); $i++) {
            $line = $lines[$i];

            // A row is a copy only when the EN column is filled — this keeps
            // legend/note rows (blank en, text only in Suggestion) out of the set.
            $enCol = $this->cell($line, $langCols['en']);
            if ($enCol === '') {
                continue;
            }

            // The corrected English: on a gated tab a filled Suggestion overrides
            // the draft `en` (which stays the fallback). Drives the stored en text
            // and the copy_key.
            $suggestion = $suggestionIdx !== null ? $this->cell($line, $suggestionIdx) : '';
            $en = ($approvalGated && $suggestion !== '') ? $suggestion : $enCol;

            if ($approvalGated) {
                // Only copies with a filled approval cell are usable. Rows with a
                // blank approval are dropped entirely, so the market's copy set is
                // exactly its approved copies — nothing pending ever surfaces. EN
                // stays the reference + copy_key source; the local language text
                // comes from the approval column.
                $approvedText = $this->cell($line, $approvedIdx);
                if ($approvedText === '') {
                    continue;
                }
                $copyText = ['en' => $en, $localLang => $approvedText];
            } else {
                // Store only languages that actually have content (no null padding).
                $copyText = [];
                foreach ($langCols as $lang => $idx) {
                    $val = $this->cell($line, $idx);
                    if ($val !== '') {
                        $copyText[$lang] = $val;
                    }
                }
            }

            $rows[] = [
                'copy_key' => $this->slugify($en),
                '_en' => $en, // kept only to disambiguate colliding keys, then dropped
                'copy_text' => $copyText,
                'category' => $this->normalizeCategory($this->cell($line, $col['category'])),
                'shot' => $this->cell($line, $col['shot']),
                'brand' => $this->cell($line, $col['brand']),
                'requires_disclaimer' => $this->isYes($this->cell($line, $col['disclaimer'])),
                'source_row' => $i + 1, // 1-based, accounting for the header row
            ];
        }

        [$rows, $collisions] = $this->disambiguateKeys($rows);

        return [$rows, $hasDisclaimerColumn, $approvalGated, $collisions];
    }

    /**
     * Guarantee a UNIQUE copy_key per row within a tab. The base key is only the
     * first 3 words / 18 chars of the English, so two distinct copies that start
     * the same would otherwise collapse into one — and an approved copy would be
     * silently lost. Colliding rows get a fuller key from more of their own text;
     * rows with genuinely identical text keep one key (a real duplicate, merged).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, string>}
     *         [rows with unique copy_key, human-readable collision messages]
     */
    private function disambiguateKeys(array $rows): array
    {
        $baseCounts = array_count_values(array_column($rows, 'copy_key'));
        $used = [];
        $colliding = [];

        foreach ($rows as &$row) {
            $base = $row['copy_key'];
            $en = $row['_en'];

            if (($baseCounts[$base] ?? 0) > 1) {
                $colliding[$base][] = $en;
                $key = $this->slugify($en, 8, 60); // fuller slug from this row's text
            } else {
                $key = $base;
            }

            // Two DIFFERENT texts must never share a key; identical text may (merge).
            while (isset($used[$key]) && $used[$key] !== $en) {
                $key .= '_'.substr(md5($en.$key), 0, 4);
            }

            $row['copy_key'] = $key;
            $used[$key] = $en;
            unset($row['_en']);
        }
        unset($row);

        $messages = [];
        foreach ($colliding as $base => $texts) {
            $unique = array_values(array_unique($texts));
            if (count($unique) > 1) {
                $messages[] = count($unique)." copies share the short key '{$base}', kept distinct: \"".implode('", "', $unique).'"';
            }
        }

        return [$rows, $messages];
    }

    /**
     * Locate the approval column index for a market, or null if the tab has none.
     *
     * Matches the market-code-prefixed form ("es copy approved") first, then the
     * bare un-prefixed form ("copy approved"). Headers are already normalized
     * (lower-cased, internal whitespace collapsed) by parseCsv.
     *
     * @param  array<int, string>  $headers
     */
    private function findApprovedColumn(array $headers, string $marketCode): ?int
    {
        $code = strtolower(trim($marketCode));

        foreach ([$code.' copy approved', 'copy approved'] as $want) {
            $idx = array_search($want, $headers, true);
            if ($idx !== false) {
                return $idx;
            }
        }

        return null;
    }

    private function normalizeHeader(string $header): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($header)));
    }

    private function cell(array $line, ?int $idx): string
    {
        if ($idx === null) {
            return '';
        }

        return trim((string) ($line[$idx] ?? ''));
    }

    private function isYes(string $value): bool
    {
        return in_array(strtolower(trim($value)), ['yes', 'y', 'true', '1', 'x'], true);
    }

    public function normalizeCategory(string $raw): string
    {
        $lower = strtolower(trim($raw));
        if ($lower === '') {
            return '';
        }

        if (isset(self::CATEGORY_NORMALIZE[$lower])) {
            return self::CATEGORY_NORMALIZE[$lower];
        }

        foreach (self::CATEGORY_NORMALIZE as $prefix => $canonical) {
            if (str_starts_with($lower, $prefix)) {
                return $canonical;
            }
        }

        return ucwords($lower);
    }

    private function slugify(string $text, int $maxWords = 3, int $maxChars = 18): string
    {
        $text = preg_replace('/[^\w\s]/u', '', $text);
        $words = preg_split('/\s+/', trim($text));
        $slug = implode('_', array_slice($words, 0, $maxWords));
        $slug = substr($slug, 0, $maxChars);

        return rtrim($slug, '_');
    }
}
