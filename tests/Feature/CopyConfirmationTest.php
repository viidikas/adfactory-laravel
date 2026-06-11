<?php

namespace Tests\Feature;

use App\Models\Market;
use App\Models\MarketConfirmation;
use App\Models\Setting;
use App\Services\SheetSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CopyConfirmationTest extends TestCase
{
    use RefreshDatabase;

    private const CSV_V1 =
        "Category,Shot,Brand,EN,ET,Disclaimer\n".
        "Product Usage,PU1,Creditstar,Tap to invest,Puuduta,yes\n".
        "Travel and Holiday,TH1,Creditstar,Pack your bags,Paki,no\n";

    // Same keys, but ET text of the first row changed -> different content hash.
    private const CSV_V1_CHANGED =
        "Category,Shot,Brand,EN,ET,Disclaimer\n".
        "Product Usage,PU1,Creditstar,Tap to invest,CHANGED,yes\n".
        "Travel and Holiday,TH1,Creditstar,Pack your bags,Paki,no\n";

    private function freshMarket(): Market
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');

        return $this->market(['code' => 'FI', 'active' => false, 'has_disclaimer' => false]);
    }

    private function sync(Market $market): array
    {
        return app(SheetSyncService::class)->syncMarket($market->fresh());
    }

    // ── Hash stable across no-change syncs; confirmation survives ───

    public function test_hash_stable_across_no_change_sync_and_confirmation_survives(): void
    {
        Http::fake(['docs.google.com/*' => Http::response(self::CSV_V1, 200)]);
        $market = $this->freshMarket();

        $this->sync($market);
        $hash1 = $market->fresh()->content_hash;

        // Confirm via the endpoint.
        $this->asUser($this->admin())->postJson('/api/markets/'.$market->id.'/confirm')->assertStatus(200);
        $this->assertTrue($market->fresh()->isConfirmed());

        // Re-sync identical content.
        $this->sync($market);

        $fresh = $market->fresh();
        $this->assertEquals($hash1, $fresh->content_hash, 'hash must be stable across no-change syncs');
        $this->assertTrue($fresh->isConfirmed(), 'confirmation must survive a no-change sync');
        $this->assertDatabaseMissing('market_confirmations', [
            'market_id' => $market->id,
            'action' => MarketConfirmation::ACTION_INVALIDATED_BY_SYNC,
        ]);
    }

    // ── Changed sync resets confirmation, deactivates, audits ───────

    public function test_changed_sync_resets_confirmation_deactivates_and_audits(): void
    {
        Http::fakeSequence()
            ->push(self::CSV_V1, 200)
            ->push(self::CSV_V1_CHANGED, 200);
        $market = $this->freshMarket();

        $this->sync($market);
        $this->asUser($this->admin())->postJson('/api/markets/'.$market->id.'/confirm')->assertStatus(200);
        $this->asUser($this->admin())->putJson('/api/markets/'.$market->id.'/enable')->assertStatus(200);
        $this->assertTrue($market->fresh()->active);

        // Content-changing sync.
        $result = $this->sync($market);

        $fresh = $market->fresh();
        $this->assertFalse($fresh->isConfirmed(), 'confirmation must reset on content change');
        $this->assertNull($fresh->confirmed_at);
        $this->assertFalse($fresh->active, 'market must auto-deactivate when confirmation is reset');
        $this->assertDatabaseHas('market_confirmations', [
            'market_id' => $market->id,
            'action' => MarketConfirmation::ACTION_INVALIDATED_BY_SYNC,
            'user_id' => null,
        ]);
        $this->assertTrue(
            collect($result['issues'])->contains(fn ($i) => str_contains($i, 'confirmation reset')),
            'sync report must surface the reset'
        );
    }

    // ── Enable blocked without confirmation ─────────────────────────

    public function test_enable_blocked_without_confirmation(): void
    {
        Http::fake(['docs.google.com/*' => Http::response(self::CSV_V1, 200)]);
        $market = $this->freshMarket();
        $this->sync($market); // copies + has_disclaimer, but NOT confirmed

        $this->asUser($this->admin())
            ->putJson('/api/markets/'.$market->id.'/enable')
            ->assertStatus(422);

        $this->assertFalse($market->fresh()->active);
    }

    // ── Confirm -> enable -> order, end to end ──────────────────────

    public function test_confirm_then_enable_then_order_flow(): void
    {
        Http::fake(['docs.google.com/*' => Http::response(self::CSV_V1, 200)]);
        $market = $this->freshMarket();
        $this->sync($market);

        $admin = $this->admin();
        $this->asUser($admin)->postJson('/api/markets/'.$market->id.'/confirm')->assertStatus(200);
        $this->asUser($admin)->putJson('/api/markets/'.$market->id.'/enable')->assertStatus(200);
        $this->assertTrue($market->fresh()->active);

        // A copy synced from CSV_V1 ("Tap to invest" -> Tap_to_invest).
        $response = $this->asUser($this->lead())->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('Tap_to_invest')],
        ]);

        $response->assertStatus(201);
        $this->assertEquals($market->id, $response->json('market_id'));
    }

    // ── Revoke while active deactivates the market ──────────────────

    public function test_revoke_while_active_deactivates_market(): void
    {
        Http::fake(['docs.google.com/*' => Http::response(self::CSV_V1, 200)]);
        $market = $this->freshMarket();
        $this->sync($market);
        $admin = $this->admin();
        $this->asUser($admin)->postJson('/api/markets/'.$market->id.'/confirm')->assertStatus(200);
        $this->asUser($admin)->putJson('/api/markets/'.$market->id.'/enable')->assertStatus(200);
        $this->assertTrue($market->fresh()->active);

        $this->asUser($admin)->postJson('/api/markets/'.$market->id.'/revoke')->assertStatus(200);

        $fresh = $market->fresh();
        $this->assertFalse($fresh->active, 'revoke must deactivate the market');
        $this->assertFalse($fresh->isConfirmed());
        $this->assertDatabaseHas('market_confirmations', [
            'market_id' => $market->id,
            'action' => MarketConfirmation::ACTION_MANUALLY_REVOKED,
        ]);
    }

    // ── Copies endpoint is read-only + admin-only ───────────────────

    public function test_copies_endpoint_returns_detail_for_admin_and_is_forbidden_to_leads(): void
    {
        Http::fake(['docs.google.com/*' => Http::response(self::CSV_V1, 200)]);
        $market = $this->freshMarket();
        $this->sync($market);

        $this->asUser($this->lead())
            ->getJson('/api/markets/'.$market->id.'/copies')
            ->assertStatus(403);

        $this->asUser($this->admin())
            ->getJson('/api/markets/'.$market->id.'/copies')
            ->assertStatus(200)
            ->assertJsonStructure(['code', 'copy_count', 'confirmation' => ['confirmed'], 'copies']);
    }
}
