<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
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

        $query = Market::query()
            ->withCount(['copies', 'copies as enabled_copies_count' => fn ($q) => $q->where('enabled', true), 'deliveredClips'])
            ->orderBy('code');
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
                'enabled_count' => $m->enabled_copies_count,
                'can_enable' => $m->enabled_copies_count > 0,
                'has_disclaimer' => $m->has_disclaimer,
                'delivered_count' => $m->delivered_clips_count,
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
     * Enable a market — an explicit admin action. Per-copy enablement is the
     * content gate, so a market may be enabled once at least one of its copies
     * has been enabled. Existing orders are untouched.
     */
    public function enable(Market $market)
    {
        if (! $market->copies()->where('enabled', true)->exists()) {
            return response()->json([
                'message' => "Cannot enable {$market->code}: no copies are enabled. Enable at least one copy first.",
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
     * Admin Copies review view: the market's copies with per-copy enable state +
     * sync metadata. Google Sheets stays the source of truth — copy text is
     * read-only; only the per-copy `enabled` flag is editable (via toggleCopy).
     */
    public function copies(Market $market)
    {
        return response()->json($this->detail($market));
    }

    /**
     * Toggle a single copy's enabled flag (admin). Only enabled copies are shown
     * to growth leads and accepted by order store(). The copy must belong to the
     * given market.
     */
    public function toggleCopy(Request $request, Market $market, Copy $copy)
    {
        abort_unless($copy->market_id === $market->id, 404);

        $validated = $request->validate(['enabled' => 'required|boolean']);

        if ($validated['enabled']) {
            $copy->forceFill([
                'enabled' => true,
                'enabled_at' => Carbon::now(),
                'enabled_by' => $request->user()->id,
            ])->save();
        } else {
            $copy->forceFill(['enabled' => false, 'enabled_at' => null, 'enabled_by' => null])->save();
        }

        return response()->json($this->detail($market->fresh()));
    }

    /**
     * Full admin detail payload for one market: metadata + the copy set with
     * per-copy enable state. Copies are read-only synced data; only their
     * `enabled` flag is mutable (via toggleCopy).
     *
     * @return array<string, mixed>
     */
    private function detail(Market $market): array
    {
        $market->loadCount(['copies', 'copies as enabled_copies_count' => fn ($q) => $q->where('enabled', true)]);

        $copies = $market->copies()->with('enabledBy')->orderBy('category')->orderBy('copy_key')->get();

        return [
            'id' => $market->id,
            'code' => $market->code,
            'name' => $market->name,
            'brand' => $market->brand,
            'active' => $market->active,
            'has_disclaimer' => $market->has_disclaimer,
            'copy_count' => $market->copies_count,
            'enabled_count' => $market->enabled_copies_count,
            'can_enable' => $market->enabled_copies_count > 0,
            'last_synced_at' => optional($market->last_synced_at)->toIso8601String(),
            // Language columns present in THIS market's copies, ordered local
            // language(s) first (alphabetical) and EN last as the reference.
            // EN is always included even if the market has no copies yet.
            'languages' => $this->presentLanguages($copies),
            'copies' => $copies->map(fn (Copy $c) => [
                'id' => $c->id,
                'copy_key' => $c->copy_key,
                'category' => $c->category,
                'shot' => $c->shot,
                'requires_disclaimer' => $c->requires_disclaimer,
                'enabled' => $c->enabled,
                'enabled_by' => optional($c->enabledBy)->name,
                'enabled_at' => optional($c->enabled_at)->toIso8601String(),
                'copy_text' => $c->copy_text,
            ]),
        ];
    }

    /**
     * The language codes that actually carry content across a market's copies,
     * ordered local language(s) first (alphabetical) and EN last as the
     * reference. EN is always included. A language is only listed if at least
     * one copy has non-empty text for it — so legacy padded copy_text
     * ({en:'x', et:'', …}) does not surface empty ET/FR/DE/ES columns.
     *
     * @param  \Illuminate\Support\Collection<int, Copy>  $copies
     * @return array<int, string>
     */
    private function presentLanguages($copies): array
    {
        $present = [];
        foreach ($copies as $c) {
            foreach (($c->copy_text ?? []) as $lang => $value) {
                if ($value !== null && $value !== '') {
                    $present[$lang] = true;
                }
            }
        }

        $nonEn = array_values(array_filter(array_keys($present), fn ($l) => $l !== 'en'));
        sort($nonEn);

        return [...$nonEn, 'en'];
    }
}
