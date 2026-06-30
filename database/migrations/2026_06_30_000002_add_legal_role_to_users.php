<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add the 'legal' role. Laravel renders enum() as a Postgres CHECK
     * constraint, so widening it means swapping the constraint. We drop any
     * existing CHECK constraint on users (only the role one exists) and re-add it
     * with the new value set.
     */
    public function up(): void
    {
        $this->dropRoleChecks();
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['admin'::text, 'growth_lead'::text, 'legal'::text]))");
    }

    public function down(): void
    {
        $this->dropRoleChecks();
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['admin'::text, 'growth_lead'::text]))");
    }

    private function dropRoleChecks(): void
    {
        foreach (DB::select("SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c'") as $c) {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS "'.$c->conname.'"');
        }
    }
};
