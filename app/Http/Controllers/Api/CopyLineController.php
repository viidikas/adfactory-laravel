<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;

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

    public function index()
    {
        $slateDataRaw = Setting::get('slate_data', '{}');
        $slateData = json_decode($slateDataRaw, true) ?: [];

        if (empty($slateData)) {
            return response()->json([]);
        }

        $seen = [];
        $result = [];

        foreach ($slateData as $slate => $data) {
            $copyRows = $data['copy'] ?? [];

            // Derive category from slate code (e.g. "TH7" → "Travel and Holiday")
            $slateCategory = $this->categoryFromSlate($slate);

            foreach ($copyRows as $row) {
                $en = $row['en'] ?? '';
                if (! $en) {
                    continue;
                }

                // Normalise category: use row's category, fall back to slate-derived
                $rawCat = $row['category'] ?? '';
                $category = $rawCat ? $this->normalizeCategory($rawCat) : $slateCategory;

                $key = $row['key'] ?? $this->slugify($en);

                if (isset($seen[$key])) {
                    // Merge slate into existing shot field
                    $existingIdx = $seen[$key];
                    $existingShot = $result[$existingIdx]['shot'] ?? '';
                    if ($existingShot && ! str_contains($existingShot, $slate)) {
                        $result[$existingIdx]['shot'] .= ', '.$slate;
                    } elseif (! $existingShot) {
                        $result[$existingIdx]['shot'] = $slate;
                    }

                    continue;
                }

                $seen[$key] = count($result);
                $result[] = [
                    'key' => $key,
                    'category' => $category,
                    'shot' => $row['shot'] ?? $slate,
                    'brand' => $row['brand'] ?? '',
                    'en' => $en,
                    'et' => $row['et'] ?? '',
                    'fr' => $row['fr'] ?? '',
                    'de' => $row['de'] ?? '',
                    'es' => $row['es'] ?? '',
                ];
            }
        }

        return response()->json($result);
    }

    public function normalizeCategory(string $raw): string
    {
        $lower = strtolower(trim($raw));

        // Exact match first
        if (isset(self::CATEGORY_NORMALIZE[$lower])) {
            return self::CATEGORY_NORMALIZE[$lower];
        }

        // Partial prefix match (e.g. "Electronics and E" → "Electronics and Devices")
        foreach (self::CATEGORY_NORMALIZE as $prefix => $canonical) {
            if (str_starts_with($lower, $prefix)) {
                return $canonical;
            }
        }

        return ucwords($lower);
    }

    private function categoryFromSlate(string $slate): string
    {
        // Extract alpha prefix from slate code (e.g. "TH7" → "TH", "PU18" → "PU")
        preg_match('/^([A-Z]+)/', $slate, $m);
        $prefix = $m[1] ?? '';

        return self::SLUG_TO_CATEGORY[$prefix] ?? '';
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
