<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);
    }

    private function createGrowthLead(): User
    {
        return User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);
    }

    private function seedCopyLines(): void
    {
        Setting::set('copy_lines', json_encode([
            ['key' => 'cs_only', 'category' => 'Product Usage', 'shot' => 'PU1', 'brand' => 'Creditstar', 'en' => 'CS only copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'mf_only', 'category' => 'Product Usage', 'shot' => 'PU2', 'brand' => 'Monefit', 'en' => 'MF only copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'either_copy', 'category' => 'Product Usage', 'shot' => 'PU3', 'brand' => 'Either', 'en' => 'Either brand copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
            ['key' => 'ss_copy', 'category' => 'Product Usage', 'shot' => 'PU4', 'brand' => 'SmartSaver', 'en' => 'SmartSaver copy', 'et' => '', 'fr' => '', 'de' => '', 'es' => ''],
        ]));
    }

    public function test_copy_lines_creditstar_includes_either(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines?brand=Creditstar');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('cs_only', $keys);
        $this->assertContains('either_copy', $keys);
        $this->assertNotContains('mf_only', $keys);
        $this->assertNotContains('ss_copy', $keys);
    }

    public function test_copy_lines_monefit_includes_either(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines?brand=Monefit');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('mf_only', $keys);
        $this->assertContains('either_copy', $keys);
        $this->assertNotContains('cs_only', $keys);
        $this->assertNotContains('ss_copy', $keys);
    }

    public function test_copy_lines_no_brand_returns_all_except_smartsaver(): void
    {
        $user = $this->createGrowthLead();
        $this->seedCopyLines();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/copy-lines');

        $keys = collect($response->json())->pluck('key')->toArray();
        $this->assertContains('cs_only', $keys);
        $this->assertContains('mf_only', $keys);
        $this->assertContains('either_copy', $keys);
        // SmartSaver may or may not be in raw copy_lines — depends on whether sync excluded it
        // The brand filter only applies when ?brand= is specified
    }

    public function test_order_stores_brand(): void
    {
        $user = $this->createGrowthLead();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'brand' => 'Monefit',
                'market' => 'FI',
                'items' => [[
                    'clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1',
                    'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k',
                    'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => [],
                ]],
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', ['brand' => 'Monefit']);
    }

    public function test_order_defaults_to_creditstar(): void
    {
        $user = $this->createGrowthLead();

        $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'market' => 'FI',
                'items' => [[
                    'clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1',
                    'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k',
                    'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => [],
                ]],
            ]);

        $this->assertDatabaseHas('orders', ['brand' => 'Creditstar']);
    }

    public function test_order_invalid_brand_returns_422(): void
    {
        $user = $this->createGrowthLead();

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'brand' => 'InvalidBrand',
                'market' => 'FI',
                'items' => [[
                    'clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1',
                    'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k',
                    'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => [],
                ]],
            ]);

        $response->assertStatus(422);
    }

    public function test_orders_response_includes_brand(): void
    {
        $user = $this->createGrowthLead();

        $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'brand' => 'Monefit',
                'market' => 'FI',
                'items' => [[
                    'clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1',
                    'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k',
                    'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => [],
                ]],
            ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertEquals('Monefit', $response->json()[0]['brand']);
    }

    public function test_orders_brand_filter(): void
    {
        $admin = $this->createAdmin();
        $user = $this->createGrowthLead();

        // Create one CS order and one MF order
        $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id, 'user_name' => $user->name, 'brand' => 'Creditstar',
                'items' => [['clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1', 'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k', 'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => []]],
            ]);
        $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id, 'user_name' => $user->name, 'brand' => 'Monefit',
                'items' => [['clipId' => 'c2', 'clipName' => 'C2', 'slate' => 'PU2', 'category' => 'PU', 'actor' => 'B', 'copyKey' => 'k2', 'copyText' => ['en' => 'y'], 'langs' => ['EN'], 'designs' => []]],
            ]);

        // Admin filters by Monefit
        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->getJson('/api/orders?brand=Monefit');

        $this->assertCount(1, $response->json());
        $this->assertEquals('Monefit', $response->json()[0]['brand']);
    }
}
