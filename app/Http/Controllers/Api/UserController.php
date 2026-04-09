<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(
            User::select('id', 'name', 'email', 'role', 'market', 'avatar')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'sometimes|email|unique:users,email',
            'role' => 'sometimes|in:admin,growth_lead',
            'market' => 'nullable|string|max:100',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? strtolower(str_replace(' ', '.', $validated['name'])).'@creditstar.com',
            'role' => $validated['role'] ?? 'growth_lead',
            'market' => $validated['market'] ?? null,
        ]);

        return response()->json($user, 201);
    }
}
