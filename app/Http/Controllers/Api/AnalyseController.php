<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AnalyseController extends Controller
{
    public function analyse(Request $request)
    {
        $request->validate([
            'sheet_urls' => 'required|array|min:1',
            'sheet_urls.*.url' => 'required|string',
            'sheet_urls.*.label' => 'nullable|string',
        ]);

        // 1. Fetch all sheet CSVs
        $sheetsData = [];
        foreach ($request->input('sheet_urls') as $sheet) {
            $url = $sheet['url'];
            $label = $sheet['label'] ?? '';

            $csv = $this->fetchSheetCsv($url);
            if (! $csv) {
                return response()->json([
                    'ok' => false,
                    'error' => "Could not fetch sheet: {$label} ({$url})",
                ], 422);
            }

            $sheetsData[] = [
                'label' => $label,
                'csv' => $csv,
            ];
        }

        // 2. Get current clip list from active project
        $activeProject = Project::where('is_active', true)->first();
        $clips = $activeProject
            ? Clip::where('project_id', $activeProject->id)->get()
            : Clip::all();

        $clipSummary = $clips->groupBy('slate')->map(function ($group, $slate) {
            return [
                'slate' => $slate,
                'category' => $group->first()->category,
                'actors' => $group->pluck('actor')->unique()->values()->toArray(),
                'count' => $group->count(),
            ];
        })->values()->toArray();

        // 3. Build the AI prompt
        $sheetsText = '';
        foreach ($sheetsData as $i => $sd) {
            $label = $sd['label'] ?: 'Sheet '.($i + 1);
            $sheetsText .= "=== {$label} ===\n{$sd['csv']}\n\n";
        }

        $clipsJson = json_encode($clipSummary, JSON_PRETTY_PRINT);

        $systemPrompt = <<<'PROMPT'
You are a data analyst for a video ad production system. You receive:
1. One or more Google Sheet CSVs (shot descriptions and/or copy/headline sheets)
2. A list of video clip slates with their categories and actors

Your job: match everything together and produce a unified mapping.

SHEET TYPES:
- Shot description sheets have columns describing what happens in each video shot (slate number, description, actors, markets)
- Copy/headline sheets have advertising text in multiple languages (Category, Shot, Brand, EN, ET, FR, DE, ES)

CATEGORY SLUG MAPPING for slate codes:
- Product Usage → PU (e.g. PU1, PU18)
- Travel and Holiday → TH
- Home Renovation → HR
- Lifestyle and Events → LE
- Electronics and Devices → EG
- Financial Relief → FR

COPY MATCHING RULES:
1. If a copy row's Shot column contains slate codes (e.g. "PU1, PU7, PU8") → that copy applies ONLY to those slates
2. If Shot column is blank → copy applies to the entire category (fallback for any slate in that category without slate-specific copy)
3. Rows where Brand = "SmartSaver" → EXCLUDE entirely
4. Multiple copy rows can match the same slate — include ALL of them

Respond ONLY with valid JSON (no preamble, no markdown fences):
{
  "slate_data": {
    "PU1": {
      "description": "Phone passed from one hand to another, smile",
      "markets": "EEA",
      "copy": [
        {
          "key": "Tap_to_invest",
          "en": "Tap to invest",
          "et": "Puuduta, et investeerida",
          "fr": "Appuyez pour investir",
          "de": "Zum Investieren tippen",
          "es": "Invierte con un toque",
          "brand": "Creditstar",
          "shot": "PU1, PU2, PU7"
        }
      ]
    }
  }
}

Rules for the "key" field: take the EN text, first 3 words max, max 18 chars, strip punctuation, join with underscores.
e.g. "Funds for fun" → "Funds_for_fun", "Money in minutes" → "Money_in_minutes"

Include an entry for EVERY slate that exists in the clip list, even if no copy matches (empty copy array).
Always include the shot description if available from the shot description sheet.
PROMPT;

        $userMessage = "Here are the sheets:\n\n{$sheetsText}\n\nHere are the video clip slates:\n{$clipsJson}";

        // 4. Call Claude API
        $apiKey = config('services.anthropic.api_key');
        if (! $apiKey) {
            return response()->json([
                'ok' => false,
                'error' => 'ANTHROPIC_API_KEY not configured',
            ], 500);
        }

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])
                ->timeout(180)
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-sonnet-4-20250514',
                    'max_tokens' => 16000,
                    'system' => $systemPrompt,
                    'messages' => [['role' => 'user', 'content' => $userMessage]],
                ]);

            $data = $response->json();

            if (! isset($data['content'])) {
                return response()->json([
                    'ok' => false,
                    'error' => $data['error']['message'] ?? 'No response from Claude',
                ], 500);
            }

            $text = collect($data['content'])->firstWhere('type', 'text')['text'] ?? '';

            // Parse JSON from response
            preg_match('/\{[\s\S]*\}/', $text, $matches);
            if (! $matches) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Could not parse AI response',
                    'raw' => $text,
                ], 500);
            }

            $parsed = json_decode($matches[0], true);
            if (! $parsed || ! isset($parsed['slate_data'])) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Invalid AI response structure',
                ], 500);
            }

            // 5. Store to database
            Setting::set('slate_data', json_encode($parsed['slate_data']));

            // Also store the sheet URLs for persistence
            Setting::set('sheets_meta', json_encode($request->input('sheet_urls')));

            $slateCount = count($parsed['slate_data']);
            $copyCount = collect($parsed['slate_data'])
                ->sum(fn ($s) => count($s['copy'] ?? []));

            return response()->json([
                'ok' => true,
                'slates' => $slateCount,
                'copy_rows' => $copyCount,
                'slate_data' => $parsed['slate_data'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'ok' => false,
                'error' => 'AI analysis failed: '.$e->getMessage(),
            ], 500);
        }
    }

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
}
