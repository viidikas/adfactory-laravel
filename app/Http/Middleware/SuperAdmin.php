<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts the AD.FACTORY operator panel (`/`) and every admin API to the
 * super-admin email allowlist (config/adfactory.php → super_admins). Ordinary
 * `admin`-role users that are not on the list are treated like growth leads and
 * sent to the portal.
 */
class SuperAdmin
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

        // Make the resolved user available to controllers/middleware downstream.
        $request->attributes->set('authUser', $user);
        $request->setUserResolver(fn () => $user);

        if (! $user->isSuperAdmin()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Super-admin access required.'], 403);
            }

            return redirect('/portal');
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
