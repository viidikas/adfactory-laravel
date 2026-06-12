<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
use App\Models\Market;
use Illuminate\Http\Request;

class CopyController extends Controller
{
    /**
     * List the orderable copies for a single market — only ENABLED copies, since
     * per-copy enablement is the content gate. Copies of inactive markets are
     * never returned to growth leads. (Admins review the full set, including
     * disabled copies, via GET /api/markets/{market}/copies.)
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'market_id' => 'required|integer',
        ]);

        $market = Market::find($validated['market_id']);
        if (! $market) {
            return response()->json(['message' => 'Market not found.'], 404);
        }

        if (! $market->active && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Market is not available.'], 422);
        }

        $copies = $market->copies()->where('enabled', true)->orderBy('category')->orderBy('copy_key')->get();

        return response()->json($copies->map(function (Copy $c) {
            $text = $c->copy_text ?? [];

            // Flattened language fields mirror the legacy copy-row shape the
            // picker expects ({key, category, shot, en, et, ...}), plus the
            // per-copy disclaimer flag.
            return [
                'key' => $c->copy_key,
                'category' => $c->category,
                'shot' => $c->shot,
                'brand' => $c->brand,
                'requires_disclaimer' => $c->requires_disclaimer,
                'en' => $text['en'] ?? '',
                'et' => $text['et'] ?? '',
                'fr' => $text['fr'] ?? '',
                'de' => $text['de'] ?? '',
                'es' => $text['es'] ?? '',
                'copy_text' => $text,
            ];
        }));
    }
}
