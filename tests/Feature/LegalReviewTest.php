<?php

namespace Tests\Feature;

use App\Models\Copy;
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

        $json = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=reviewed')->assertOk()->json();
        $row = collect($json['data'])->first();
        $this->assertSame('declined', $row['review_status']);
        $this->assertSame('Reason X', $row['decline_reason']);
    }

    // ── Queue organisation: sections, sort, filters, count ──────────

    /** Create a clip whose derived category resolves from a matching market copy. */
    private function clipInCategory($market, string $en, string $category, array $attrs = []): DeliveredClip
    {
        // Reuse one copy per (en, category) so several clips can share a category.
        Copy::firstOrCreate(
            ['market_id' => $market->id, 'copy_key' => $en.'_'.substr(md5($en.$category), 0, 6)],
            ['copy_text' => ['en' => $en], 'category' => $category, 'shot' => 'PU1', 'brand' => 'Creditstar', 'enabled' => true]
        );

        return $this->makeClip($market, array_merge(['copy' => $en], $attrs));
    }

    public function test_pending_queue_and_reviewed_history_are_separate(): void
    {
        $m = $this->market(['code' => 'FI']);
        $this->makeClip($m, ['name' => 'p1', 'review_status' => 'pending']);
        $this->makeClip($m, ['name' => 'a1', 'review_status' => 'approved']);
        $this->makeClip($m, ['name' => 'd1', 'review_status' => 'declined']);

        $pending = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=pending')->assertOk()->json();
        $this->assertSame(['p1'], collect($pending['data'])->pluck('name')->all());

        $reviewed = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=reviewed')->assertOk()->json();
        $this->assertEqualsCanonicalizing(['a1', 'd1'], collect($reviewed['data'])->pluck('name')->all());
        $this->assertSame(2, $reviewed['total']);
    }

    public function test_pending_walk_order_market_then_category_then_slate_then_format(): void
    {
        $ee = $this->market(['code' => 'EE']);
        $fi = $this->market(['code' => 'FI']);

        // EE clip sorts first (market). Within FI: Cat A before Cat B; S1 before
        // S2; 16:9 before 9:16.
        $a = $this->makeClip($ee, ['name' => 'a', 'slate' => 'PU1', 'format' => '16:9']);
        $b = $this->clipInCategory($fi, 'AlphaMsg', 'Cat A', ['name' => 'b', 'slate' => 'S1', 'format' => '16:9']);
        $c = $this->clipInCategory($fi, 'AlphaMsg', 'Cat A', ['name' => 'c', 'slate' => 'S1', 'format' => '9:16']);
        $d = $this->clipInCategory($fi, 'AlphaMsg', 'Cat A', ['name' => 'd', 'slate' => 'S2', 'format' => '16:9']);
        $e = $this->clipInCategory($fi, 'BetaMsg', 'Cat B', ['name' => 'e', 'slate' => 'S1', 'format' => '16:9']);

        $json = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=pending&sort=walk')->assertOk()->json();

        $this->assertSame([$a->id, $b->id, $c->id, $d->id, $e->id], collect($json['data'])->pluck('id')->all());
    }

    public function test_pending_sort_toggles_oldest_and_newest(): void
    {
        $m = $this->market(['code' => 'FI']);
        $old = $this->makeClip($m, ['name' => 'old']);
        $new = $this->makeClip($m, ['name' => 'new']);
        $old->forceFill(['created_at' => now()->subDays(3)])->save();
        $new->forceFill(['created_at' => now()->subHour()])->save();

        $oldest = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=pending&sort=oldest')->json();
        $this->assertSame([$old->id, $new->id], collect($oldest['data'])->pluck('id')->all());

        $newest = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=pending&sort=newest')->json();
        $this->assertSame([$new->id, $old->id], collect($newest['data'])->pluck('id')->all());
    }

    public function test_reviewed_history_sorts_by_reviewed_at_desc_and_filters_by_outcome(): void
    {
        $m = $this->market(['code' => 'FI']);
        $first = $this->makeClip($m, ['name' => 'first', 'review_status' => 'approved', 'reviewed_at' => now()->subDays(2)]);
        $last = $this->makeClip($m, ['name' => 'last', 'review_status' => 'declined', 'reviewed_at' => now()->subHour(), 'decline_reason' => 'no']);

        $json = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=reviewed')->json();
        $this->assertSame([$last->id, $first->id], collect($json['data'])->pluck('id')->all());

        $declined = $this->asUser($this->legal())->getJson('/api/legal/delivered-clips?status=reviewed&outcome=declined')->json();
        $this->assertSame([$last->id], collect($declined['data'])->pluck('id')->all());
    }

    public function test_field_filters_and_search_combine_with_and(): void
    {
        $fi = $this->market(['code' => 'FI']);
        $ee = $this->market(['code' => 'EE']);
        $match = $this->makeClip($fi, ['name' => 'Kemal hero', 'format' => '9:16', 'brand' => 'Creditstar', 'lang' => 'FI']);
        $this->makeClip($fi, ['name' => 'Kemal hero', 'format' => '16:9', 'brand' => 'Creditstar', 'lang' => 'FI']); // wrong format
        $this->makeClip($ee, ['name' => 'Kemal hero', 'format' => '9:16', 'brand' => 'Creditstar', 'lang' => 'FI']); // wrong market
        $this->makeClip($fi, ['name' => 'Other', 'format' => '9:16', 'brand' => 'Creditstar', 'lang' => 'FI']);      // wrong name

        $json = $this->asUser($this->legal())
            ->getJson('/api/legal/delivered-clips?status=pending&market=FI&format=9:16&brand=Creditstar&language=FI&search=kemal')
            ->assertOk()->json();

        $this->assertSame([$match->id], collect($json['data'])->pluck('id')->all());
    }

    public function test_pending_count_endpoint_decrements_after_a_decision(): void
    {
        $m = $this->market(['code' => 'FI']);
        $c1 = $this->makeClip($m, ['name' => 'c1']);
        $c2 = $this->makeClip($m, ['name' => 'c2']);

        $this->assertSame(2, $this->asUser($this->legal())->getJson('/api/legal/pending-count')->assertOk()->json('count'));

        $this->asUser($this->legal())->postJson("/api/legal/delivered-clips/{$c1->id}/approve")->assertOk();
        $this->assertSame(1, $this->asUser($this->legal())->getJson('/api/legal/pending-count')->json('count'));

        $this->asUser($this->legal())->postJson("/api/legal/delivered-clips/{$c2->id}/decline", ['reason' => 'nope'])->assertOk();
        $this->assertSame(0, $this->asUser($this->legal())->getJson('/api/legal/pending-count')->json('count'));
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

    // ── Three states + batch/creative filtering ─────────────────────

    public function test_index_serves_pending_approved_declined_distinctly_with_counts(): void
    {
        $m = $this->market(['code' => 'FI']);
        $this->makeClip($m, ['name' => 'p', 'review_status' => 'pending']);
        $this->makeClip($m, ['name' => 'a', 'review_status' => 'approved']);
        $this->makeClip($m, ['name' => 'd', 'review_status' => 'declined', 'decline_reason' => 'x']);
        $u = $this->legal();

        $p = $this->asUser($u)->getJson('/api/legal/delivered-clips?status=pending')->assertOk()->json();
        $this->assertSame(['p'], collect($p['data'])->pluck('name')->all());
        $this->assertSame(['a'], collect($this->asUser($u)->getJson('/api/legal/delivered-clips?status=approved')->json('data'))->pluck('name')->all());
        $this->assertSame(['d'], collect($this->asUser($u)->getJson('/api/legal/delivered-clips?status=declined')->json('data'))->pluck('name')->all());

        $this->assertSame(['pending' => 1, 'approved' => 1, 'declined' => 1], $p['counts']);
    }

    public function test_creative_and_batch_filters_return_matching_and_combine(): void
    {
        $m = $this->market(['code' => 'FI']);
        $a16 = $this->makeClip($m, ['name' => 'A16', 'creative_key' => 'creativeA', 'upload_batch_id' => 'batch-1', 'format' => '16:9']);
        $a9 = $this->makeClip($m, ['name' => 'A9', 'creative_key' => 'creativeA', 'upload_batch_id' => 'batch-1', 'format' => '9:16']);
        $b16 = $this->makeClip($m, ['name' => 'B16', 'creative_key' => 'creativeB', 'upload_batch_id' => 'batch-2', 'format' => '16:9']);
        $u = $this->legal();

        $byCreative = $this->asUser($u)->getJson('/api/legal/delivered-clips?status=pending&creative=creativeA')->assertOk()->json();
        $this->assertEqualsCanonicalizing([$a16->id, $a9->id], collect($byCreative['data'])->pluck('id')->all());
        // Option lists come from the full status set, not the filtered rows.
        $this->assertEqualsCanonicalizing(['creativeA', 'creativeB'], $byCreative['filters']['creatives']);

        $byBatch = $this->asUser($u)->getJson('/api/legal/delivered-clips?status=pending&batch=batch-2')->json();
        $this->assertSame([$b16->id], collect($byBatch['data'])->pluck('id')->all());

        // Combine creative + format (AND).
        $combined = $this->asUser($u)->getJson('/api/legal/delivered-clips?status=pending&creative=creativeA&format=9:16')->json();
        $this->assertSame([$a9->id], collect($combined['data'])->pluck('id')->all());
    }
}
