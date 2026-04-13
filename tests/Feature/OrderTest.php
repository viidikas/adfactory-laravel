<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_growth_lead_can_create_order(): void
    {
        $user = User::create([
            'name' => 'Lead',
            'email' => 'lead@test.com',
            'role' => 'growth_lead',
        ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/orders', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'market' => 'FI',
                'note' => 'Test order',
                'items' => [
                    [
                        'clipId' => 'test_clip_1',
                        'clipName' => 'Test Clip',
                        'slate' => 'PU1',
                        'category' => 'Product Usage',
                        'actor' => 'Andrey',
                        'copyKey' => 'Tap_to_invest',
                        'copyText' => ['en' => 'Tap to invest'],
                        'langs' => ['EN'],
                        'designs' => ['design1'],
                    ],
                ],
            ]);

        $response->assertStatus(201);
    }

    public function test_growth_lead_sees_only_own_orders(): void
    {
        $lead1 = User::create(['name' => 'Lead1', 'email' => 'lead1@test.com', 'role' => 'growth_lead']);
        $lead2 = User::create(['name' => 'Lead2', 'email' => 'lead2@test.com', 'role' => 'growth_lead']);

        // Create order for lead1
        $this->withSession(['auth_user_id' => $lead1->id])
            ->postJson('/api/orders', [
                'user_id' => $lead1->id,
                'user_name' => $lead1->name,
                'market' => 'FI',
                'items' => [['clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1', 'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k', 'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => []]],
            ]);

        // Lead2 should see empty
        $response = $this->withSession(['auth_user_id' => $lead2->id])
            ->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json());
    }

    public function test_admin_sees_all_orders(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);
        $lead = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $this->withSession(['auth_user_id' => $lead->id])
            ->postJson('/api/orders', [
                'user_id' => $lead->id,
                'user_name' => $lead->name,
                'market' => 'FI',
                'items' => [['clipId' => 'c1', 'clipName' => 'C1', 'slate' => 'PU1', 'category' => 'PU', 'actor' => 'A', 'copyKey' => 'k', 'copyText' => ['en' => 'x'], 'langs' => ['EN'], 'designs' => []]],
            ]);

        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }
}
