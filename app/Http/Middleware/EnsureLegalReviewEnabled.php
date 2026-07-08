<?php

namespace App\Http\Middleware;

use App\Support\LegalReview;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the legal clip-review API on the legal-review module switch. When the
 * module is OFF the whole review surface is dormant, so these routes behave as
 * if they do not exist (404). Kept as a runtime check rather than conditional
 * route registration so the switch takes effect live, even with route caching.
 */
class EnsureLegalReviewEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(LegalReview::enabled(), 404);

        return $next($request);
    }
}
