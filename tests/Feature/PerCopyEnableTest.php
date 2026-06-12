<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\SheetSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PerCopyEnableTest extends TestCase
{
    use RefreshDatabase;

    private const CSV_V1 =
        "Category,Shot,Brand,EN,ET\n".
        "Product Usage,PU1,Creditstar,Tap to invest,Puuduta\n";

    private const CSV_V1_CHANGED =
        "Category,Shot,Brand,EN,ET\n".
        "Product Usage,PU1,Creditstar,Tap to invest,CHANGED\n";

    // ── Growth leads only see ENABLED copies ────────────────────────

    public function test_only_enabled_copies_are_returned_to_leads(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'on_copy', 'enabled' => true]);
        $this->copy($market, ['copy_key' => 'off_copy', 'enabled' => false]);

        $response = $this->asUser($this->lead())->getJson('/api/copies?market_id='.$market->id);

        $response->assertStatus(200);
        $this->assertEquals(['on_copy'], collect($response->json())->pluck('key')->all());
    }

    // ── Orders reject disabled copies ───────────────────────────────

    public function test_order_rejected_for_disabled_copy(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k', 'enabled' => false]);

        $response = $this->asUser($this->lead())->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ]);

        $response->assertStatus(422)->assertJson(['error_code' => 'copy_market_mismatch']);
        $this->assertDatabaseCount('orders', 0);
    }

    // ── Toggling a copy (admin) records who/when ────────────────────

    public function test_admin_toggle_enables_and_disables_copy(): void
    {
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $copy = $this->copy($market, ['copy_key' => 'k', 'enabled' => false]);
        $admin = $this->admin();

        $this->asUser($admin)
            ->putJson("/api/markets/{$market->id}/copies/{$copy->id}", ['enabled' => true])
            ->assertStatus(200);
        $this->assertDatabaseHas('copies', ['id' => $copy->id, 'enabled' => true, 'enabled_by' => $admin->id]);
        $this->assertNotNull($copy->fresh()->enabled_at);

        $this->asUser($admin)
            ->putJson("/api/markets/{$market->id}/copies/{$copy->id}", ['enabled' => false])
            ->assertStatus(200);
        $this->assertDatabaseHas('copies', ['id' => $copy->id, 'enabled' => false, 'enabled_by' => null]);
    }

    public function test_toggle_copy_is_admin_only(): void
    {
        $market = $this->market(['code' => 'FI']);
        $copy = $this->copy($market, ['copy_key' => 'k']);

        $this->asUser($this->lead())
            ->putJson("/api/markets/{$market->id}/copies/{$copy->id}", ['enabled' => true])
            ->assertStatus(403);
    }

    public function test_toggle_rejects_copy_from_another_market(): void
    {
        $fi = $this->market(['code' => 'FI']);
        $ee = $this->market(['code' => 'EE']);
        $eeCopy = $this->copy($ee, ['copy_key' => 'k']);

        // Copy belongs to EE, addressed under FI -> 404.
        $this->asUser($this->admin())
            ->putJson("/api/markets/{$fi->id}/copies/{$eeCopy->id}", ['enabled' => true])
            ->assertStatus(404);
    }

    // ── Sync preserves enablement on no-change, resets on change ────

    public function test_sync_preserves_enabled_on_no_change_and_resets_on_change(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        Http::fakeSequence()
            ->push(self::CSV_V1, 200)        // initial
            ->push(self::CSV_V1, 200)        // identical re-sync
            ->push(self::CSV_V1_CHANGED, 200); // changed re-sync
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $svc = app(SheetSyncService::class);

        $svc->syncMarket($market->fresh());
        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertFalse($copy->enabled, 'newly synced copies start disabled');

        // Admin enables it.
        $copy->forceFill(['enabled' => true, 'enabled_at' => now(), 'enabled_by' => $this->admin()->id])->save();

        // Identical re-sync keeps it enabled.
        $svc->syncMarket($market->fresh());
        $this->assertTrue($market->copies()->where('copy_key', 'Tap_to_invest')->first()->enabled);

        // Content-changing re-sync resets it to disabled (must be re-reviewed).
        $svc->syncMarket($market->fresh());
        $this->assertFalse($market->copies()->where('copy_key', 'Tap_to_invest')->first()->enabled);
    }

    // ── Enabled copies flow end to end ──────────────────────────────

    public function test_enabled_copy_can_be_ordered_in_active_market(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'Tap_to_invest', 'enabled' => true]);

        $this->asUser($this->lead())->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('Tap_to_invest')],
        ])->assertStatus(201);
    }
}
