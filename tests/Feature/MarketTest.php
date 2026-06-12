<?php

namespace Tests\Feature;

use App\Models\Market;
use App\Models\Order;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MarketTest extends TestCase
{
    use RefreshDatabase;

    // ── Market-scoped copy listing ──────────────────────────────────

    public function test_copy_listing_is_scoped_to_one_market(): void
    {
        $fi = $this->market(['code' => 'FI']);
        $ee = $this->market(['code' => 'EE']);
        $this->copy($fi, ['copy_key' => 'fi_copy']);
        $this->copy($ee, ['copy_key' => 'ee_copy']);

        $response = $this->asUser($this->lead())->getJson('/api/copies?market_id='.$fi->id);

        $response->assertStatus(200);
        $keys = collect($response->json())->pluck('key')->all();
        $this->assertEquals(['fi_copy'], $keys);
    }

    // ── Inactive markets are invisible to growth leads ──────────────

    public function test_inactive_market_hidden_from_lead_selector_but_visible_to_admin(): void
    {
        $this->market(['code' => 'FI', 'active' => true]);
        $this->market(['code' => 'EE', 'active' => false]);

        $leadCodes = collect($this->asUser($this->lead())->getJson('/api/markets')->json())->pluck('code')->all();
        $this->assertEquals(['FI'], $leadCodes);

        $adminCodes = collect($this->asUser($this->admin())->getJson('/api/markets')->json())->pluck('code')->sort()->values()->all();
        $this->assertEquals(['EE', 'FI'], $adminCodes);
    }

    public function test_inactive_market_copies_hidden_from_lead_but_visible_to_admin(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false]);
        $this->copy($market, ['copy_key' => 'secret']);

        $this->asUser($this->lead())
            ->getJson('/api/copies?market_id='.$market->id)
            ->assertStatus(422);

        $this->asUser($this->admin())
            ->getJson('/api/copies?market_id='.$market->id)
            ->assertStatus(200)
            ->assertJsonFragment(['key' => 'secret']);
    }

    // ── Orders against inactive markets are rejected server-side ────

    public function test_order_against_inactive_market_is_rejected(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false]);
        $this->copy($market, ['copy_key' => 'k']);
        $lead = $this->lead();

        $response = $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ]);

        $response->assertStatus(422)->assertJson(['error_code' => 'market_inactive']);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_against_unknown_market_is_rejected(): void
    {
        $response = $this->asUser($this->lead())->postJson('/api/orders', [
            'market_id' => 99999,
            'items' => [$this->itemPayload('k')],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    // ── Mixed-market orders are rejected ────────────────────────────

    public function test_mixed_market_order_is_rejected(): void
    {
        $fi = $this->market(['code' => 'FI']);
        $ee = $this->market(['code' => 'EE']);
        $this->copy($fi, ['copy_key' => 'fi_copy']);
        $this->copy($ee, ['copy_key' => 'ee_copy']);
        $lead = $this->lead();

        // Order placed against FI but containing an EE copy.
        $response = $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $fi->id,
            'items' => [
                $this->itemPayload('fi_copy'),
                $this->itemPayload('ee_copy'),
            ],
        ]);

        $response->assertStatus(422)->assertJson(['error_code' => 'copy_market_mismatch']);
        $this->assertDatabaseCount('orders', 0);
    }

    // ── Enable gating ───────────────────────────────────────────────

    public function test_enable_blocked_without_copies(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false, 'has_disclaimer' => true]);

        $this->asUser($this->admin())
            ->putJson('/api/markets/'.$market->id.'/enable')
            ->assertStatus(422);

        $this->assertFalse($market->fresh()->active);
    }

    public function test_enable_blocked_without_any_enabled_copy(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false]);
        // Copies exist but none are enabled — per-copy enablement is the gate.
        $this->copy($market, ['copy_key' => 'k', 'enabled' => false]);

        $this->asUser($this->admin())
            ->putJson('/api/markets/'.$market->id.'/enable')
            ->assertStatus(422);

        $this->assertFalse($market->fresh()->active);
    }

    public function test_enable_succeeds_with_an_enabled_copy(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false]);
        $this->copy($market, ['copy_key' => 'k', 'enabled' => true]);

        $this->asUser($this->admin())
            ->putJson('/api/markets/'.$market->id.'/enable')
            ->assertStatus(200);

        $fresh = $market->fresh();
        $this->assertTrue($fresh->active);
        $this->assertNotNull($fresh->activated_at);
    }

    public function test_only_admin_can_enable_market(): void
    {
        $market = $this->market(['code' => 'EE', 'active' => false]);
        $this->copy($market, ['copy_key' => 'k']);

        $this->asUser($this->lead())
            ->putJson('/api/markets/'.$market->id.'/enable')
            ->assertStatus(403);
    }

    // ── Disabling preserves existing orders, blocks new ones ────────

    public function test_disabling_market_preserves_existing_orders_but_blocks_new_ones(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $lead = $this->lead();

        // Existing order placed while active.
        $created = $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ]);
        $created->assertStatus(201);
        $orderId = $created->json('id');

        // Admin disables the market.
        $this->asUser($this->admin())
            ->putJson('/api/markets/'.$market->id.'/disable')
            ->assertStatus(200);

        // Existing order remains viewable.
        $this->asUser($lead)->getJson('/api/orders/'.$orderId)->assertStatus(200);
        $this->assertDatabaseHas('orders', ['id' => $orderId]);

        // No new orders can be created for it.
        $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ])->assertStatus(422)->assertJson(['error_code' => 'market_inactive']);
    }

    // ── Disclaimer auto-attachment (server-controlled) ──────────────

    public function test_disclaimer_flag_is_attached_from_copy_not_client(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'with_disc', 'requires_disclaimer' => true, 'copy_text' => ['en' => 'Approved text']]);
        $lead = $this->lead();

        $response = $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            // Client lies about copy text and omits any disclaimer field.
            'items' => [$this->itemPayload('with_disc', ['copyText' => ['en' => 'TAMPERED']])],
        ]);

        $response->assertStatus(201);
        $item = $response->json('items.0');
        $this->assertTrue($item['requires_disclaimer']);
        // Copy text comes from the approved market copy, not the client.
        $this->assertEquals('Approved text', $item['copy_text']['en']);
    }

    // ── Sheet sync (works for inactive markets, upserts per tab) ────

    public function test_sync_upserts_copies_for_inactive_market(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0');
        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,EN,ET,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Puuduta,yes\n".
            "Travel and Holiday,TH1,Creditstar,Pack your bags,Paki kotid,no\n",
            200
        )]);

        $market = $this->market(['code' => 'FI', 'active' => false, 'has_disclaimer' => false]);

        $response = $this->asUser($this->admin())->postJson('/api/markets/'.$market->id.'/sync');
        $response->assertStatus(200)->assertJson(['ok' => true, 'copy_count' => 2, 'has_disclaimer' => true]);

        // Sync works for an inactive market and does NOT activate it.
        $fresh = $market->fresh();
        $this->assertFalse($fresh->active);
        $this->assertTrue($fresh->has_disclaimer);
        $this->assertNotNull($fresh->last_synced_at);

        $this->assertDatabaseHas('copies', ['market_id' => $market->id, 'copy_key' => 'Tap_to_invest', 'requires_disclaimer' => true]);
        $this->assertDatabaseHas('copies', ['market_id' => $market->id, 'copy_key' => 'Pack_your_bags', 'requires_disclaimer' => false]);
    }

    public function test_resync_updates_changed_rows_and_drops_stale_ones(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        $market = $this->market(['code' => 'FI', 'active' => false]);

        // Two successive syncs receive two different CSVs (sequence, not merge).
        Http::fakeSequence()
            ->push(
                "Category,Shot,Brand,EN,ET,Disclaimer\n".
                "Product Usage,PU1,Creditstar,Tap to invest,OLD,yes\n".
                "Travel and Holiday,TH1,Creditstar,Pack your bags,Paki,no\n",
                200
            )
            // Re-sync: one row changed, one removed, one added.
            ->push(
                "Category,Shot,Brand,EN,ET,Disclaimer\n".
                "Product Usage,PU1,Creditstar,Tap to invest,NEW,yes\n".
                "Home Renovation,HR1,Creditstar,Build it now,Ehita,no\n",
                200
            );

        $this->asUser($this->admin())->postJson('/api/markets/'.$market->id.'/sync')->assertStatus(200);
        $this->asUser($this->admin())->postJson('/api/markets/'.$market->id.'/sync')->assertStatus(200);

        $this->assertEquals(2, $market->copies()->count());
        $this->assertDatabaseMissing('copies', ['market_id' => $market->id, 'copy_key' => 'Pack_your_bags']);
        $this->assertDatabaseHas('copies', ['market_id' => $market->id, 'copy_key' => 'Build_it_now']);
        $updated = $market->copies()->where('copy_key', 'Tap_to_invest')->first();
        $this->assertEquals('NEW', $updated->copy_text['et']);
    }

    public function test_sync_all_reports_missing_disclaimer_column(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        $market = $this->market(['code' => 'FI', 'active' => false, 'has_disclaimer' => true]);

        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,EN,ET\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Puuduta\n",
            200
        )]);

        $report = $this->asUser($this->admin())->postJson('/api/markets/sync-all');
        $report->assertStatus(200);

        $this->assertFalse($market->fresh()->has_disclaimer);
        $issues = collect($report->json('issues'));
        $this->assertTrue($issues->contains(fn ($i) => str_contains($i, 'Disclaimer')));
    }

    public function test_lead_cannot_sync(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->asUser($this->lead())
            ->postJson('/api/markets/'.$market->id.'/sync')
            ->assertStatus(403);
    }

    // ── Backfill command ────────────────────────────────────────────

    public function test_backfill_matches_legacy_market_string_to_market_id(): void
    {
        $fi = $this->market(['code' => 'FI']);
        $lead = $this->lead();

        // Legacy orders predate market_id: only the free-text label is set.
        $matched = Order::create(['user_id' => $lead->id, 'market' => 'FI', 'status' => 'pending', 'brand' => 'Creditstar']);
        $unmatched = Order::create(['user_id' => $lead->id, 'market' => 'XX', 'status' => 'pending', 'brand' => 'Creditstar']);
        $this->assertNull($matched->market_id);

        $this->artisan('orders:backfill-market')->assertExitCode(0);

        $this->assertEquals($fi->id, $matched->fresh()->market_id);
        $this->assertNull($unmatched->fresh()->market_id);
    }
}
