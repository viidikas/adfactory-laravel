<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;

class CopyLineController extends Controller
{
    public function index()
    {
        // Primary source: slate_data from AI analysis (stored by analyse-sheets)
        $slateDataRaw = Setting::get('slate_data', '{}');
        $slateData = json_decode($slateDataRaw, true) ?: [];

        if (empty($slateData)) {
            return response()->json([]);
        }

        // Flatten: extract unique copy lines from all slates
        $seen = [];
        $result = [];

        foreach ($slateData as $slate => $data) {
            $copyRows = $data['copy'] ?? [];
            foreach ($copyRows as $row) {
                $en = $row['en'] ?? '';
                if (! $en) {
                    continue;
                }

                // Deduplicate by key
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
                    'category' => $row['category'] ?? $data['category'] ?? '',
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
