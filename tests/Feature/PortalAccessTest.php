<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortalAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_growth_lead_reaches_portal(): void
    {
        $user = User::create([
            'name' => 'Lead',
            'email' => 'lead@test.com',
            'role' => 'growth_lead',
        ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->get('/portal');

        $response->assertStatus(200);
    }

    public function test_growth_lead_redirected_from_admin(): void
    {
        $user = User::create([
            'name' => 'Lead',
            'email' => 'lead@test.com',
            'role' => 'growth_lead',
        ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->get('/');

        $response->assertRedirect('/portal');
    }

    public function test_admin_reaches_admin_page(): void
    {
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'role' => 'admin',
        ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->get('/');

        $response->assertStatus(200);
    }

    public function test_admin_reaches_portal(): void
    {
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'role' => 'admin',
        ]);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->get('/portal');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_redirected_to_login(): void
    {
        $response = $this->get('/');
        $response->assertRedirect('/login');

        $response = $this->get('/portal');
        $response->assertRedirect('/login');
    }
}
