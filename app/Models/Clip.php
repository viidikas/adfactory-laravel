<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Clip extends Model
{
    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'project_id',
        'name',
        'name_no_ext',
        'relative_path',
        'category',
        'slate',
        'slate_num',
        'actor',
        'version',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
