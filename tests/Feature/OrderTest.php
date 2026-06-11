<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_growth_lead_can_create_order(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'Tap_to_invest']);
        $user = $this->lead();

        $response = $this->asUser($user)->postJson('/api/orders', [
            'user_name' => $user->name,
            'market_id' => $market->id,
            'note' => 'Test order',
            'items' => [$this->itemPayload('Tap_to_invest')],
        ]);

        $response->assertStatus(201);
        $this->assertEquals($market->id, $response->json('market_id'));
    }

    public function test_growth_lead_cannot_set_another_user_id_on_order(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $attacker = $this->lead();
        $victim = $this->lead();

        $response = $this->asUser($attacker)->postJson('/api/orders', [
            // Spoofed owner — must be ignored, order belongs to the authenticated user.
            'user_id' => $victim->id,
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ]);

        $response->assertStatus(201);
        $this->assertSame($attacker->id, $response->json('user_id'));
        $this->assertDatabaseHas('orders', ['id' => $response->json('id'), 'user_id' => $attacker->id]);
        $this->assertDatabaseMissing('orders', ['id' => $response->json('id'), 'user_id' => $victim->id]);
    }

    public function test_growth_lead_sees_only_own_orders(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $lead1 = $this->lead();
        $lead2 = $this->lead();

        $this->asUser($lead1)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ])->assertStatus(201);

        $response = $this->asUser($lead2)->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json());
    }

    public function test_admin_sees_all_orders(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $admin = $this->admin();
        $lead = $this->lead();

        $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => [$this->itemPayload('k')],
        ])->assertStatus(201);

        $response = $this->asUser($admin)->getJson('/api/orders');

        $response->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }
}
