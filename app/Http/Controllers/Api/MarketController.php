<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Market;
use App\Services\SheetSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MarketController extends Controller
{
    /**
     * List markets.
     *
     * Growth leads only ever see ACTIVE markets (the selector). Admins see every
     * market plus the stats needed to prepare and review a staged rollout.
     */
    public function index(Request $request)
    {
        $isAdmin = $request->user()->role === 'admin';

        $query = Market::query()->withCount('copies')->orderBy('code');
        if (! $isAdmin) {
            $query->active();
        }

        return response()->json($query->get()->map(function (Market $m) use ($isAdmin) {
            $base = [
                'id' => $m->id,
                'code' => $m->code,
                'name' => $m->name,
                'brand' => $m->brand,
                'active' => $m->active,
            ];

            if (! $isAdmin) {
                return $base;
            }

            return $base + [
                'sheet_tab' => $m->sheet_tab,
                'copy_count' => $m->copies_count,
                'has_disclaimer' => $m->has_disclaimer,
                'review_ready' => $m->isReviewReady(),
                'activated_at' => optional($m->activated_at)->toIso8601String(),
                'last_synced_at' => optional($m->last_synced_at)->toIso8601String(),
            ];
        }));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:markets,code',
            'name' => 'required|string|max:100',
            'brand' => 'required|string|in:Creditstar,Monefit',
            'sheet_tab' => 'nullable|string|max:100',
        ]);

        // New markets are always created INACTIVE.
        $market = Market::create([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'brand' => $validated['brand'],
            'sheet_tab' => $validated['sheet_tab'] ?? $validated['code'],
            'active' => false,
        ]);

        return response()->json($market, 201);
    }

    public function update(Request $request, Market $market)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'brand' => 'sometimes|string|in:Creditstar,Monefit',
            'sheet_tab' => 'sometimes|string|max:100',
        ]);

        $market->update($validated);

        return response()->json($market->fresh());
    }

    /**
     * Enable a market — an explicit admin action. Blocked unless the market is
     * review-ready: it must have synced copies AND a Disclaimer column.
     */
    public function enable(Market $market)
    {
        if (! $market->copies()->exists()) {
            return response()->json([
                'message' => "Cannot enable {$market->code}: it has no synced copies. Sync the market first.",
            ], 422);
        }

        if (! $market->has_disclaimer) {
            return response()->json([
                'message' => "Cannot enable {$market->code}: its tab has no Disclaimer column. Add one and re-sync.",
            ], 422);
        }

        $market->forceFill([
            'active' => true,
            'activated_at' => $market->activated_at ?? Carbon::now(),
        ])->save();

        return response()->json($market->fresh());
    }

    /**
     * Disable a market. Existing orders are untouched and remain viewable; the
     * market simply disappears from the selector and no new orders can use it.
     */
    public function disable(Market $market)
    {
        $market->forceFill(['active' => false])->save();

        return response()->json($market->fresh());
    }

    public function sync(Market $market, SheetSyncService $sync)
    {
        $result = $sync->syncMarket($market);

        return response()->json($result);
    }

    public function syncAll(SheetSyncService $sync)
    {
        return response()->json($sync->syncAll());
    }
}
