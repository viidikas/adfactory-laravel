<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class CopyLineController extends Controller
{
    const SLUG_TO_CATEGORY = [
        'PU' => 'Product Usage',
        'TH' => 'Travel and Holiday',
        'HR' => 'Home Renovation',
        'LE' => 'Lifestyle and Events',
        'EG' => 'Electronics and Devices',
        'FR' => 'Financial Relief',
    ];

    const CATEGORY_TO_SLUG = [
        'Product Usage' => 'PU',
        'Travel and Holiday' => 'TH',
        'Home Renovation' => 'HR',
        'Lifestyle and Events' => 'LE',
        'Electronics and Devices' => 'EG',
        'Financial Relief' => 'FR',
    ];

    const CATEGORY_NORMALIZE = [
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
     * GET /api/copy-lines — returns all copy lines from the configured sheet
     */
    public function index(Request $request)
    {
        $lines = $this->getParsedCopyLines();

        // Brand filter: SmartSaver = Monefit (legacy name, same product)
        if ($request->filled('brand')) {
            $brand = strtolower($request->input('brand'));
            $lines = array_values(array_filter($lines, function ($row) use ($brand) {
                $rowBrand = strtolower(trim($row['brand'] ?? ''));
                if ($rowBrand === '' || $rowBrand === 'either') {
                    return true;
                }
                if ($brand === 'monefit') {
                    return $rowBrand === 'monefit' || $rowBrand === 'smartsaver';
                }

                return $brand === $rowBrand;
            }));
        }

        return response()->json($lines);
    }

    /**
     * POST /api/copy-lines/sync — fetches sheet, parses, builds slate mapping, stores to DB
     * Called by admin to refresh copy data.
     */
    public function sync()
    {
        $sheetUrl = Setting::get('sheet_url');
        if (! $sheetUrl) {
            return response()->json(['ok' => false, 'error' => 'No sheet_url configured'], 422);
        }

        // Fetch and parse the CSV
        $csv = $this->fetchSheetCsv($sheetUrl);
        if (! $csv) {
            return response()->json(['ok' => false, 'error' => 'Could not fetch sheet'], 422);
        }

        $copyLines = $this->parseCsv($csv);
        if (empty($copyLines)) {
            return response()->json(['ok' => false, 'error' => 'No copy rows found in sheet'], 422);
        }

        // Store the parsed copy lines
        Setting::set('copy_lines', json_encode($copyLines));

        // Build and store the slate-to-copy mapping
        $slateMapping = $this->buildSlateMapping($copyLines);
        Setting::set('slate_copy_mapping', json_encode($slateMapping));

        // Also update slate_data to include proper copy arrays
        $this->updateSlateDataWithCopy($slateMapping);

        return response()->json([
            'ok' => true,
            'copy_lines' => count($copyLines),
            'slates_mapped' => count($slateMapping),
        ]);
    }

    /**
     * Get parsed copy lines — from stored data
     */
    private function getParsedCopyLines(): array
    {
        $raw = Setting::get('copy_lines', '[]');
        $lines = json_decode($raw, true);

        return is_array($lines) ? $lines : [];
    }

    /**
     * Fetch Google Sheet as CSV
     */
    private function fetchSheetCsv(string $url): ?string
    {
        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $url, $idMatch);
        if (! $idMatch) {
            return null;
        }

        $sheetId = $idMatch[1];
        preg_match('/gid=(\d+)/', $url, $gidMatch);
        $gid = $gidMatch[1] ?? '0';

        $csvUrl = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&id={$sheetId}&gid={$gid}";

        try {
            $response = Http::timeout(30)->get($csvUrl);

            return $response->successful() ? $response->body() : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parse CSV into structured copy line array
     *
     * Columns: Category, Shot, Brand, EN, ET, FR, DE, ES
     * Rules:
     *   - Skip Brand = SmartSaver
     *   - Skip empty EN
     *   - Normalise category names
     */
    private function parseCsv(string $csv): array
    {
        $rows = array_map('str_getcsv', explode("\n", trim($csv)));
        if (count($rows) < 2) {
            return [];
        }

        $headers = array_map(fn ($h) => strtolower(trim($h)), $rows[0]);
        $colMap = [];
        foreach (['category', 'shot', 'brand', 'en', 'et', 'fr', 'de', 'es'] as $col) {
            $idx = array_search($col, $headers);
            $colMap[$col] = $idx !== false ? $idx : null;
        }

        if ($colMap['en'] === null) {
            return [];
        }

        $result = [];
        for ($i = 1; $i < count($rows); $i++) {
            $row = $rows[$i];

            $brand = $colMap['brand'] !== null ? trim($row[$colMap['brand']] ?? '') : '';

            $en = $colMap['en'] !== null ? trim($row[$colMap['en']] ?? '') : '';
            if ($en === '') {
                continue;
            }

            $rawCat = $colMap['category'] !== null ? trim($row[$colMap['category']] ?? '') : '';
            $category = $this->normalizeCategory($rawCat);
            $shot = $colMap['shot'] !== null ? trim($row[$colMap['shot']] ?? '') : '';

            $result[] = [
                'key' => $this->slugify($en),
                'category' => $category,
                'shot' => $shot,
                'brand' => $brand,
                'en' => $en,
                'et' => $colMap['et'] !== null ? trim($row[$colMap['et']] ?? '') : '',
                'fr' => $colMap['fr'] !== null ? trim($row[$colMap['fr']] ?? '') : '',
                'de' => $colMap['de'] !== null ? trim($row[$colMap['de']] ?? '') : '',
                'es' => $colMap['es'] !== null ? trim($row[$colMap['es']] ?? '') : '',
            ];
        }

        return $result;
    }

    /**
     * Build slate → copy[] mapping
     *
     * Rules:
     *   1. Shot has slate codes (e.g. "PU1, PU7, PU18") → applies to those slates only
     *   2. Shot blank → applies to entire category (fallback for unmatched slates)
     *   3. Multiple rows can match the same slate — store ALL
     */
    private function buildSlateMapping(array $copyLines): array
    {
        // Get all slates from the active project's clips
        $activeProject = Project::where('is_active', true)->first();
        $allSlates = $activeProject
            ? Clip::where('project_id', $activeProject->id)
                ->whereNotNull('slate')
                ->where('slate', '!=', '')
                ->select('slate', 'category')
                ->distinct()
                ->get()
                ->mapWithKeys(fn ($c) => [$c->slate => $c->category])
                ->toArray()
            : [];

        // Bucket copy lines: by specific slate, and by category (blank shot)
        $bySlate = [];  // 'PU1' => [row, row, ...]
        $byCat = [];    // 'Product Usage' => [row, row, ...]

        foreach ($copyLines as $row) {
            $shot = $row['shot'] ?? '';
            $cat = $row['category'] ?? '';

            if ($shot) {
                // Parse slate codes: "PU1, PU7, PU18" or "LE1, LE2, LE3"
                $codes = preg_split('/[\s,;]+/', $shot);
                foreach ($codes as $code) {
                    $code = strtoupper(trim($code));
                    if (preg_match('/^[A-Z]{2}\d+$/', $code)) {
                        $bySlate[$code][] = $row;
                    }
                }
            } elseif ($cat) {
                // Blank shot = category-wide
                $byCat[$cat][] = $row;
            }
        }

        // Build final mapping: for each slate in the DB, collect all matching copy
        $mapping = [];
        foreach ($allSlates as $slate => $category) {
            $copies = [];

            // 1. Slate-specific rows
            if (isset($bySlate[$slate])) {
                foreach ($bySlate[$slate] as $row) {
                    $copies[] = $row;
                }
            }

            // 2. Category-wide rows (always add, user picks which to use)
            if (isset($byCat[$category])) {
                foreach ($byCat[$category] as $row) {
                    // Avoid exact duplicates
                    $isDup = false;
                    foreach ($copies as $existing) {
                        if ($existing['en'] === $row['en']) {
                            $isDup = true;
                            break;
                        }
                    }
                    if (! $isDup) {
                        $copies[] = $row;
                    }
                }
            }

            $mapping[$slate] = $copies;
        }

        return $mapping;
    }

    /**
     * Update the slate_data setting with proper copy arrays from the parsed sheet
     */
    private function updateSlateDataWithCopy(array $slateMapping): void
    {
        $raw = Setting::get('slate_data', '{}');
        $slateData = json_decode($raw, true) ?: [];

        foreach ($slateMapping as $slate => $copies) {
            if (! isset($slateData[$slate])) {
                // Create entry for slates not yet in slate_data
                preg_match('/^([A-Z]+)/', $slate, $m);
                $prefix = $m[1] ?? '';
                $slateData[$slate] = [
                    'description' => '',
                    'markets' => '',
                    'copy' => $copies,
                ];
            } else {
                $slateData[$slate]['copy'] = $copies;
            }
        }

        Setting::set('slate_data', json_encode($slateData));
    }

    public function normalizeCategory(string $raw): string
    {
        $lower = strtolower(trim($raw));

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
        $text = preg_replace('/[^\w\s]/', '', $text);
        $words = preg_split('/\s+/', trim($text));
        $words = array_slice($words, 0, 3);
        $slug = implode('_', $words);
        $slug = substr($slug, 0, 18);

        return rtrim($slug, '_');
    }
}
