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
}
