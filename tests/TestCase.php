<?php

namespace Tests;

use App\Models\Copy;
use App\Models\Market;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The AD.FACTORY panel + admin APIs are now super-admin gated. The
        // existing admin-surface tests create the conventional `admin@test.com`
        // inline (not via admin()), so treat it as a super-admin — these tests
        // describe the authorised operator. nonSuperAdmin() stays blocked.
        $this->allowSuperAdmin('admin@test.com');
    }

    protected function admin(array $attrs = []): User
    {
        $user = User::create(array_merge([
            'name' => 'Admin',
            'email' => 'admin'.uniqid().'@test.com',
            'role' => 'admin',
        ], $attrs));

        // The AD.FACTORY panel + markets/per-copy admin are super-admin gated, so
        // tests treat their admins as super-admins (they pass the gate). Use
        // nonSuperAdmin() for an admin that should be blocked by the gate.
        $this->allowSuperAdmin($user->email);

        return $user;
    }

    /**
     * An admin-role user that is NOT on the super-admin allowlist — proves the
     * AD.FACTORY / markets gate blocks ordinary admins, not just growth leads.
     */
    protected function nonSuperAdmin(array $attrs = []): User
    {
        return User::create(array_merge([
            'name' => 'Plain Admin',
            'email' => 'plainadmin'.uniqid().'@test.com',
            'role' => 'admin',
        ], $attrs));
    }

    /**
     * Add an email to the super-admin allowlist for the current test run.
     */
    protected function allowSuperAdmin(string $email): void
    {
        $list = (array) config('adfactory.super_admins', []);
        $list[] = strtolower($email);
        config(['adfactory.super_admins' => array_values(array_unique($list))]);
    }

    protected function lead(array $attrs = []): User
    {
        return User::create(array_merge([
            'name' => 'Lead',
            'email' => 'lead'.uniqid().'@test.com',
            'role' => 'growth_lead',
        ], $attrs));
    }

    /**
     * A legal reviewer (role = legal, never on the super-admin allowlist).
     */
    protected function legal(array $attrs = []): User
    {
        return User::create(array_merge([
            'name' => 'Legal',
            'email' => 'legal'.uniqid().'@test.com',
            'role' => 'legal',
        ], $attrs));
    }

    /**
     * Authenticate the next request as the given user (session-based auth).
     */
    protected function asUser(User $user): static
    {
        return $this->withSession(['auth_user_id' => $user->id]);
    }

    protected function market(array $attrs = []): Market
    {
        $code = $attrs['code'] ?? 'FI';

        return Market::create(array_merge([
            'code' => $code,
            'name' => $code,
            'brand' => 'Creditstar',
            'sheet_tab' => $code,
            'has_disclaimer' => true,
            'active' => true,
        ], $attrs));
    }

    protected function copy(Market $market, array $attrs = []): Copy
    {
        $key = $attrs['copy_key'] ?? 'Tap_to_invest';

        return $market->copies()->create(array_merge([
            'copy_key' => $key,
            'copy_text' => ['en' => 'Tap to invest', 'et' => 'Puuduta'],
            'category' => 'Product Usage',
            'shot' => 'PU1',
            'brand' => 'Creditstar',
            'requires_disclaimer' => false,
            // Default to enabled so order-flow helpers work; tests that exercise
            // the per-copy gate pass enabled=false explicitly.
            'enabled' => true,
        ], $attrs));
    }

    /**
     * A valid order item payload referencing the given copy key.
     */
    protected function itemPayload(string $copyKey, array $attrs = []): array
    {
        return array_merge([
            'clipId' => 'c1',
            'clipName' => 'C1',
            'slate' => 'PU1',
            'category' => 'Product Usage',
            'actor' => 'Andrey',
            'copyKey' => $copyKey,
            'copyText' => ['en' => 'whatever the client claims'],
            'langs' => ['EN'],
            'designs' => ['design1'],
        ], $attrs);
    }
}
