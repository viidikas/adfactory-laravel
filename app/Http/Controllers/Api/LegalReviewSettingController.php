<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalReviewAudit;
use App\Support\LegalReview;
use Illuminate\Http\Request;

/**
 * Super-admin control over the legal-review module switch. Registered under the
 * superadmin middleware group — a normal admin cannot reach it. Every actual
 * flip is written to the append-only legal_review_audits trail; the flag helper
 * busts its cache so the change takes effect live.
 */
class LegalReviewSettingController extends Controller
{
    public function toggle(Request $request)
    {
        $validated = $request->validate(['enabled' => 'required|boolean']);
        $new = (bool) $validated['enabled'];
        $old = LegalReview::enabled();

        // Only a real change is a "flip" — audit and persist only then.
        if ($new !== $old) {
            LegalReview::setEnabled($new);
            LegalReviewAudit::create([
                'user_id' => $request->user()?->id,
                'previous_enabled' => $old,
                'enabled' => $new,
                'created_at' => now(),
            ]);
        }

        return response()->json(['legal_review_enabled' => LegalReview::enabled()]);
    }
}
