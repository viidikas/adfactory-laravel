<?php

namespace Tests\Unit;

use App\Models\DeliveredClip;
use App\Services\ClipParser;
use PHPUnit\Framework\TestCase;

/**
 * Locks the behaviour of the single authoritative filename parser so the
 * model→service consolidation can't silently change how clip names are parsed
 * or how creative_key is derived.
 */
class ClipParserTest extends TestCase
{
    // ── Rendered Templater outputs: parseRendered() ──────────────────

    public function test_parses_full_rendered_filename(): void
    {
        $out = ClipParser::parseRendered('Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9');

        $this->assertSame('Creditstar', $out['brand']);
        $this->assertSame('FI', $out['lang']);
        $this->assertSame('Suunnittele Pt Hae', $out['copy']);
        $this->assertSame('PU8', $out['slate']);
        $this->assertSame('Kemal', $out['actor']);
        $this->assertSame('design1', $out['design']);
        $this->assertSame('16:9', $out['format']);
    }

    public function test_design_token_d_short_form_normalises_to_designN(): void
    {
        $this->assertSame('design2', ClipParser::parseRendered('Monefit_ES_Ahora_TH1_Ana_d2_9x16')['design']);
        $this->assertSame('design1', ClipParser::parseRendered('Monefit_ES_Ahora_TH1_Ana_design1_9x16')['design']);
    }

    /** Every known format token maps to its aspect ratio. */
    public function test_all_format_tokens_map_to_aspect_ratio(): void
    {
        $cases = ['16x9' => '16:9', '1x1' => '1:1', '9x16' => '9:16', '4x5' => '4:5', '4x5v1' => '4:5', '4x5v2' => '4:5'];
        foreach ($cases as $token => $ratio) {
            $out = ClipParser::parseRendered("Creditstar_EN_Hello_PU1_Sam_design1_{$token}");
            $this->assertSame($ratio, $out['format'], "format token {$token}");
        }
    }

    public function test_unknown_brand_leaves_brand_null_but_still_parses(): void
    {
        $out = ClipParser::parseRendered('Acme_EN_Hello_PU1_Sam_design1_16x9');
        $this->assertNull($out['brand']);
        $this->assertSame('PU1', $out['slate']);
    }

    public function test_empty_or_junk_name_returns_all_nulls(): void
    {
        $expected = ['brand' => null, 'lang' => null, 'copy' => null, 'slate' => null, 'actor' => null, 'design' => null, 'format' => null];
        $this->assertSame($expected, ClipParser::parseRendered(''));
        $this->assertSame($expected, ClipParser::parseRendered('___'));
    }

    // ── creative_key derivation ──────────────────────────────────────

    public function test_creative_key_strips_trailing_format_token(): void
    {
        $this->assertSame(
            'Creditstar_PL_rodki_na_TH8_Victoria_design2',
            ClipParser::creativeKey('Creditstar_PL_rodki_na_TH8_Victoria_design2_4x5')
        );
        $this->assertSame(
            'Creditstar_PL_rodki_na_TH8_Victoria_design2',
            ClipParser::creativeKey('Creditstar_PL_rodki_na_TH8_Victoria_design2_16x9')
        );
    }

    public function test_creative_key_without_format_token_is_full_name(): void
    {
        $this->assertSame('No_format_here', ClipParser::creativeKey('No_format_here'));
        $this->assertSame('single', ClipParser::creativeKey('single'));
        $this->assertSame('', ClipParser::creativeKey(null));
    }

    // ── Copy slugification ───────────────────────────────────────────

    public function test_slugify_copy_strips_non_alphanumerics_and_caps_length(): void
    {
        $this->assertSame('Pt', ClipParser::slugifyCopy('Päätä')); // accented chars stripped, mirrors JS templater
        $this->assertSame('one_two_three', ClipParser::slugifyCopy('one two three four five'));
        $this->assertSame('', ClipParser::slugifyCopy(''));
        $this->assertSame('', ClipParser::slugifyCopy(null));
    }

    // ── Source library clips: parse() ────────────────────────────────

    public function test_parse_source_clip_with_category_and_actor(): void
    {
        $out = ClipParser::parse('Product Usage_8_Victoria.mov', 'Product Usage/Product Usage_8_Victoria.mov');
        $this->assertSame('Product Usage', $out['category']);
        $this->assertSame('8', $out['slate_num']);
        $this->assertSame('PU8', $out['slate']);
        $this->assertSame('Victoria', $out['actor']);
        $this->assertSame('', $out['version']);
    }

    public function test_parse_source_clip_version_suffix_pure_digit(): void
    {
        $out = ClipParser::parse('Product Usage_8_Victoria_2.mov', 'x/Product Usage_8_Victoria_2.mov');
        $this->assertSame('2', $out['version']);
        $this->assertSame('8', $out['slate_num']);
        $this->assertSame('Victoria', $out['actor']);
    }

    public function test_parse_source_clip_version_suffix_v_prefixed(): void
    {
        $out = ClipParser::parse('Travel and Holiday_3_Ana_v2.mov', 'x/Travel and Holiday_3_Ana_v2.mov');
        $this->assertSame('2', $out['version']);
        $this->assertSame('3', $out['slate_num']);
        $this->assertSame('TH3', $out['slate']);
        $this->assertSame('Ana', $out['actor']);
    }

    public function test_is_video_recognises_known_extensions(): void
    {
        $this->assertTrue(ClipParser::isVideo('a.mov'));
        $this->assertTrue(ClipParser::isVideo('a.MP4'));
        $this->assertFalse(ClipParser::isVideo('a.txt'));
    }

    // ── Model delegates to the service (single implementation) ────────

    public function test_model_delegates_to_service(): void
    {
        $name = 'Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9';
        $this->assertSame(ClipParser::parseRendered($name), DeliveredClip::parseFilename($name));
        $this->assertSame(ClipParser::creativeKey($name), DeliveredClip::creativeKey($name));
        $this->assertSame(ClipParser::slugifyCopy('one two three'), DeliveredClip::slugifyCopy('one two three'));
    }
}
