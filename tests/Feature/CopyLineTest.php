<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CopyLineTest extends TestCase
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

    private function seedCopyLines(): void
    {
        $copyLines = [
            [
                'key' => 'Fund_your_forever',
                'category' => 'Lifestyle and Events',
                'shot' => 'LE3',
                'brand' => 'Creditstar',
                'en' => 'Fund your forever',
                'et' => 'Rahasta oma igavikku',
                'fr' => 'Financez votre avenir',
                'de' => 'Finanziere dein Für-immer',
                'es' => 'Financia tu para siempre',
            ],
            [
                'key' => 'Tap_to_invest',
                'category' => 'Product Usage',
                'shot' => 'PU1, PU2, PU7',
                'brand' => 'Creditstar',
                'en' => 'Tap to invest',
                'et' => 'Puuduta investeerimiseks',
                'fr' => '',
                'de' => '',
                'es' => '',
            ],
            [
                'key' => 'SmartSaver_text',
                'category' => 'Product Usage',
                'shot' => 'PU1',
                'brand' => 'SmartSaver',
                'en' => 'SmartSaver only text',
                'et' => '',
                'fr' => '',
                'de' => '',
                'es' => '',
            ],
            [
                'key' => 'Borrow_smart',
                'category' => 'Home Renovation',
                'shot' => '',
                'brand' => 'Creditstar',
                'en' => 'Borrow smart, build happy',
                'et' => 'Laena targalt',
                'fr' => '',
                'de' => '',
                'es' => '',
            ],
        ];

        Setting::set('copy_lines', json_encode($copyLines));
    }

    public function test_returns_200_for_authenticated_user(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $response->assertStatus(200);
    }

    public function test_returns_401_for_unauthenticated(): void
    {
        $response = $this->getJson('/api/copy-lines');

        $response->assertStatus(401);
    }

    public function test_categories_are_normalised(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $categories = collect($lines)->pluck('category')->unique()->values()->toArray();

        $this->assertContains('Home Renovation', $categories);
        $this->assertContains('Lifestyle and Events', $categories);
        $this->assertContains('Product Usage', $categories);
    }

    public function test_smartsaver_rows_included(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $keys = collect($lines)->pluck('key')->toArray();

        $this->assertContains('SmartSaver_text', $keys);
    }

    public function test_shot_field_present(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $le3Line = collect($lines)->firstWhere('key', 'Fund_your_forever');

        $this->assertNotNull($le3Line);
        $this->assertTrue(str_contains($le3Line['shot'], 'LE3'));
    }

    public function test_blank_shot_has_category(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $hrLine = collect($lines)->firstWhere('key', 'Borrow_smart');

        $this->assertNotNull($hrLine);
        $this->assertEquals('Home Renovation', $hrLine['category']);
        $this->assertEquals('', $hrLine['shot']);
    }

    public function test_returns_empty_array_when_no_data(): void
    {
        $user = $this->createGrowthLead();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $response->assertStatus(200);
        $response->assertJson([]);
    }
}
