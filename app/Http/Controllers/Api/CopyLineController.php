<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CopyLineController extends Controller
{
    public function index()
    {
        $cached = Cache::get('copy_lines');
        if ($cached !== null) {
            return response()->json($cached);
        }

        $sheetUrl = Setting::get('sheet_url');

        if (! $sheetUrl) {
            return response()->json([
                'data' => [],
                'message' => 'No sheet_url configured',
            ]);
        }

        // Extract sheet ID and gid from Google Sheets URL
        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $sheetUrl, $idMatch);
        if (! $idMatch) {
            return response()->json([
                'data' => [],
                'message' => 'Invalid Google Sheets URL',
            ]);
        }

        $sheetId = $idMatch[1];
        preg_match('/gid=(\d+)/', $sheetUrl, $gidMatch);
        $gid = $gidMatch[1] ?? '0';

        $csvUrl = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&id={$sheetId}&gid={$gid}";

        try {
            $response = Http::timeout(30)->get($csvUrl);

            if (! $response->successful()) {
                return response()->json([
                    'data' => [],
                    'message' => 'Google Sheets returned HTTP '.$response->status(),
                ]);
            }

            $csv = $response->body();
            $lines = array_map('str_getcsv', explode("\n", trim($csv)));

            if (count($lines) < 2) {
                return response()->json([
                    'data' => [],
                    'message' => 'Sheet has no data rows',
                ]);
            }

            // Find column indices (case-insensitive)
            $headers = array_map('strtolower', array_map('trim', $lines[0]));
            $columns = ['category', 'shot', 'brand', 'en', 'et', 'fr', 'de', 'es'];
            $indices = [];

            foreach ($columns as $col) {
                $idx = array_search($col, $headers);
                $indices[$col] = $idx !== false ? $idx : null;
            }

            $result = [];

            for ($i = 1; $i < count($lines); $i++) {
                $row = $lines[$i];

                // Skip if brand is SmartSaver (case-insensitive)
                $brand = $indices['brand'] !== null ? trim($row[$indices['brand']] ?? '') : '';
                if (strtolower($brand) === 'smartsaver') {
                    continue;
                }

                // Skip if EN is empty
                $en = $indices['en'] !== null ? trim($row[$indices['en']] ?? '') : '';
                if ($en === '') {
                    continue;
                }

                $category = $indices['category'] !== null ? trim($row[$indices['category']] ?? '') : '';
                $category = $this->normalizeCategory($category);

                $result[] = [
                    'key' => $this->slugify($en),
                    'category' => $category,
                    'shot' => $indices['shot'] !== null ? trim($row[$indices['shot']] ?? '') : '',
                    'brand' => $brand,
                    'en' => $en,
                    'et' => $indices['et'] !== null ? trim($row[$indices['et']] ?? '') : '',
                    'fr' => $indices['fr'] !== null ? trim($row[$indices['fr']] ?? '') : '',
                    'de' => $indices['de'] !== null ? trim($row[$indices['de']] ?? '') : '',
                    'es' => $indices['es'] !== null ? trim($row[$indices['es']] ?? '') : '',
                ];
            }

            Cache::put('copy_lines', $result, now()->addMinutes(15));

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'data' => [],
                'message' => 'Failed to fetch sheet: '.$e->getMessage(),
            ]);
        }
    }

    private function slugify(string $text): string
    {
        // Remove punctuation
        $text = preg_replace('/[^\w\s]/', '', $text);
        // Split on spaces
        $words = preg_split('/\s+/', trim($text));
        // Take first 3 words
        $words = array_slice($words, 0, 3);
        // Join with underscore
        $slug = implode('_', $words);
        // Truncate to 18 chars
        $slug = substr($slug, 0, 18);
        // Remove trailing underscore
        $slug = rtrim($slug, '_');

        return strtolower($slug);
    }

    private function normalizeCategory(string $category): string
    {
        $lower = strtolower(trim($category));

        $map = [
            'product usage' => 'Product Usage',
            'travel and holiday' => 'Travel and Holiday',
            'travel & holiday' => 'Travel and Holiday',
            'food and drink' => 'Food and Drink',
            'food & drink' => 'Food and Drink',
            'health and wellness' => 'Health and Wellness',
            'health & wellness' => 'Health and Wellness',
            'home and garden' => 'Home and Garden',
            'home & garden' => 'Home and Garden',
            'sports and fitness' => 'Sports and Fitness',
            'sports & fitness' => 'Sports and Fitness',
            'beauty and fashion' => 'Beauty and Fashion',
            'beauty & fashion' => 'Beauty and Fashion',
        ];

        if (isset($map[$lower])) {
            return $map[$lower];
        }

        // Default: title case
        return ucwords($lower);
    }
}
