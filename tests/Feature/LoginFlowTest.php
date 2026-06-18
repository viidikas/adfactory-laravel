<?php

namespace Tests\Feature;

use App\Models\LoginCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The passwordless OTP flow renders the new-design Auth/Login page for both the
 * email and code steps (server-driven `step`), and the proven backend behaviour
 * (code issue, verify success/failure, no email enumeration) is unchanged.
 */
class LoginFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_renders_new_design_email_step(): void
    {
        $this->get('/login')
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('step', 'email'));
    }

    public function test_select_issues_code_and_renders_code_step(): void
    {
        $user = $this->lead(['email' => 'nareg@test.com']);

        $this->post('/login/select', ['email' => 'nareg@test.com'])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->where('step', 'code')
                ->where('userEmail', 'nareg@test.com'));

        $this->assertDatabaseHas('login_codes', ['user_id' => $user->id]);
    }

    public function test_unknown_email_does_not_reveal_and_issues_no_code(): void
    {
        $this->post('/login/select', ['email' => 'nobody@test.com'])
            ->assertRedirect('/login')
            ->assertSessionHas('success');

        $this->assertDatabaseCount('login_codes', 0);
    }

    public function test_correct_code_authenticates(): void
    {
        $user = $this->lead();
        LoginCode::create(['user_id' => $user->id, 'code' => bcrypt('123456'), 'expires_at' => now()->addMinutes(10)]);

        $this->withSession(['pending_user_id' => $user->id])
            ->post('/login/verify', ['code' => '123456'])
            ->assertRedirect('/portal')
            ->assertSessionHas('auth_user_id', $user->id);

        // Code is consumed on success.
        $this->assertDatabaseCount('login_codes', 0);
    }

    public function test_wrong_code_rerenders_code_step_with_error(): void
    {
        $user = $this->lead();
        LoginCode::create(['user_id' => $user->id, 'code' => bcrypt('123456'), 'expires_at' => now()->addMinutes(10)]);

        $this->withSession(['pending_user_id' => $user->id])
            ->post('/login/verify', ['code' => '000000'])
            ->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page->component('Auth/Login')->where('step', 'code'));

        $this->assertNull(session('auth_user_id'));
    }
}
