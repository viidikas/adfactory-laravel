<?php

namespace Tests\Feature;

use App\Models\Clip;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClipTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'role' => 'admin',
        ]);
    }

    private function createGrowthLead(): User
    {
        return User::create([
            'name' => 'Lead',
            'email' => 'lead@test.com',
            'role' => 'growth_lead',
        ]);
    }

    private function seedClips(): Project
    {
        $project = Project::create([
            'name' => 'Test Project',
            'path' => '.',
            'is_active' => true,
        ]);

        $clips = [
            ['id' => 'test/PU1_Andrey', 'project_id' => $project->id, 'name' => 'Product Usage_1_Andrey.mov', 'name_no_ext' => 'Product Usage_1_Andrey', 'relative_path' => 'Product Usage/Product Usage_1_Andrey.mov', 'category' => 'Product Usage', 'slate' => 'PU1', 'slate_num' => '1', 'actor' => 'Andrey'],
            ['id' => 'test/LE3_Viktoria', 'project_id' => $project->id, 'name' => 'Lifestyle and Events_3_Viktoria.mov', 'name_no_ext' => 'Lifestyle and Events_3_Viktoria', 'relative_path' => 'Lifestyle and Events/Lifestyle and Events_3_Viktoria.mov', 'category' => 'Lifestyle and Events', 'slate' => 'LE3', 'slate_num' => '3', 'actor' => 'Viktoria'],
            ['id' => 'test/TH1_Andrey', 'project_id' => $project->id, 'name' => 'Travel and Holiday_1_Andrey.mov', 'name_no_ext' => 'Travel and Holiday_1_Andrey', 'relative_path' => 'Travel and Holiday/Travel and Holiday_1_Andrey.mov', 'category' => 'Travel and Holiday', 'slate' => 'TH1', 'slate_num' => '1', 'actor' => 'Andrey'],
        ];

        foreach ($clips as $clip) {
            Clip::create($clip);
        }

        return $project;
    }

    public function test_returns_200_for_growth_lead(): void
    {
        $user = $this->createGrowthLead();
        $this->seedClips();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/clips');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json());
    }

    public function test_returns_200_for_admin(): void
    {
        $user = $this->createAdmin();
        $this->seedClips();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/clips');

        $response->assertStatus(200);
    }

    public function test_returns_401_for_unauthenticated(): void
    {
        $response = $this->getJson('/api/clips');

        $response->assertStatus(401);
    }

    public function test_category_filter_case_insensitive(): void
    {
        $user = $this->createGrowthLead();
        $this->seedClips();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/clips?category=product+usage');

        $response->assertStatus(200);
        $clips = $response->json();
        $this->assertCount(1, $clips);
        $this->assertEquals('Product Usage', $clips[0]['category']);
    }

    public function test_search_filter(): void
    {
        $user = $this->createGrowthLead();
        $this->seedClips();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/clips?search=andrey');

        $response->assertStatus(200);
        $clips = $response->json();
        $this->assertCount(2, $clips); // PU1_Andrey and TH1_Andrey
    }

    public function test_post_clips_forbidden_for_growth_lead(): void
    {
        $user = $this->createGrowthLead();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/clips', ['clips' => []]);

        $response->assertStatus(403);
    }

    public function test_post_clips_allowed_for_admin(): void
    {
        $user = $this->createAdmin();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/clips', ['clips' => [], 'base_path' => '/test']);

        $response->assertStatus(200);
    }

    /**
     * Clip copy must come from ENABLED copies of ACTIVE markets — the live,
     * approved copy — not retired (disabled) copy and not copy of inactive
     * markets. This is what keeps Generate from surfacing old copy lines.
     */
    public function test_clip_copy_comes_from_enabled_active_market_copies_only(): void
    {
        $user = $this->createAdmin();
        $this->seedClips(); // includes a PU1 clip

        $active = $this->market(['code' => 'EE', 'active' => true]);
        $this->copy($active, ['copy_key' => 'Fresh', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Fresh approved copy', 'et' => 'Värske']]);
        $this->copy($active, ['copy_key' => 'Retired', 'shot' => 'PU1', 'enabled' => false,
            'copy_text' => ['en' => 'Old retired copy']]);

        $inactive = $this->market(['code' => 'NO', 'active' => false]);
        $this->copy($inactive, ['copy_key' => 'InactiveOnly', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Copy from an inactive market']]);

        $clips = collect($this->asUser($user)->getJson('/api/clips')->assertStatus(200)->json());
        $pu1 = $clips->firstWhere('slate', 'PU1');
        $ens = collect($pu1['copy'])->pluck('en');

        $this->assertTrue($ens->contains('Fresh approved copy'));
        $this->assertFalse($ens->contains('Old retired copy'));
        $this->assertFalse($ens->contains('Copy from an inactive market'));
    }

    /**
     * A language a market doesn't carry is filled from another active market that
     * does (per-market copy_text only holds that market's languages).
     */
    public function test_clip_copy_merges_languages_across_active_markets(): void
    {
        $user = $this->createAdmin();
        $this->seedClips();

        $ee = $this->market(['code' => 'EE', 'active' => true]);
        $this->copy($ee, ['copy_key' => 'Shared', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Shared line', 'et' => 'Estonian']]);
        $es = $this->market(['code' => 'ES', 'active' => true]);
        $this->copy($es, ['copy_key' => 'Shared', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Shared line', 'es' => 'Spanish']]);

        $clips = collect($this->asUser($user)->getJson('/api/clips')->json());
        $pu1 = $clips->firstWhere('slate', 'PU1');
        $shared = collect($pu1['copy'])->firstWhere('key', 'Shared');

        $this->assertSame('Estonian', $shared['et']);
        $this->assertSame('Spanish', $shared['es']);
    }

    /**
     * market_id scopes clip copy to a single market (admin Generate, per-market):
     * only that market's enabled copy is attached, not other active markets'.
     */
    public function test_market_id_scopes_clip_copy_to_that_market_only(): void
    {
        $user = $this->createAdmin();
        $this->seedClips(); // includes a PU1 clip

        $ee = $this->market(['code' => 'EE', 'active' => true]);
        $this->copy($ee, ['copy_key' => 'EE_line', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Estonia copy', 'et' => 'Eesti']]);

        $es = $this->market(['code' => 'ES', 'active' => true]);
        $this->copy($es, ['copy_key' => 'ES_line', 'shot' => 'PU1', 'enabled' => true,
            'copy_text' => ['en' => 'Spain copy', 'es' => 'Espana']]);

        // Scoped to EE → only EE's copy line.
        $pu1 = collect($this->asUser($user)->getJson('/api/clips?market_id='.$ee->id)->assertStatus(200)->json())
            ->firstWhere('slate', 'PU1');
        $keys = collect($pu1['copy'])->pluck('key');
        $this->assertTrue($keys->contains('EE_line'));
        $this->assertFalse($keys->contains('ES_line'));

        // No market_id → merged across active markets (both present).
        $pu1All = collect($this->asUser($user)->getJson('/api/clips')->json())->firstWhere('slate', 'PU1');
        $keysAll = collect($pu1All['copy'])->pluck('key');
        $this->assertTrue($keysAll->contains('EE_line'));
        $this->assertTrue($keysAll->contains('ES_line'));
    }
}
