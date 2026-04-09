<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            User::select('id', 'name', 'email', 'role', 'market')
                ->orderBy('role', 'asc')
                ->orderBy('name', 'asc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,growth_lead',
            'market' => 'nullable|string|max:10',
        ]);

        if (! empty($validated['market'])) {
            $validated['market'] = strtoupper($validated['market']);
        }

        $user = User::create($validated);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|required|in:admin,growth_lead',
            'market' => 'nullable|string|max:10',
        ]);

        if (! empty($validated['market'])) {
            $validated['market'] = strtoupper($validated['market']);
        }

        $user->update($validated);

        return response()->json($user, 200);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent self-deletion
        $authUser = $request->attributes->get('authUser');
        if ($authUser && $authUser->id === $user->id) {
            return response()->json(['message' => 'You cannot delete yourself.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.'], 200);
    }
}
