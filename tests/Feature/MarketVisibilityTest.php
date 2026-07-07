<?php

namespace Tests\Feature;

use App\Models\DeliveredClip;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Locks Market::isVisibleTo() — the single canonical read-visibility rule
 * shared by DeliveredClipController::userCanSee() and CopyController: admins see
 * every market; everyone else sees only active ones. Covered both directly on
 * the model and end-to-end through a controller that gates on it, so the rule
 * can't regress silently.
 *
 * NB: this is NOT the order-placement gate (OrderController requires an active
 * market even for admins) — a deliberately separate, stricter rule.
 */
class MarketVisibilityTest extends TestCase
{
    use RefreshDatabase;

    // ── Direct model rule ────────────────────────────────────────────

    public function test_growth_lead_sees_active_markets_but_not_inactive(): void
    {
        $lead = $this->lead();

        $this->assertTrue($this->market(['code' => 'FI', 'active' => true])->isVisibleTo($lead));
        $this->assertFalse($this->market(['code' => 'EE', 'active' => false])->isVisibleTo($lead));
    }

    public function test_admin_sees_both_active_and_inactive_markets(): void
    {
        $admin = $this->admin();

        $this->assertTrue($this->market(['code' => 'FI', 'active' => true])->isVisibleTo($admin));
        $this->assertTrue($this->market(['code' => 'EE', 'active' => false])->isVisibleTo($admin));
    }

    public function test_legal_and_null_user_follow_the_non_admin_rule(): void
    {
        $legal = $this->legal();
        $active = $this->market(['code' => 'FI', 'active' => true]);
        $inactive = $this->market(['code' => 'EE', 'active' => false]);

        // Legal is not an admin: active only.
        $this->assertTrue($active->isVisibleTo($legal));
        $this->assertFalse($inactive->isVisibleTo($legal));

        // No user (defensive): active only, never crashes.
        $this->assertTrue($active->isVisibleTo(null));
        $this->assertFalse($inactive->isVisibleTo(null));
    }

    // ── End-to-end through the controller gate (userCanSee) ───────────

    public function test_lead_is_blocked_403_from_an_inactive_market(): void
    {
        $inactive = $this->market(['code' => 'FI', 'active' => false]);

        $this->asUser($this->lead())
            ->getJson('/api/delivered-clips?market_id='.$inactive->id)
            ->assertStatus(403);
    }

    public function test_admin_can_reach_an_inactive_market(): void
    {
        $inactive = $this->market(['code' => 'FI', 'active' => false]);
        DeliveredClip::create([
            'market_id' => $inactive->id,
            'name' => 'Hidden',
            'file_path' => 'delivered/x.mp4',
            'file_size' => 1,
            'review_status' => 'approved',
        ]);

        $this->asUser($this->admin())
            ->getJson('/api/delivered-clips?market_id='.$inactive->id)
            ->assertOk()
            ->assertJsonFragment(['name' => 'Hidden']);
    }
}
