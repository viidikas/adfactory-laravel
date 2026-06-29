<?php

namespace Tests\Feature;

use App\Models\DeliveredClip;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Delivered clips: admin upload to a private disk + authenticated, market-scoped
 * streaming download. ffmpeg poster generation is best-effort — in tests it runs
 * on a fake file (or is absent), so thumbnail_path is expected to be null and the
 * upload must still succeed.
 */
class DeliveredClipTest extends TestCase
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

    // ── Upload ──────────────────────────────────────────────────────

    public function test_admin_uploads_clip_storing_file_and_row_market_scoped(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $res = $this->asUser($this->admin())->post('/api/delivered-clips', [
            'market_id' => $market->id,
            'name' => 'Q3 Hero',
            'format' => '16:9',
            'file' => UploadedFile::fake()->create('hero.mp4', 2048, 'video/mp4'),
        ]);

        $res->assertStatus(201)->assertJsonPath('name', 'Q3 Hero')->assertJsonPath('format', '16:9');

        $clip = DeliveredClip::firstOrFail();
        $this->assertSame($market->id, $clip->market_id);
        $this->assertStringStartsWith("delivered/{$market->id}/", $clip->file_path);
        Storage::disk('local')->assertExists($clip->file_path);
        // ffmpeg can't make a poster from a fake file (or is absent) → null, but
        // the upload still succeeded.
        $this->assertNull($clip->thumbnail_path);
    }

    public function test_non_video_upload_is_rejected(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $this->asUser($this->admin())->postJson('/api/delivered-clips', [
            'market_id' => $market->id,
            'name' => 'Not a video',
            'file' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('delivered_clips', 0);
    }

    public function test_oversize_upload_is_rejected(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        // 600,000 KB > the 500,000 KB (500 MB) cap.
        $this->asUser($this->admin())->postJson('/api/delivered-clips', [
            'market_id' => $market->id,
            'name' => 'Too big',
            'file' => UploadedFile::fake()->create('big.mp4', 600000, 'video/mp4'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('delivered_clips', 0);
    }

    public function test_lead_cannot_upload(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $this->asUser($this->lead())->postJson('/api/delivered-clips', [
            'market_id' => $market->id,
            'name' => 'x',
            'file' => UploadedFile::fake()->create('hero.mp4', 100, 'video/mp4'),
        ])->assertStatus(403);
    }

    // ── Download (authenticated, market-scoped) ─────────────────────

    public function test_download_requires_auth(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);

        $this->getJson("/api/delivered-clips/{$clip->id}/download")->assertStatus(401);
    }

    public function test_authenticated_lead_downloads_active_market_clip(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO-BYTES');
        $clip = $this->makeClip($market, ['name' => 'Hero', 'file_size' => 11]);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/download")
            ->assertOk()
            ->assertDownload('Hero.mp4');
    }

    public function test_lead_cannot_download_clip_for_market_they_cannot_see(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => false]); // not visible to leads
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO');
        $clip = $this->makeClip($market);

        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/download")->assertStatus(403);

        // Admins still can (they see every market).
        $this->asUser($this->admin())->get("/api/delivered-clips/{$clip->id}/download")->assertOk();
    }

    // ── Download set (zip) ──────────────────────────────────────────

    public function test_authenticated_lead_downloads_a_set_as_zip(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        Storage::disk('local')->put("delivered/{$market->id}/a.mp4", 'AAAA');
        Storage::disk('local')->put("delivered/{$market->id}/b.mp4", 'BBBB');
        // A message set = same brand/lang/copy/actor, different designs/formats.
        $base = ['brand' => 'Creditstar', 'lang' => 'FI', 'actor' => 'Kemal', 'copy' => 'Suunnittele Pt Hae', 'slate' => 'PU8'];
        $a = $this->makeClip($market, $base + ['name' => 'a', 'design' => 'design1', 'format' => '16:9', 'file_path' => "delivered/{$market->id}/a.mp4"]);
        $b = $this->makeClip($market, $base + ['name' => 'b', 'design' => 'design2', 'format' => '9:16', 'file_path' => "delivered/{$market->id}/b.mp4"]);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/set?ids={$a->id},{$b->id}")
            ->assertOk()
            ->assertDownload('Creditstar_FI_Suunnittele_Pt_Hae_Kemal.zip');
    }

    public function test_download_set_requires_auth(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);

        $this->getJson("/api/delivered-clips/set?ids={$clip->id}")->assertStatus(401);
    }

    public function test_download_set_forbidden_if_any_clip_is_in_an_invisible_market(): void
    {
        Storage::fake('local');
        $visible = $this->market(['code' => 'FI', 'active' => true]);
        $hidden = $this->market(['code' => 'NO', 'active' => false]);
        Storage::disk('local')->put("delivered/{$visible->id}/a.mp4", 'A');
        Storage::disk('local')->put("delivered/{$hidden->id}/b.mp4", 'B');
        $a = $this->makeClip($visible, ['file_path' => "delivered/{$visible->id}/a.mp4"]);
        $b = $this->makeClip($hidden, ['file_path' => "delivered/{$hidden->id}/b.mp4"]);

        $this->asUser($this->lead())->get("/api/delivered-clips/set?ids={$a->id},{$b->id}")->assertStatus(403);
    }

    // ── Delete ──────────────────────────────────────────────────────

    public function test_delete_removes_row_and_both_files(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);
        $videoPath = "delivered/{$market->id}/clip.mp4";
        $thumbPath = "delivered/{$market->id}/clip_thumb.jpg";
        Storage::disk('local')->put($videoPath, 'VIDEO');
        Storage::disk('local')->put($thumbPath, 'JPG');
        $clip = $this->makeClip($market, ['file_path' => $videoPath, 'thumbnail_path' => $thumbPath]);

        $this->asUser($this->admin())->deleteJson("/api/delivered-clips/{$clip->id}")->assertOk();

        $this->assertDatabaseMissing('delivered_clips', ['id' => $clip->id]);
        Storage::disk('local')->assertMissing($videoPath);
        Storage::disk('local')->assertMissing($thumbPath);
    }

    // ── Portal listing scope ────────────────────────────────────────

    public function test_index_lists_only_the_requested_active_market_clips(): void
    {
        Storage::fake('local');
        $fi = $this->market(['code' => 'FI', 'active' => true]);
        $ee = $this->market(['code' => 'EE', 'active' => true]);
        $this->makeClip($fi, ['name' => 'FI clip']);
        $this->makeClip($ee, ['name' => 'EE clip']);

        $names = collect(
            $this->asUser($this->lead())->getJson('/api/delivered-clips?market_id=' . $fi->id)->assertOk()->json()
        )->pluck('name')->all();

        $this->assertEquals(['FI clip'], $names);
    }

    public function test_lead_cannot_list_inactive_market_clips(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => false]);
        $this->makeClip($market);

        $this->asUser($this->lead())->getJson('/api/delivered-clips?market_id=' . $market->id)->assertStatus(403);
    }

    // ── Batch upload + filename metadata ────────────────────────────

    public function test_batch_upload_parses_metadata_and_format_from_filenames(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $res = $this->asUser($this->admin())->post('/api/delivered-clips/batch', [
            'market_id' => $market->id,
            'files' => [
                UploadedFile::fake()->create('Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9.mp4', 1024, 'video/mp4'),
                UploadedFile::fake()->create('Creditstar_FI_Tap_To_Invest_PU7_Lauri_design2_9x16.mp4', 1024, 'video/mp4'),
            ],
        ]);

        $res->assertStatus(201)->assertJsonCount(2, 'clips')->assertJsonCount(0, 'errors');

        $this->assertDatabaseCount('delivered_clips', 2);

        // ffprobe can't read a fake file → format falls back to the filename token.
        $a = DeliveredClip::where('slate', 'PU8')->firstOrFail();
        $this->assertSame('Creditstar', $a->brand);
        $this->assertSame('FI', $a->lang);
        $this->assertSame('Suunnittele Pt Hae', $a->copy);
        $this->assertSame('Kemal', $a->actor);
        $this->assertSame('design1', $a->design);
        $this->assertSame('16:9', $a->format);
        $this->assertSame('Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9', $a->name);

        $b = DeliveredClip::where('slate', 'PU7')->firstOrFail();
        $this->assertSame('Lauri', $b->actor);
        $this->assertSame('design2', $b->design);
        $this->assertSame('9:16', $b->format);
        $this->assertSame('Tap To Invest', $b->copy);
    }

    public function test_index_resolves_copy_slug_to_full_text(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        // The Templater slugifies "Suunnittele. Päätä. Hae." → "Suunnittele_Pt_Hae".
        $this->copy($market, ['copy_key' => 'Plan', 'shot' => 'PU8', 'enabled' => true,
            'copy_text' => ['en' => 'Plan it', 'fi' => 'Suunnittele. Päätä. Hae.']]);
        $this->makeClip($market, ['lang' => 'FI', 'slate' => 'PU8', 'copy' => 'Suunnittele Pt Hae']);

        $clip = collect(
            $this->asUser($this->lead())->getJson('/api/delivered-clips?market_id=' . $market->id)->assertOk()->json()
        )->firstOrFail();

        $this->assertSame('Suunnittele Pt Hae', $clip['copy']);
        $this->assertSame('Suunnittele. Päätä. Hae.', $clip['copy_full']);
        // The matched copy's key + category come along, for the by-copy browse.
        $this->assertSame('Plan', $clip['copy_key']);
        $this->assertSame('Product Usage', $clip['category']);
    }

    public function test_batch_upload_is_admin_only(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $this->asUser($this->lead())->postJson('/api/delivered-clips/batch', [
            'market_id' => $market->id,
            'files' => [UploadedFile::fake()->create('clip.mp4', 100, 'video/mp4')],
        ])->assertStatus(403);
    }

    public function test_batch_upload_rejects_a_non_video(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);

        $this->asUser($this->admin())->postJson('/api/delivered-clips/batch', [
            'market_id' => $market->id,
            'files' => [UploadedFile::fake()->create('doc.pdf', 50, 'application/pdf')],
        ])->assertStatus(422)->assertJsonValidationErrors('files.0');

        $this->assertDatabaseCount('delivered_clips', 0);
    }

    // ── Inline stream (authenticated, market-scoped) ────────────────

    public function test_stream_requires_auth(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI']);
        $clip = $this->makeClip($market);

        $this->getJson("/api/delivered-clips/{$clip->id}/stream")->assertStatus(401);
    }

    public function test_authenticated_lead_streams_active_market_clip(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => true]);
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO-BYTES');
        $clip = $this->makeClip($market, ['file_size' => 11]);

        $this->asUser($this->lead())
            ->get("/api/delivered-clips/{$clip->id}/stream")
            ->assertOk()
            ->assertHeader('Content-Type', 'video/mp4');
    }

    public function test_lead_cannot_stream_clip_for_market_they_cannot_see(): void
    {
        Storage::fake('local');
        $market = $this->market(['code' => 'FI', 'active' => false]);
        Storage::disk('local')->put("delivered/{$market->id}/clip.mp4", 'VIDEO');
        $clip = $this->makeClip($market);

        $this->asUser($this->lead())->get("/api/delivered-clips/{$clip->id}/stream")->assertStatus(403);
        $this->asUser($this->admin())->get("/api/delivered-clips/{$clip->id}/stream")->assertOk();
    }
}
