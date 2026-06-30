<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts the legal clip-review surface (/legal and the review API) to users
 * with role = legal. Mirrors SuperAdmin's session→authUser resolution. Anyone
 * else — leads, admins, super admins — is refused (403 for API, redirected to
 * their own home for web), so the legal surface stays narrow: clip review only.
 */
class Legal
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

        $request->attributes->set('authUser', $user);
        $request->setUserResolver(fn () => $user);

        if (! $user->isLegal()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Legal access required.'], 403);
            }

            return redirect($user->isSuperAdmin() ? '/' : '/portal');
        }

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
