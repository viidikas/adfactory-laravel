<?php

namespace Tests;

use App\Models\Copy;
use App\Models\Market;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function admin(array $attrs = []): User
    {
        return User::create(array_merge([
            'name' => 'Admin',
            'email' => 'admin'.uniqid().'@test.com',
            'role' => 'admin',
        ], $attrs));
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
