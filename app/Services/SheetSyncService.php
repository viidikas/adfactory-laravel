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
 * Reserved column conventions (case-insensitive headers), matching the existing
 * copy sheet plus one addition:
 *   category, shot, brand, en, et, fr, de, es, disclaimer
 * The `disclaimer` column holds a per-row yes/no flag; the actual disclaimer
 * asset is selected inside After Effects by (market, yes/no).
 */
class SheetSyncService
{
    private const LANG_COLS = ['en', 'et', 'fr', 'de', 'es'];

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

        $parsed = $this->parseCsv($csv);
        if ($parsed === null) {
            return $this->result($market, false, $market->copies()->count(), $market->has_disclaimer, ['Tab is empty or missing required EN column']);
        }

        [$rows, $hasDisclaimerColumn] = $parsed;

        if (! $hasDisclaimerColumn) {
            $issues[] = 'Tab has no Disclaimer column';
        }

        if (empty($rows)) {
            $issues[] = 'Tab has no copy rows';
        }

        // Replace the market's copy set with the freshly synced rows so the
        // approved set always matches the sheet (stale copies are removed).
        // Per-copy enablement is preserved for unchanged copies; a new or
        // content-changed copy is reset to DISABLED so an admin must re-review it.
        DB::transaction(function () use ($market, $rows, $hasDisclaimerColumn) {
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

                // New or changed content must be re-enabled by an admin. Unchanged
                // copies keep their existing enable state (attrs omits it).
                if (! $existing || $this->copyContentChanged($existing, $row)) {
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
     */
    private function copyContentChanged(Copy $existing, array $row): bool
    {
        return $existing->copy_text != $row['copy_text']
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
     * @return array{0: array<int, array<string, mixed>>, 1: bool}|null
     *         [rows, hasDisclaimerColumn], or null if the tab is unusable.
     */
    private function parseCsv(string $csv): ?array
    {
        $lines = array_map('str_getcsv', explode("\n", trim($csv)));
        if (count($lines) < 2) {
            return null;
        }

        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), $lines[0]);

        $col = [];
        foreach (['category', 'shot', 'brand', 'disclaimer', ...self::LANG_COLS] as $name) {
            $idx = array_search($name, $headers, true);
            $col[$name] = $idx !== false ? $idx : null;
        }

        // EN is required to treat a row as a copy line.
        if ($col['en'] === null) {
            return null;
        }

        $hasDisclaimerColumn = $col['disclaimer'] !== null;

        $rows = [];
        for ($i = 1; $i < count($lines); $i++) {
            $line = $lines[$i];

            $en = $this->cell($line, $col['en']);
            if ($en === '') {
                continue;
            }

            $copyText = [];
            foreach (self::LANG_COLS as $lang) {
                $copyText[$lang] = $this->cell($line, $col[$lang]);
            }

            $rows[] = [
                'copy_key' => $this->slugify($en),
                'copy_text' => $copyText,
                'category' => $this->normalizeCategory($this->cell($line, $col['category'])),
                'shot' => $this->cell($line, $col['shot']),
                'brand' => $this->cell($line, $col['brand']),
                'requires_disclaimer' => $this->isYes($this->cell($line, $col['disclaimer'])),
                'source_row' => $i + 1, // 1-based, accounting for the header row
            ];
        }

        return [$rows, $hasDisclaimerColumn];
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

    private function slugify(string $text): string
    {
        $text = preg_replace('/[^\w\s]/u', '', $text);
        $words = preg_split('/\s+/', trim($text));
        $slug = implode('_', array_slice($words, 0, 3));
        $slug = substr($slug, 0, 18);

        return rtrim($slug, '_');
    }
}
