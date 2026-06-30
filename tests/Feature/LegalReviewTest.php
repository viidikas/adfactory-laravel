<?php

namespace Tests\Feature;

use App\Models\DeliveredClip;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Legal role + clip-by-clip review. The legal surface is narrow (the /legal
 * review view + review API only): legal users cannot reach the operator panel,
 * admin APIs, or the portal as a lead. Approve/decline write append-only audit
 * rows, and the download gate enforces the result.
 */
class LegalReviewTest extends TestCase
{
    use RefreshDatabase;

    private function makeClip($market, array $attrs = []): DeliveredClip
    {
        return DeliveredClip::create(array_merge([
            'market_id' => $market->id,
            'name' => 'Hero',
            'file_path' => "delivered/{$market->id}/clip.mp4",
            'file_size' => 1234,
            'uploaded_by' => $this->admin()->id,
        ], $attrs));
    }

    // ── Role routing / access ───────────────────────────────────────

    public function test_legal_user_reaches_the_legal_view(): void
    {
        $this->asUser($this->legal())->get('/legal')->assertOk();
    }

    public function test_legal_user_is_bounced_off_the_portal_to_legal(): void
    {
        $this->asUser($this->legal())->get('/portal')->assertRedirect('/legal');
    }

    public function test_legal_user_cannot_reach_the_operator_panel(): void
    {
        // Not a super admin → the panel redirects them away (toward /legal).
        $this->asUser($this->legal())->get('/')->assertStatus(302);
    }

    public function test_legal_user_cannot_reach_an_admin_api(): void
    {
        $this->asUser($this->legal())->getJson('/api/users')->assertStatus(403);
    }

    public function test_lead_and_admin_cannot_reach_the_legal_view(): void
    {
        $this->asUser($this->lead())->get('/legal')->assertRedirect('/portal');
        $this->asUser($this->admin())->get('/legal')->assertRedirect('/');
    }

    public function test_only_legal_can_call_the_review_api(): void
    {
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);

        // Unauthenticated first, before any session is set on the test instance.
        $this->postJson("/api/legal/delivered-clips/{$clip->id}/approve")->assertStatus(401);
        $this->asUser($this->lead())->postJson("/api/legal/delivered-clips/{$clip->id}/approve")->assertStatus(403);
        $this->asUser($this->admin())->postJson("/api/legal/delivered-clips/{$clip->id}/approve")->assertStatus(403);
    }

    // ── Review workflow ─────────────────────────────────────────────

    public function test_legal_approves_a_clip_and_writes_audit(): void
    {
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);
        $legal = $this->legal();

        $this->asUser($legal)->postJson("/api/legal/delivered-clips/{$clip->id}/approve")
            ->assertOk()->assertJsonPath('review_status', 'approved');

        $clip->refresh();
        $this->assertSame('approved', $clip->review_status);
        $this->assertSame($legal->id, $clip->reviewed_by);
        $this->assertNotNull($clip->reviewed_at);
        $this->assertDatabaseHas('delivered_clip_reviews', [
            'delivered_clip_id' => $clip->id, 'user_id' => $legal->id, 'action' => 'approved',
        ]);
    }

    public function test_decline_requires_a_reason(): void
    {
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);

        $this->asUser($this->legal())->postJson("/api/legal/delivered-clips/{$clip->id}/decline", ['reason' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('reason');

        $this->assertSame('pending', $clip->fresh()->review_status);
        $this->assertDatabaseCount('delivered_clip_reviews', 0);
    }

    public function test_legal_declines_with_reason_and_writes_audit(): void
    {
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);
        $legal = $this->legal();

        $this->asUser($legal)->postJson("/api/legal/delivered-clips/{$clip->id}/decline", ['reason' => 'Unsupported APR claim'])
            ->assertOk()->assertJsonPath('review_status', 'declined');

        $clip->refresh();
        $this->assertSame('declined', $clip->review_status);
        $this->assertSame('Unsupported APR claim', $clip->decline_reason);
        $this->assertDatabaseHas('delivered_clip_reviews', [
            'delivered_clip_id' => $clip->id, 'user_id' => $legal->id, 'action' => 'declined',
        ]);
    }

    public function test_legal_index_lists_clips_with_reason_visible(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->makeClip($market, ['review_status' => 'declined', 'decline_reason' => 'Reason X']);

        $row = collect($this->asUser($this->legal())->getJson('/api/legal/delivered-clips')->assertOk()->json())->first();
        $this->assertSame('declined', $row['review_status']);
        $this->assertSame('Reason X', $row['decline_reason']);
    }

    public function test_approval_opens_the_download_gate_for_leads(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO');
        $clip = $this->makeClip($market); // pending

        // Blocked before review…
        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertStatus(403);

        // …legal approves…
        $this->asUser($this->legal())->postJson("/api/legal/delivered-clips/{$clip->id}/approve")->assertOk();

        // …now downloadable.
        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertOk();
    }
}
