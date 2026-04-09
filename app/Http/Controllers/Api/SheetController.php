<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SheetController extends Controller
{
    public function show(Request $request)
    {
        $url = $request->query('url', '');

        if (! $url) {
            return response()->json(['ok' => false, 'error' => 'Missing url parameter'], 400);
        }

        // Extract sheet ID and gid from Google Sheets URL
        preg_match('/\/d\/([a-zA-Z0-9_-]+)/', $url, $idMatch);
        if (! $idMatch) {
            return response()->json(['ok' => false, 'error' => 'Invalid Google Sheets URL'], 400);
        }

        $sheetId = $idMatch[1];
        preg_match('/gid=(\d+)/', $url, $gidMatch);
        $gid = $gidMatch[1] ?? '0';

        $csvUrl = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&id={$sheetId}&gid={$gid}";

        try {
            $response = Http::timeout(30)->get($csvUrl);

            if (! $response->successful()) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Google Sheets returned HTTP '.$response->status(),
                ]);
            }

            $csv = $response->body();
            $lines = explode("\n", trim($csv));

            return response()->json([
                'ok' => true,
                'csv' => $csv,
                'rows' => count($lines),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'ok' => false,
                'error' => 'Failed to fetch sheet: '.$e->getMessage(),
            ]);
        }
    }
}
