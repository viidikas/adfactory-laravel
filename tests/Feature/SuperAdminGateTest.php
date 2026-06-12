<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The AD.FACTORY operator panel (`/`) and every admin API are restricted to the
 * super-admin email allowlist (config/adfactory.php → super_admins). Ordinary
 * admins and growth leads are sent to the Growth Portal.
 */
class SuperAdminGateTest extends TestCase
{
    use RefreshDatabase;

    // ── Web panel (`/`) ─────────────────────────────────────────────

    public function test_super_admin_can_load_adfactory_panel(): void
    {
        // admin() registers the user on the super-admin allowlist.
        $this->asUser($this->admin())->get('/')->assertStatus(200);
    }

    public function test_ordinary_admin_is_redirected_from_panel_to_portal(): void
    {
        $this->asUser($this->nonSuperAdmin())->get('/')->assertRedirect('/portal');
    }

    public function test_growth_lead_is_redirected_from_panel_to_portal(): void
    {
        $this->asUser($this->lead())->get('/')->assertRedirect('/portal');
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/')->assertRedirect('/login');
    }

    // ── Admin APIs ──────────────────────────────────────────────────

    public function test_markets_admin_api_allows_super_admin(): void
    {
        $this->asUser($this->admin())
            ->postJson('/api/markets', ['code' => 'NO', 'name' => 'Norway', 'brand' => 'Creditstar'])
            ->assertStatus(201);
    }

    public function test_markets_admin_api_blocks_ordinary_admin(): void
    {
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $copy = $this->copy($market, ['copy_key' => 'k', 'enabled' => false]);

        $this->asUser($this->nonSuperAdmin())
            ->putJson("/api/markets/{$market->id}/copies/{$copy->id}", ['enabled' => true])
            ->assertStatus(403);

        $this->assertFalse($copy->fresh()->enabled);
    }

    public function test_markets_admin_api_blocks_growth_lead(): void
    {
        $this->asUser($this->lead())
            ->postJson('/api/markets', ['code' => 'NO', 'name' => 'Norway', 'brand' => 'Creditstar'])
            ->assertStatus(403);
    }

    // ── Allowlist semantics ─────────────────────────────────────────

    public function test_super_admin_match_is_case_insensitive(): void
    {
        $user = $this->nonSuperAdmin(['email' => 'Mixed@Case.EE']);
        $this->assertFalse($user->isSuperAdmin());

        $this->allowSuperAdmin('mixed@case.ee');
        $this->assertTrue($user->fresh()->isSuperAdmin());
    }
}
