<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Authenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->session()->get('auth_user_id');

        if (! $userId) {
            return $this->unauthenticated($request);
        }

        $user = User::find($userId);

        if (! $user) {
            $request->session()->forget('auth_user_id');
            return $this->unauthenticated($request);
        }

        // Set user on request so controllers/middleware can access it
        $request->attributes->set('authUser', $user);
        // Also make it available via $request->user() pattern for convenience
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }

    protected function unauthenticated(Request $request): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return redirect('/login');
    }
}
