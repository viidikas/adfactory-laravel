<?php

namespace Tests\Feature;

use App\Models\DeliveredClip;
use App\Models\DeliveredClipReview;
use App\Models\LegalReviewAudit;
use App\Support\LegalReview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The legal-review module switch. TestCase::setUp enables the module by default,
 * so the existing DeliveredClipTest / LegalReviewTest suites are the ON
 * regression guard. These tests cover the new OFF behavior, the audited
 * super-admin-only toggle, and that toggling back ON restores the gate + history.
 */
class LegalReviewToggleTest extends TestCase
{
    use RefreshDatabase;

    private function clipOnDisk($market, array $attrs = []): DeliveredClip
    {
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO-BYTES');

        return DeliveredClip::create(array_merge([
            'market_id' => $market->id,
            'name' => 'Hero',
            'file_path' => "delivered/{$market->id}/clip.mp4",
            'file_size' => 11,
            'uploaded_by' => $this->admin()->id,
        ], $attrs));
    }

    // ── OFF: the review gate is gone, market gate stays ──────────────

    public function test_off_lead_downloads_a_pending_clip_in_a_visible_market(): void
    {
        Storage::fake('local');
        LegalReview::setEnabled(false);
        $market = $this->market(['code' => 'FI', 'active' => true]);
        $clip = $this->clipOnDisk($market, ['review_status' => 'pending']);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/download")
            ->assertOk()
            ->assertDownload('Hero.mp4');
    }

    /**
     * DECISION (see passesReviewGate): with the module OFF, DECLINED clips are
     * also downloadable — the gate is fully gone. Isolated to one conditional so
     * it can flip to "still block declined" later.
     */
    public function test_off_lead_downloads_a_declined_clip(): void
    {
        Storage::fake('local');
        LegalReview::setEnabled(false);
        $market = $this->market(['code' => 'FI', 'active' => true]);
        $clip = $this->clipOnDisk($market, ['review_status' => 'declined', 'decline_reason' => 'Misleading APR']);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/download")
            ->assertOk();
    }

    public function test_off_market_visibility_gate_still_blocks_invisible_market(): void
    {
        Storage::fake('local');
        LegalReview::setEnabled(false);
        // Inactive market → not visible to leads. The review gate being off must
        // NOT open the market gate.
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $clip = $this->clipOnDisk($market, ['review_status' => 'pending']);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/download")
            ->assertStatus(403);
    }

    public function test_off_lead_streams_a_pending_clip(): void
    {
        Storage::fake('local');
        LegalReview::setEnabled(false);
        $market = $this->market(['code' => 'FI', 'active' => true]);
        $clip = $this->clipOnDisk($market, ['review_status' => 'pending']);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/stream")
            ->assertOk();
    }

    // ── OFF: legal surface is hidden ─────────────────────────────────

    public function test_off_legal_route_redirects_to_disabled_and_api_is_gone(): void
    {
        LegalReview::setEnabled(false);
        $legal = $this->legal();

        // /legal review surface is unreachable — bounced to the neutral page.
        $this->asUser($legal)->get('/legal')->assertRedirect('/review-disabled');
        // No review queue / pending-count exposed while OFF.
        $this->asUser($legal)->getJson('/api/legal/pending-count')->assertStatus(404);
        $this->asUser($legal)->getJson('/api/legal/delivered-clips')->assertStatus(404);
        // The neutral page itself is reachable (not a broken 404).
        $this->asUser($legal)->get('/review-disabled')->assertOk();
    }

    public function test_on_legal_surface_is_reachable(): void
    {
        // setUp leaves the module ON.
        $legal = $this->legal();

        $this->asUser($legal)->get('/legal')->assertOk();
        $this->asUser($legal)->getJson('/api/legal/pending-count')->assertOk()->assertJsonStructure(['count']);
        // With the module ON there is nothing to show at the disabled page.
        $this->asUser($legal)->get('/review-disabled')->assertRedirect('/legal');
    }

    // ── The toggle: super-admin only, audited ────────────────────────

    public function test_toggle_is_super_admin_only(): void
    {
        // Plain admin (not on the super-admin allowlist) → blocked.
        $this->asUser($this->nonSuperAdmin())
            ->putJson('/api/legal-review', ['enabled' => false])
            ->assertStatus(403);
        // Growth lead → blocked.
        $this->asUser($this->lead())
            ->putJson('/api/legal-review', ['enabled' => false])
            ->assertStatus(403);
        // The blocked calls changed nothing.
        $this->assertTrue(LegalReview::enabled());
        $this->assertSame(0, LegalReviewAudit::count());
    }

    public function test_super_admin_toggle_flips_flag_and_writes_audit(): void
    {
        $admin = $this->admin(); // allowlisted super-admin

        $this->asUser($admin)
            ->putJson('/api/legal-review', ['enabled' => false])
            ->assertOk()
            ->assertJson(['legal_review_enabled' => false]);

        $this->assertFalse(LegalReview::enabled());

        $audit = LegalReviewAudit::firstOrFail();
        $this->assertSame($admin->id, $audit->user_id);
        $this->assertTrue($audit->previous_enabled);   // was ON (setUp default)
        $this->assertFalse($audit->enabled);           // → OFF
    }

    public function test_toggle_no_op_writes_no_audit(): void
    {
        // Already ON (setUp) → enabling again is a no-op.
        $this->asUser($this->admin())
            ->putJson('/api/legal-review', ['enabled' => true])
            ->assertOk();

        $this->assertSame(0, LegalReviewAudit::count());
    }

    // ── OFF → ON restores the gate and prior history ─────────────────

    public function test_toggling_off_then_on_restores_gate_and_history(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        $clip = $this->clipOnDisk($market, ['review_status' => 'pending']);
        // A prior review-history row that must survive the round trip.
        DeliveredClipReview::create([
            'delivered_clip_id' => $clip->id,
            'user_id' => $this->legal()->id,
            'action' => DeliveredClipReview::ACTION_RESET,
        ]);

        // ON (default): pending clip is gated for a lead.
        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertStatus(403);

        // OFF: downloadable.
        LegalReview::setEnabled(false);
        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertOk();

        // ON again: gate re-applies, and the retained status/history is intact.
        LegalReview::setEnabled(true);
        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertStatus(403);

        $this->assertSame('pending', $clip->fresh()->review_status);
        $this->assertSame(1, DeliveredClipReview::where('delivered_clip_id', $clip->id)->count());
    }
}
