<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_growth_lead_forbidden_on_users_list(): void
    {
        $user = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    public function test_growth_lead_forbidden_on_create_user(): void
    {
        $user = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $response = $this->withSession(['auth_user_id' => $user->id])
            ->postJson('/api/users', ['name' => 'New', 'email' => 'new@test.com', 'role' => 'growth_lead']);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_user(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);

        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->postJson('/api/users', ['name' => 'New Lead', 'email' => 'newlead@test.com', 'role' => 'growth_lead']);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'newlead@test.com']);
    }

    public function test_admin_can_update_user(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);
        $lead = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->putJson("/api/users/{$lead->id}", ['name' => 'Updated Lead']);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $lead->id, 'name' => 'Updated Lead']);
    }

    public function test_admin_can_delete_user(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);
        $lead = User::create(['name' => 'Lead', 'email' => 'lead@test.com', 'role' => 'growth_lead']);

        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->deleteJson("/api/users/{$lead->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $lead->id]);
    }

    public function test_admin_cannot_delete_self(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@test.com', 'role' => 'admin']);

        $response = $this->withSession(['auth_user_id' => $admin->id])
            ->deleteJson("/api/users/{$admin->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }
}
