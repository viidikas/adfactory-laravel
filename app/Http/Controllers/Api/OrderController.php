<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
use App\Models\Market;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Order::with('items');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('brand')) {
            $query->where('brand', $request->input('brand'));
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json($orders->map(function ($order) {
            return [
                'id' => $order->id,
                'user_id' => $order->user_id,
                'user_name' => $order->user->name ?? '',
                'brand' => $order->brand ?? 'Creditstar',
                'status' => $order->status,
                'market_id' => $order->market_id,
                'market' => $order->market,
                'note' => $order->note,
                'rendered_clips' => $order->rendered_clips,
                'created' => $order->created_at->timestamp,
                'items' => $order->items->map(function ($item) {
                    return [
                        'clipId' => $item->clip_id,
                        'clipName' => $item->clip_name,
                        'slate' => $item->slate,
                        'category' => $item->category,
                        'actor' => $item->actor,
                        'copyKey' => $item->copy_key,
                        'copyText' => $item->copy_text,
                        'requiresDisclaimer' => $item->requires_disclaimer,
                        'langs' => $item->langs,
                        'designs' => $item->designs,
                    ];
                }),
            ];
        }));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_name' => 'sometimes|string',
            'market_id' => 'required|integer',
            'note' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.clipId' => 'required|string',
            'items.*.clipName' => 'required|string',
            'items.*.slate' => 'required|string',
            'items.*.category' => 'required|string',
            'items.*.actor' => 'sometimes|string',
            'items.*.copyKey' => 'required|string',
            'items.*.copyText' => 'sometimes|array',
            'items.*.langs' => 'required|array|min:1',
            'items.*.designs' => 'sometimes|array',
        ]);

        $market = Market::find($validated['market_id']);

        // An order may only ever be placed against an ACTIVE market — enforced
        // server-side regardless of what the client sends.
        if (! $market || ! $market->active) {
            return response()->json([
                'message' => $market
                    ? "Market {$market->code} is disabled. Pick another market."
                    : 'Selected market does not exist.',
                'error_code' => 'market_inactive',
            ], 422);
        }

        // Every item's copy must be an ENABLED copy of this market. Per-copy
        // enablement is the content gate, so only enabled copies are orderable;
        // this also keeps an order single-market and legally consistent.
        $copies = $market->copies()->where('enabled', true)->get()->keyBy('copy_key');

        foreach ($validated['items'] as $i => $itemData) {
            if (! $copies->has($itemData['copyKey'])) {
                return response()->json([
                    'message' => "Item {$i}: copy \"{$itemData['copyKey']}\" is not an enabled copy of market {$market->code}.",
                    'error_code' => 'copy_market_mismatch',
                ], 422);
            }
        }

        $order = Order::create([
            // Always the authenticated user — never trust a client-supplied owner.
            'user_id' => $request->user()->id,
            'market_id' => $market->id,
            // Keep the legacy label populated (= code) during the backfill window.
            'market' => $market->code,
            // Brand is derived from the market — never client-supplied — so the
            // dual-brand template logic stays correct without a separate choice.
            'brand' => $market->brand,
            'status' => 'pending',
            'note' => $validated['note'] ?? null,
        ]);

        foreach ($validated['items'] as $itemData) {
            /** @var Copy $copy */
            $copy = $copies->get($itemData['copyKey']);

            OrderItem::create([
                'order_id' => $order->id,
                'clip_id' => $itemData['clipId'],
                'clip_name' => $itemData['clipName'],
                'slate' => $itemData['slate'],
                'category' => $itemData['category'],
                'actor' => $itemData['actor'] ?? '',
                'copy_key' => $copy->copy_key,
                // Copy text + disclaimer flag come from the approved market copy,
                // not the client: growth leads cannot edit or remove them.
                'copy_text' => $copy->copy_text,
                'requires_disclaimer' => $copy->requires_disclaimer,
                'langs' => $itemData['langs'],
                'designs' => $itemData['designs'] ?? [],
            ]);
        }

        return response()->json($order->load('items'), 201);
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();

        if ($user->role !== 'admin' && $order->user_id !== $user->id) {
            abort(403, 'You do not have permission to view this order.');
        }

        $order->load('items');

        return response()->json([
            'id' => $order->id,
            'user_id' => $order->user_id,
            'user_name' => $order->user->name ?? '',
            'brand' => $order->brand ?? 'Creditstar',
            'status' => $order->status,
            'market_id' => $order->market_id,
            'market' => $order->market,
            'note' => $order->note,
            'rendered_clips' => $order->rendered_clips,
            'created' => $order->created_at->timestamp,
            'items' => $order->items->map(function ($item) {
                return [
                    'clipId' => $item->clip_id,
                    'clipName' => $item->clip_name,
                    'slate' => $item->slate,
                    'category' => $item->category,
                    'actor' => $item->actor,
                    'copyKey' => $item->copy_key,
                    'copyText' => $item->copy_text,
                    'requiresDisclaimer' => $item->requires_disclaimer,
                    'langs' => $item->langs,
                    'designs' => $item->designs,
                ];
            }),
        ]);
    }

    public function update(Request $request, Order $order)
    {
        $user = $request->user();

        if ($user->role !== 'admin') {
            abort(403, 'Only admins can update orders.');
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:pending,processing,ready,rejected',
            'market' => 'sometimes|nullable|string|max:100',
            'note' => 'sometimes|nullable|string|max:2000',
            'rendered_clips' => 'sometimes|nullable|array',
            'items' => 'sometimes|array|min:1',
            'items.*.clipId' => 'required_with:items|string',
            'items.*.clipName' => 'required_with:items|string',
            'items.*.slate' => 'required_with:items|string',
            'items.*.category' => 'required_with:items|string',
            'items.*.actor' => 'sometimes|string',
            'items.*.copyKey' => 'sometimes|string',
            'items.*.copyText' => 'sometimes|array',
            'items.*.langs' => 'required_with:items|array|min:1',
            'items.*.designs' => 'sometimes|array',
        ]);

        // Only allow item edits when not 'ready'
        if ($request->has('items') && $order->status === 'ready') {
            return response()->json(['message' => 'Cannot edit items on a ready order.'], 422);
        }

        \DB::transaction(function () use ($order, $validated) {
            // Update order fields (exclude items)
            $orderFields = collect($validated)->except('items')->toArray();
            if (! empty($orderFields)) {
                $order->update($orderFields);
            }

            // Replace items if provided
            if (isset($validated['items'])) {
                // Re-derive the disclaimer flag from the order's market copies so
                // it stays server-controlled even on admin edits. Resolve the
                // market by id — the `market` column (legacy code string) shadows
                // the market() relation, so $order->market is NOT the model.
                $market = $order->market_id ? Market::find($order->market_id) : null;
                $copies = $market
                    ? $market->copies()->get()->keyBy('copy_key')
                    : collect();

                $order->items()->delete();
                foreach ($validated['items'] as $itemData) {
                    $copy = $copies->get($itemData['copyKey'] ?? '');

                    OrderItem::create([
                        'order_id' => $order->id,
                        'clip_id' => $itemData['clipId'],
                        'clip_name' => $itemData['clipName'],
                        'slate' => $itemData['slate'],
                        'category' => $itemData['category'],
                        'actor' => $itemData['actor'] ?? '',
                        'copy_key' => $itemData['copyKey'] ?? '',
                        'copy_text' => $copy?->copy_text ?? $itemData['copyText'] ?? [],
                        'requires_disclaimer' => $copy?->requires_disclaimer ?? false,
                        'langs' => $itemData['langs'],
                        'designs' => $itemData['designs'] ?? [],
                    ]);
                }
            }
        });

        return response()->json($order->fresh()->load('items'));
    }

    public function destroy(Request $request, Order $order)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Only admins can delete orders.');
        }

        // order_items are removed via the FK's cascadeOnDelete.
        $order->delete();

        return response()->json(['ok' => true]);
    }
}
