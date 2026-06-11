<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProxyTest extends TestCase
{
    use RefreshDatabase;

    public function test_growth_lead_gets_403_on_anthropic_proxy(): void
    {
        $lead = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $response = $this->withSession(['auth_user_id' => $lead->id])
            ->postJson('/api/proxy', ['model' => 'whatever', 'messages' => []]);

        $response->assertStatus(403);
    }

    public function test_guest_gets_401_on_anthropic_proxy(): void
    {
        $response = $this->postJson('/api/proxy', ['model' => 'whatever', 'messages' => []]);

        $response->assertStatus(401);
    }
}
