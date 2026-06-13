<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Part A: the market copies endpoint reports the languages present in a market
 * (local first, EN last). Part C: sync accepts any 2-letter language column and
 * stores only languages with content.
 */
class MarketCopiesLanguagesTest extends TestCase
{
    use RefreshDatabase;

    // ── Languages-present metadata ──────────────────────────────────

    public function test_single_language_market_reports_only_en(): void
    {
        $market = $this->market(['code' => 'UK']);
        $this->copy($market, ['copy_key' => 'k1', 'copy_text' => ['en' => 'Tap to invest']]);

        $response = $this->asUser($this->admin())->getJson("/api/markets/{$market->id}/copies");

        $response->assertStatus(200);
        $this->assertEquals(['en'], $response->json('languages'));
    }

    public function test_multi_language_market_lists_locals_first_en_last(): void
    {
        $market = $this->market(['code' => 'EE']);
        // Two copies with different local languages; EN present in both.
        $this->copy($market, ['copy_key' => 'k1', 'copy_text' => ['et' => 'Puuduta', 'en' => 'Tap']]);
        $this->copy($market, ['copy_key' => 'k2', 'copy_text' => ['en' => 'Save', 'fi' => 'Salvesta']]);

        $response = $this->asUser($this->admin())->getJson("/api/markets/{$market->id}/copies");

        $response->assertStatus(200);
        // Locals alphabetical (et, fi) first, EN last.
        $this->assertEquals(['et', 'fi', 'en'], $response->json('languages'));
    }

    public function test_empty_market_still_reports_en(): void
    {
        $market = $this->market(['code' => 'PL']);

        $response = $this->asUser($this->admin())->getJson("/api/markets/{$market->id}/copies");

        $response->assertStatus(200);
        $this->assertEquals(['en'], $response->json('languages'));
    }

    // ── Sync ingests a non-legacy language column (fi) ──────────────

    public function test_sync_ingests_non_legacy_language_and_endpoint_exposes_it(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,EN,FI,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Napauta,no\n",
            200
        )]);

        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->asUser($this->admin())->postJson("/api/markets/{$market->id}/sync")->assertStatus(200);

        // FI is stored in copy_text alongside EN.
        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertSame('Napauta', $copy->copy_text['fi']);
        $this->assertSame('Tap to invest', $copy->copy_text['en']);

        // And the copies endpoint reports FI (local) before EN.
        $languages = $this->asUser($this->admin())
            ->getJson("/api/markets/{$market->id}/copies")
            ->json('languages');
        $this->assertEquals(['fi', 'en'], $languages);
    }

    public function test_copy_text_stores_only_languages_with_content(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        // ET column present in the header but blank for this row → must be omitted.
        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,EN,ET,FI,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,,Napauta,no\n",
            200
        )]);

        $market = $this->market(['code' => 'FI', 'active' => false]);
        $this->asUser($this->admin())->postJson("/api/markets/{$market->id}/sync")->assertStatus(200);

        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertEqualsCanonicalizing(['en', 'fi'], array_keys($copy->copy_text));
        $this->assertArrayNotHasKey('et', $copy->copy_text);
    }

    public function test_resync_from_legacy_padded_shape_preserves_enabled(): void
    {
        // A copy as stored by the OLD sync: copy_text padded with empty languages,
        // and the admin had enabled it.
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $copy = $this->copy($market, [
            'copy_key' => 'Tap_to_invest',
            'copy_text' => ['en' => 'Tap to invest', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            'shot' => 'PU1',
            'category' => 'Product Usage',
            'requires_disclaimer' => false,
            'enabled' => true,
        ]);

        // Re-sync from the sheet under the NEW parser → sparse copy_text {en:…}.
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,EN,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,no\n",
            200
        )]);

        $this->asUser($this->admin())->postJson("/api/markets/{$market->id}/sync")->assertStatus(200);

        // Shape changed (padding dropped) but the text is identical → still enabled.
        $fresh = $copy->fresh();
        $this->assertTrue($fresh->enabled, 'enablement must survive the legacy→sparse shape migration');
        $this->assertEquals(['en' => 'Tap to invest'], $fresh->copy_text);
    }

    public function test_sync_still_requires_en_column(): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        // No EN column → tab is unusable, sync reports failure and stores nothing.
        Http::fake(['docs.google.com/*' => Http::response(
            "Category,Shot,Brand,ET,FI\n".
            "Product Usage,PU1,Creditstar,Puuduta,Napauta\n",
            200
        )]);

        $market = $this->market(['code' => 'FI', 'active' => false]);
        $this->asUser($this->admin())
            ->postJson("/api/markets/{$market->id}/sync")
            ->assertStatus(200)
            ->assertJson(['ok' => false]);

        $this->assertSame(0, $market->copies()->count());
    }
}
