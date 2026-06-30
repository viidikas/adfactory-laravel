<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveredClip;
use App\Models\DeliveredClipReview;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Legal clip-by-clip review. Gated by the `legal` middleware (role = legal only).
 * Each decision (approve / decline) updates the clip and writes an append-only
 * audit row. This is the ONLY surface that changes a clip's review_status from a
 * human decision — admins cannot approve/decline. The download gate
 * (DeliveredClipController@download) is what actually enforces the result.
 */
class LegalReviewController extends Controller
{
    /**
     * Every delivered clip across ALL markets, with its review trail, for the
     * review queue (pending) and the read-only reviewed history. Legal is not
     * market-scoped (single global reviewer); say the word to scope by assignment.
     */
    public function index()
    {
        $clips = DeliveredClip::with(['market', 'uploadedBy', 'reviewer'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($clips->map(fn (DeliveredClip $c) => $this->present($c)));
    }

    /** Approve a clip — one decision per clip. Writes an approved audit row. */
    public function approve(Request $request, DeliveredClip $deliveredClip)
    {
        $deliveredClip->update([
            'review_status' => DeliveredClip::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => Carbon::now(),
            'decline_reason' => null,
        ]);

        $this->audit($deliveredClip, $request->user()->id, DeliveredClipReview::ACTION_APPROVED);

        return response()->json($this->present($deliveredClip->fresh(['market', 'uploadedBy', 'reviewer'])));
    }

    /** Decline a clip — requires a non-empty reason. Writes a declined audit row. */
    public function decline(Request $request, DeliveredClip $deliveredClip)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ], [
            'reason.required' => 'A reason is required to decline a clip.',
        ]);

        $deliveredClip->update([
            'review_status' => DeliveredClip::STATUS_DECLINED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => Carbon::now(),
            'decline_reason' => trim($validated['reason']),
        ]);

        $this->audit($deliveredClip, $request->user()->id, DeliveredClipReview::ACTION_DECLINED, trim($validated['reason']));

        return response()->json($this->present($deliveredClip->fresh(['market', 'uploadedBy', 'reviewer'])));
    }

    private function audit(DeliveredClip $clip, int $userId, string $action, ?string $reason = null): void
    {
        DeliveredClipReview::create([
            'delivered_clip_id' => $clip->id,
            'user_id' => $userId,
            'action' => $action,
            'reason' => $reason,
        ]);
    }

    /** @return array<string, mixed> */
    private function present(DeliveredClip $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'format' => $c->format,
            'slate' => $c->slate,
            'actor' => $c->actor,
            'design' => $c->design,
            'lang' => $c->lang,
            'copy' => $c->copy,
            'file_size' => (int) $c->file_size,
            'order_short' => $c->order_id ? substr((string) $c->order_id, 0, 8) : null,
            'market' => $c->market ? [
                'id' => $c->market->id,
                'code' => $c->market->code,
                'name' => $c->market->name,
                'brand' => $c->market->brand,
            ] : null,
            'thumbnail_url' => $c->thumbnail_path ? "/api/delivered-clips/{$c->id}/thumbnail" : null,
            'stream_url' => "/api/delivered-clips/{$c->id}/stream",
            'uploaded_by' => optional($c->uploadedBy)->name,
            'created_at' => optional($c->created_at)->toIso8601String(),
            'review_status' => $c->review_status,
            'reviewer' => optional($c->reviewer)->name,
            'reviewed_at' => optional($c->reviewed_at)->toIso8601String(),
            'decline_reason' => $c->decline_reason,
        ];
    }
}
