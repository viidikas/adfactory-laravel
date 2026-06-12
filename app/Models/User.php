<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Model
{
    protected $fillable = ['name', 'email', 'role', 'market'];

    public function loginCodes(): HasMany
    {
        return $this->hasMany(LoginCode::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Super admins are the only users allowed into the AD.FACTORY operator panel
     * and the markets / per-copy admin. Gated by a config email allowlist
     * (config/adfactory.php → super_admins), matched case-insensitively.
     */
    public function isSuperAdmin(): bool
    {
        $allow = (array) config('adfactory.super_admins', []);

        return in_array(strtolower((string) $this->email), $allow, true);
    }

    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    public function scopeGrowthLeads($query)
    {
        return $query->where('role', 'growth_lead');
    }
}
