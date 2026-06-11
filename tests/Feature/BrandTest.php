<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandTest extends TestCase
{
    use RefreshDatabase;

    private function seedCopyLines(): void
    {
        Setting::set('copy_lines', json_encode([
            ['key' => 'cs_only', 'category' => 'Product Usage', 'shot' => 'PU1', 'brand' => 'Creditstar', 'en' => 'CS only copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'mf_only', 'category' => 'Product Usage', 'shot' => 'PU2', 'brand' => 'Monefit', 'en' => 'MF only copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'either_copy', 'category' => 'Product Usage', 'shot' => 'PU3', 'brand' => 'Either', 'en' => 'Either brand copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'ss_copy', 'category' => 'Product Usage', 'shot' => 'PU4', 'brand' => 'SmartSaver', 'en' => 'SmartSaver copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
        ]));
    }

    // ── Legacy AD.FACTORY copy-lines brand filter (unchanged) ───────

    public function test_copy_lines_creditstar_includes_either(): void
    {
        $this->seedCopyLines();

        $response = $this->asUser($this->lead())->getJson('/api/copy-lines?brand=Creditstar');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('cs_only', $keys);
        $this->assertContains('either_copy', $keys);
        $this->assertNotContains('mf_only', $keys);
        $this->assertNotContains('ss_copy', $keys);
    }

    public function test_copy_lines_monefit_includes_either(): void
    {
        $this->seedCopyLines();

        $response = $this->asUser($this->lead())->getJson('/api/copy-lines?brand=Monefit');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('mf_only', $keys);
        $this->assertContains('either_copy', $keys);
        $this->assertContains('ss_copy', $keys); // SmartSaver = Monefit
        $this->assertNotContains('cs_only', $keys);
    }

    public function test_copy_lines_no_brand_returns_all(): void
    {
        $this->seedCopyLines();

        $response = $this->asUser($this->lead())->getJson('/api/copy-lines');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('cs_only', $keys);
        $this->assertContains('mf_only', $keys);
        $this->assertContains('either_copy', $keys);
        $this->assertContains('ss_copy', $keys);
    }

    // ── Order brand is now DERIVED from the (brand-scoped) market ────

    public function test_order_brand_is_derived_from_market(): void
    {
        $monefit = $this->market(['code' => 'EEA', 'brand' => 'Monefit']);
        $this->copy($monefit, ['copy_key' => 'k']);
        $lead = $this->lead();

        $response = $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $monefit->id,
            // Even if a client tried to send brand, it is ignored — derived from market.
            'brand' => 'Creditstar',
            'items' => [$this->itemPayload('k')],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', ['id' => $response->json('id'), 'brand' => 'Monefit']);
    }

    public function test_orders_response_includes_brand(): void
    {
        $monefit = $this->market(['code' => 'EEA', 'brand' => 'Monefit']);
        $this->copy($monefit, ['copy_key' => 'k']);
        $lead = $this->lead();

        $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $monefit->id,
            'items' => [$this->itemPayload('k')],
        ])->assertStatus(201);

        $response = $this->asUser($lead)->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertEquals('Monefit', $response->json()[0]['brand']);
    }

    public function test_orders_brand_filter(): void
    {
        $cs = $this->market(['code' => 'FI', 'brand' => 'Creditstar']);
        $mf = $this->market(['code' => 'EEA', 'brand' => 'Monefit']);
        $this->copy($cs, ['copy_key' => 'cs_k']);
        $this->copy($mf, ['copy_key' => 'mf_k']);
        $admin = $this->admin();
        $lead = $this->lead();

        $this->asUser($lead)->postJson('/api/orders', ['market_id' => $cs->id, 'items' => [$this->itemPayload('cs_k')]])->assertStatus(201);
        $this->asUser($lead)->postJson('/api/orders', ['market_id' => $mf->id, 'items' => [$this->itemPayload('mf_k')]])->assertStatus(201);

        $response = $this->asUser($admin)->getJson('/api/orders?brand=Monefit');

        $this->assertCount(1, $response->json());
        $this->assertEquals('Monefit', $response->json()[0]['brand']);
    }
}
