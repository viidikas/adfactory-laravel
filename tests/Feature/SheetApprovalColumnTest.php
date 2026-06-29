<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\SheetSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Approval-column sync: a tab carrying "<market-code> copy approved" is the
 * source of truth — the approved cell holds the local-language text to use and
 * also gates enablement. A blank approved cell means "not approved" (disabled).
 * The raw draft language column is ignored in favor of the approved text.
 */
class SheetApprovalColumnTest extends TestCase
{
    use RefreshDatabase;

    private function fakeSheet(string $csv): void
    {
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        Http::fake(['docs.google.com/*' => Http::response($csv, 200)]);
    }

    private function sync($market): void
    {
        app(SheetSyncService::class)->syncMarket($market->fresh());
    }

    // ── Approved cell → text used + auto-enabled ────────────────────

    public function test_approved_cell_supplies_local_text_and_enables_copy(): void
    {
        // Draft "es" differs from the approved text — the approved text wins.
        $this->fakeSheet(
            "Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,DRAFT spanish,no,Solicita hoy\n"
        );
        $market = $this->market(['code' => 'ES', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertTrue($copy->enabled, 'a filled approved cell auto-enables the copy');
        $this->assertSame('Tap to invest', $copy->copy_text['en']);
        // Local language comes from the approved column, NOT the draft "es" cell.
        $this->assertSame('Solicita hoy', $copy->copy_text['es']);
        $this->assertNull($copy->enabled_by, 'sheet-driven approval records no admin');
        $this->assertNotNull($copy->enabled_at);
    }

    // ── Blank approved cell → row not synced at all ─────────────────

    public function test_blank_approved_rows_are_not_synced(): void
    {
        // One approved row, one blank — only the approved one is stored.
        $this->fakeSheet(
            "Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,Solicita hoy\n".
            "Travel,TR1,Creditstar,Book your trip,Reserva tu viaje,no,\n"
        );
        $market = $this->market(['code' => 'ES', 'active' => false]);

        $this->sync($market);

        $this->assertSame(1, $market->copies()->count(), 'only approved copies are stored');
        $this->assertNotNull($market->copies()->where('copy_key', 'Tap_to_invest')->first());
        $this->assertNull(
            $market->copies()->where('copy_key', 'Book_your_trip')->first(),
            'the blank-approval row must not be synced'
        );
    }

    // ── The sheet is the source of truth, overriding manual state ───

    public function test_approval_overrides_prior_manual_enablement(): void
    {
        $market = $this->market(['code' => 'ES', 'active' => false]);

        // Two syncs of the same row: approved first, then with the approval
        // cleared. fakeSequence is required — Http::fake merges same-URL stubs,
        // so the first response would otherwise be replayed.
        Setting::set('sheet_url', 'https://docs.google.com/spreadsheets/d/ABC123/edit');
        Http::fakeSequence()
            ->push("Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
                "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,Aprobado\n", 200)
            ->push("Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
                "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,\n", 200);

        // Approved on first sync → present + enabled.
        $this->sync($market);
        $this->assertTrue($market->copies()->where('copy_key', 'Tap_to_invest')->first()->enabled);

        // Approval withdrawn (cell cleared) → copy removed entirely on re-sync.
        $this->sync($market);
        $this->assertNull(
            $market->copies()->where('copy_key', 'Tap_to_invest')->first(),
            'a copy whose approval is cleared is dropped from the market'
        );
    }

    public function test_approval_enables_a_copy_an_admin_had_disabled(): void
    {
        $market = $this->market(['code' => 'ES', 'active' => false]);
        $this->copy($market, [
            'copy_key' => 'Tap_to_invest',
            'copy_text' => ['en' => 'Tap to invest'],
            'enabled' => false,
        ]);

        $this->fakeSheet(
            "Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,Aprobado\n"
        );
        $this->sync($market);

        $this->assertTrue(
            $market->copies()->where('copy_key', 'Tap_to_invest')->first()->enabled,
            'sheet approval enables without a manual toggle'
        );
    }

    // ── Prefix is the MARKET CODE, not the language (SE → sv) ────────

    public function test_approved_prefix_uses_market_code_text_stored_under_language(): void
    {
        // Market SE, language column "sv", approval column "se copy approved".
        $this->fakeSheet(
            "Category,Shot,Brand,en,sv,Disclaimer,se copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft svenska,no,Godkand svenska\n"
        );
        $market = $this->market(['code' => 'SE', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertTrue($copy->enabled);
        // Approved text is stored under the actual language (sv), not the code (se).
        $this->assertSame('Godkand svenska', $copy->copy_text['sv']);
        $this->assertArrayNotHasKey('se', $copy->copy_text);
    }

    // ── Only approved copies reach growth leads ─────────────────────

    public function test_only_approved_copies_are_offered_to_leads(): void
    {
        $this->fakeSheet(
            "Category,Shot,Brand,en,es,Disclaimer,es copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,Aprobado\n".
            "Travel,TR1,Creditstar,Book your trip,Draft,no,\n"
        );
        $market = $this->market(['code' => 'ES', 'active' => true]);
        $this->sync($market);

        $keys = collect(
            $this->asUser($this->lead())->getJson('/api/copies?market_id='.$market->id)->json()
        )->pluck('key')->all();

        $this->assertEquals(['Tap_to_invest'], $keys, 'only the approved copy is orderable');
    }

    // ── Admin Markets tab shows only the approved copies ────────────

    public function test_markets_tab_lists_only_approved_copies(): void
    {
        // SE-like: three rows in the tab, only one approved → the admin copies
        // view must show exactly that one copy.
        $this->fakeSheet(
            "Category,Shot,Brand,en,sv,Disclaimer,se copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft,no,Godkand\n".
            "Travel,TR1,Creditstar,Book your trip,Draft,no,\n".
            "Financial Relief,FR1,Creditstar,Help when needed,Draft,no,\n"
        );
        $market = $this->market(['code' => 'SE', 'active' => false]);
        $this->sync($market);

        $response = $this->asUser($this->admin())
            ->getJson("/api/markets/{$market->id}/copies")
            ->assertStatus(200);

        $this->assertSame(1, $response->json('copy_count'));
        $this->assertCount(1, $response->json('copies'));
        $this->assertSame('Tap_to_invest', $response->json('copies.0.copy_key'));
    }

    // ── Suggestion column = corrected English (gated tabs) ──────────

    public function test_suggestion_column_overrides_en_for_english_and_key(): void
    {
        // A filled Suggestion is the correct English: it drives copy_text['en']
        // AND the copy_key, while the local text still comes from the approval.
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Suggestion,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Borrow smart build happy,Draft fi,Borrow wise build smart,no,Lainaa viisaasti\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Borrow_wise_build')->firstOrFail();
        $this->assertSame('Borrow wise build smart', $copy->copy_text['en']);
        $this->assertSame('Lainaa viisaasti', $copy->copy_text['fi']);
        // The draft-en key must NOT exist — Suggestion replaced it.
        $this->assertNull($market->copies()->where('copy_key', 'Borrow_smart_build')->first());
    }

    public function test_blank_suggestion_falls_back_to_en(): void
    {
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Suggestion,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Plan Decide Apply,Draft,,no,Suunnittele Paata Hae\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Plan_Decide_Apply')->firstOrFail();
        $this->assertSame('Plan Decide Apply', $copy->copy_text['en']);
    }

    public function test_suggestion_resolves_a_copy_key_collision(): void
    {
        // Two lines share the first three words ("Borrow smart build") — without
        // Suggestion they'd collapse to one copy. The Suggestion on the first
        // re-keys it, so BOTH survive.
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Suggestion,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Borrow smart build happy,D1,Borrow wise build smart,no,Approved1\n".
            "Product Usage,PU2,Creditstar,Borrow smart build with confidence,D2,,no,Approved2\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $this->assertSame(2, $market->copies()->count(), 'both copies survive — no collapse');
        $this->assertNotNull($market->copies()->where('copy_key', 'Borrow_wise_build')->first());
        $this->assertNotNull($market->copies()->where('copy_key', 'Borrow_smart_build')->first());
    }

    public function test_note_row_with_blank_en_but_filled_suggestion_is_ignored(): void
    {
        // A review-note row (blank en, text only in Suggestion) must not become a copy.
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Suggestion,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Draft,,no,Napauta\n".
            ",,,,,Should be double checked,,\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $this->assertSame(1, $market->copies()->count(), 'the blank-en note row is not a copy');
        $this->assertNotNull($market->copies()->where('copy_key', 'Tap_to_invest')->first());
    }

    public function test_ungated_tab_ignores_suggestion_column(): void
    {
        // The Suggestion override is scoped to the approval-gated flow; an ungated
        // tab keeps using its `en` column for the key + English.
        $this->fakeSheet(
            "Category,Shot,Brand,en,et,Suggestion,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Puuduta,Better tap line,no\n"
        );
        $market = $this->market(['code' => 'EE', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertSame('Tap to invest', $copy->copy_text['en'], 'ungated en is unchanged by Suggestion');
        $this->assertNull($market->copies()->where('copy_key', 'Better_tap_line')->first());
    }

    // ── Colliding keys: keep all copies, never silently drop ────────

    public function test_colliding_copies_are_kept_distinct_not_dropped(): void
    {
        // Two approved copies share their first three words ("Borrow smart build")
        // and have no Suggestion to separate them — both must still be stored.
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Borrow smart build happy,A,no,Appr1\n".
            "Product Usage,PU2,Creditstar,Borrow smart build strong,B,no,Appr2\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $this->assertSame(2, $market->copies()->count(), 'both colliding copies survive');
        $keys = $market->copies()->pluck('copy_key')->all();
        $this->assertSame(2, count(array_unique($keys)), 'their keys are distinct');
    }

    public function test_collision_is_reported_as_a_sync_issue(): void
    {
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Borrow smart build happy,A,no,Appr1\n".
            "Product Usage,PU2,Creditstar,Borrow smart build strong,B,no,Appr2\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $result = app(SheetSyncService::class)->syncMarket($market->fresh());

        $this->assertNotEmpty($result['issues']);
        $this->assertTrue(
            collect($result['issues'])->contains(fn ($i) => str_contains($i, 'Borrow_smart_build')),
            'the collision is surfaced in the sync report'
        );
    }

    public function test_identical_text_rows_merge_into_one_copy(): void
    {
        // Genuinely identical English is the SAME copy — it should merge, not split.
        $this->fakeSheet(
            "Category,Shot,Brand,en,fi,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Tap to invest,A,no,Appr1\n".
            "Product Usage,PU1,Creditstar,Tap to invest,A,no,Appr1\n"
        );
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $this->assertSame(1, $market->copies()->count(), 'identical copies merge');
    }

    public function test_cell_with_embedded_newline_does_not_corrupt_rows(): void
    {
        // A quoted approved cell with a line break must NOT split the row — a
        // naive newline-split would drop this copy (the real FI 6th-copy bug).
        $csv = "Category,Shot,Brand,en,fi,Disclaimer,fi copy approved\n".
            "Product Usage,PU1,Creditstar,Borrow for better devices,Draft,no,\"Lainaa harkittuihin\nhankintoihin.\"\n".
            "Travel,TR1,Creditstar,Plan Decide Apply,Draft,no,Suunnittele Paata Hae\n";
        $this->fakeSheet($csv);
        $market = $this->market(['code' => 'FI', 'active' => false]);

        $this->sync($market);

        $this->assertSame(2, $market->copies()->count(), 'both copies survive an embedded newline');
        $copy = $market->copies()->where('copy_key', 'Borrow_for_better')->firstOrFail();
        $this->assertStringContainsString('hankintoihin', $copy->copy_text['fi']);
    }

    // ── Tabs without the column keep the legacy manual gate ─────────

    public function test_tab_without_approved_column_does_not_auto_enable(): void
    {
        // No "<code> copy approved" column → legacy behavior: new copies start
        // DISABLED and await manual review.
        $this->fakeSheet(
            "Category,Shot,Brand,en,et,Disclaimer\n".
            "Product Usage,PU1,Creditstar,Tap to invest,Puuduta,no\n"
        );
        $market = $this->market(['code' => 'EE', 'active' => false]);

        $this->sync($market);

        $copy = $market->copies()->where('copy_key', 'Tap_to_invest')->firstOrFail();
        $this->assertFalse($copy->enabled, 'ungated tabs still require manual enablement');
        // Draft local language is read as before when there is no approval column.
        $this->assertSame('Puuduta', $copy->copy_text['et']);
    }
}
