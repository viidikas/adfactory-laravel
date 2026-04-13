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

    private function seedSlateData(): void
    {
        $slateData = [
            'LE3' => [
                'description' => 'Older actor sighing with joy',
                'markets' => 'EEA',
                'copy' => [
                    [
                        'key' => 'Fund_your_forever',
                        'en' => 'Fund your forever',
                        'et' => 'Rahasta oma igavikku',
                        'fr' => 'Financez votre avenir',
                        'de' => 'Finanziere dein Für-immer',
                        'es' => 'Financia tu para siempre',
                        'brand' => 'Creditstar',
                        'shot' => 'LE1, LE2, LE3',
                        'category' => 'Lifestyle/Events', // shorthand from sheet
                    ],
                ],
            ],
            'PU1' => [
                'description' => 'Phone passed from one hand to another',
                'markets' => 'EEA',
                'copy' => [
                    [
                        'key' => 'Tap_to_invest',
                        'en' => 'Tap to invest',
                        'et' => 'Puuduta investeerimiseks',
                        'fr' => '',
                        'de' => '',
                        'es' => '',
                        'brand' => 'Creditstar',
                        'shot' => 'PU1, PU2, PU7',
                        'category' => 'Product usage', // lowercase from sheet
                    ],
                    [
                        'key' => 'SmartSaver_row',
                        'en' => 'SmartSaver only text',
                        'et' => '',
                        'fr' => '',
                        'de' => '',
                        'es' => '',
                        'brand' => 'SmartSaver',
                        'shot' => 'PU1',
                        'category' => 'Product Usage',
                    ],
                ],
            ],
            'HR5' => [
                'description' => 'Unboxing a home appliance',
                'markets' => 'ES, EE',
                'copy' => [
                    [
                        'key' => 'Borrow_smart',
                        'en' => 'Borrow smart, build happy',
                        'et' => 'Laena targalt',
                        'fr' => '',
                        'de' => '',
                        'es' => '',
                        'brand' => 'Creditstar',
                        'shot' => '',
                        'category' => 'Home Reno', // shorthand from sheet
                    ],
                ],
            ],
            'TH1' => [
                'description' => 'Pulling a suitcase',
                'markets' => 'EEA',
                'copy' => [
                    [
                        'key' => 'Empty_en_row',
                        'en' => '',
                        'et' => 'Some Estonian',
                        'fr' => '',
                        'de' => '',
                        'es' => '',
                        'brand' => '',
                        'shot' => 'TH1',
                    ],
                ],
            ],
        ];

        Setting::set('slate_data', json_encode($slateData));
    }

    public function test_returns_200_for_authenticated_user(): void
    {
        $user = $this->createGrowthLead();
        $this->seedSlateData();

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
        $this->seedSlateData();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $categories = collect($lines)->pluck('category')->unique()->values()->toArray();

        $this->assertNotContains('Home Reno', $categories);
        $this->assertNotContains('Lifestyle/Events', $categories);
        $this->assertNotContains('Product usage', $categories);
        $this->assertContains('Home Renovation', $categories);
        $this->assertContains('Lifestyle and Events', $categories);
        $this->assertContains('Product Usage', $categories);
    }

    public function test_empty_en_rows_excluded(): void
    {
        $user = $this->createGrowthLead();
        $this->seedSlateData();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $enValues = collect($lines)->pluck('en')->toArray();

        $this->assertNotContains('', $enValues);
    }

    public function test_shot_field_contains_slate_codes(): void
    {
        $user = $this->createGrowthLead();
        $this->seedSlateData();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $le3Line = collect($lines)->firstWhere('key', 'Fund_your_forever');

        $this->assertNotNull($le3Line);
        $this->assertStringContains('LE3', $le3Line['shot']);
    }

    public function test_blank_shot_uses_category_from_slate(): void
    {
        $user = $this->createGrowthLead();
        $this->seedSlateData();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $lines = $response->json();
        $hrLine = collect($lines)->firstWhere('key', 'Borrow_smart');

        $this->assertNotNull($hrLine);
        $this->assertEquals('Home Renovation', $hrLine['category']);
    }

    public function test_returns_empty_array_when_no_slate_data(): void
    {
        $user = $this->createGrowthLead();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $response->assertStatus(200);
        $response->assertJson([]);
    }

    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            "Failed asserting that '{$haystack}' contains '{$needle}'."
        );
    }
}
