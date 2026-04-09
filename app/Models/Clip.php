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
        'name',
        'name_no_ext',
        'relative_path',
        'category',
        'slate',
        'slate_num',
        'actor',
        'version',
    ];
}
