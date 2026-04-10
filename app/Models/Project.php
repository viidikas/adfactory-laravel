<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'name',
        'path',
        'is_active',
        'clips_count',
        'scanned_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'scanned_at' => 'datetime',
    ];

    public function clips()
    {
        return $this->hasMany(Clip::class);
    }

    public function getFullPath(): string
    {
        return rtrim(config('app.footage_path', '/mnt/footage'), '/') . '/' . $this->path;
    }
}
