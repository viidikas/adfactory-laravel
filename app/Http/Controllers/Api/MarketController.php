<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
use App\Models\Market;
use App\Models\MarketConfirmation;
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

        $query = Market::query()->withCount('copies')->with('confirmedBy')->orderBy('code');
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
                'confirmed' => $m->isConfirmed(),
                'confirmed_by' => optional($m->confirmedBy)->name,
                'confirmed_at' => optional($m->confirmed_at)->toIso8601String(),
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

        if (! $market->isConfirmed()) {
            return response()->json([
                'message' => "Cannot enable {$market->code}: its copies are not confirmed. Review and confirm the copies first.",
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

    /**
     * Admin Copies review view: read-only copies + sync metadata + confirmation
     * status. Google Sheets stays the single source of truth — nothing here is
     * editable.
     */
    public function copies(Market $market)
    {
        return response()->json($this->detail($market));
    }

    /**
     * Confirm that the market's synced copies match the legally approved sheet.
     * Records confirmed_hash = current content_hash and writes an audit row.
     */
    public function confirm(Request $request, Market $market)
    {
        if (! $market->copies()->exists()) {
            return response()->json([
                'message' => "Cannot confirm {$market->code}: it has no synced copies. Sync the market first.",
            ], 422);
        }

        $hash = $market->computeContentHash();

        $market->forceFill([
            'content_hash' => $hash,
            'confirmed_at' => Carbon::now(),
            'confirmed_by' => $request->user()->id,
            'confirmed_hash' => $hash,
        ])->save();

        $market->confirmations()->create([
            'user_id' => $request->user()->id,
            'action' => MarketConfirmation::ACTION_CONFIRMED,
            'content_hash' => $hash,
        ]);

        return response()->json($this->detail($market->fresh()));
    }

    /**
     * Manually revoke a confirmation. Like a sync-triggered invalidation, this
     * deactivates the market (existing orders untouched) and is audited.
     */
    public function revoke(Request $request, Market $market)
    {
        $market->confirmations()->create([
            'user_id' => $request->user()->id,
            'action' => MarketConfirmation::ACTION_MANUALLY_REVOKED,
            'content_hash' => $market->content_hash,
        ]);

        $market->forceFill([
            'confirmed_at' => null,
            'confirmed_by' => null,
            'confirmed_hash' => null,
            'active' => false,
        ])->save();

        return response()->json($this->detail($market->fresh()));
    }

    /**
     * Full admin detail payload for one market: metadata, confirmation status,
     * latest audit event, and the read-only copy set.
     *
     * @return array<string, mixed>
     */
    private function detail(Market $market): array
    {
        $market->loadCount('copies');
        $latest = $market->confirmations()->with('user')->latest('id')->first();

        return [
            'id' => $market->id,
            'code' => $market->code,
            'name' => $market->name,
            'brand' => $market->brand,
            'active' => $market->active,
            'has_disclaimer' => $market->has_disclaimer,
            'copy_count' => $market->copies_count,
            'last_synced_at' => optional($market->last_synced_at)->toIso8601String(),
            'content_hash' => $market->content_hash,
            'confirmation' => [
                'confirmed' => $market->isConfirmed(),
                'confirmed_at' => optional($market->confirmed_at)->toIso8601String(),
                'confirmed_by' => optional($market->confirmedBy)->name,
                'last_action' => $latest?->action,
                'last_action_at' => optional($latest?->created_at)->toIso8601String(),
                'last_action_by' => optional($latest?->user)->name,
            ],
            'copies' => $market->copies()->orderBy('category')->orderBy('copy_key')->get()->map(fn (Copy $c) => [
                'copy_key' => $c->copy_key,
                'category' => $c->category,
                'requires_disclaimer' => $c->requires_disclaimer,
                'copy_text' => $c->copy_text,
            ]),
        ];
    }
}
