<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            'user_id' => 'sometimes|exists:users,id',
            'user_name' => 'sometimes|string',
            'brand' => 'sometimes|string|in:Creditstar,Monefit',
            'market' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.clipId' => 'required|string',
            'items.*.clipName' => 'required|string',
            'items.*.slate' => 'required|string',
            'items.*.category' => 'required|string',
            'items.*.actor' => 'sometimes|string',
            'items.*.copyKey' => 'sometimes|string',
            'items.*.copyText' => 'sometimes|array',
            'items.*.langs' => 'required|array|min:1',
            'items.*.designs' => 'sometimes|array',
        ]);

        $order = Order::create([
            'user_id' => $validated['user_id'] ?? $request->user()->id,
            'brand' => $validated['brand'] ?? 'Creditstar',
            'status' => 'pending',
            'market' => $validated['market'] ?? null,
            'note' => $validated['note'] ?? null,
        ]);

        foreach ($validated['items'] as $itemData) {
            OrderItem::create([
                'order_id' => $order->id,
                'clip_id' => $itemData['clipId'],
                'clip_name' => $itemData['clipName'],
                'slate' => $itemData['slate'],
                'category' => $itemData['category'],
                'actor' => $itemData['actor'] ?? '',
                'copy_key' => $itemData['copyKey'] ?? '',
                'copy_text' => $itemData['copyText'] ?? null,
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
            'status' => $order->status,
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
            'status' => 'sometimes|in:pending,processing,ready',
            'note' => 'sometimes|nullable|string|max:2000',
            'rendered_clips' => 'sometimes|nullable|array',
        ]);

        $order->update($validated);

        return response()->json($order->fresh()->load('items'));
    }
}
