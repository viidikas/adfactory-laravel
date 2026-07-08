<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\LegalReview;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bounces legal-role users away from the Growth Portal (and, via SuperAdmin's
 * redirect, the operator panel) to their own /legal review surface. Runs after
 * `auth`, so the resolved user is already on the request.
 */
class RejectLegal
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->attributes->get('authUser')
            ?? User::find($request->session()->get('auth_user_id'));

        if ($user && $user->isLegal()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Not available to legal reviewers.'], 403);
            }

            // Send them to the review queue when the module is ON, or the neutral
            // "review disabled" page when it is OFF.
            return redirect(LegalReview::enabled() ? '/legal' : '/review-disabled');
        }

        return $next($request);
    }
}
