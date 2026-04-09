<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProxyController extends Controller
{
    public function forward(Request $request)
    {
        $apiKey = config('services.anthropic.api_key') ?: env('ANTHROPIC_API_KEY');

        if (! $apiKey) {
            return response()->json([
                'error' => ['message' => 'ANTHROPIC_API_KEY not configured on server'],
            ], 500);
        }

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])
                ->timeout(120)
                ->post('https://api.anthropic.com/v1/messages', $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => ['message' => 'Proxy error: '.$e->getMessage()],
            ], 500);
        }
    }
}
