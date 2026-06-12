<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Super admins
    |--------------------------------------------------------------------------
    |
    | Email allowlist for the AD.FACTORY admin panel (`/`) and every admin API.
    | Only these users can reach the operator panel and manage markets / per-copy
    | enablement. Everyone else — including ordinary `admin`-role users — is sent
    | to the Growth Portal. Override per environment via ADFACTORY_SUPER_ADMINS
    | (comma-separated). Matched case-insensitively.
    |
    */
    'super_admins' => array_values(array_filter(array_map(
        fn ($email) => strtolower(trim($email)),
        explode(',', (string) env('ADFACTORY_SUPER_ADMINS', 'viljar@viljar.ee'))
    ))),
];
