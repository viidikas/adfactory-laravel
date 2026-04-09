<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    public function index()
    {
        $sheetUrl = Setting::get('sheet_url', '');
        $renderedPath = Setting::get('rendered_path', '');
        $designsRaw = Setting::get('designs', '[]');

        $designs = is_string($designsRaw) ? json_decode($designsRaw, true) : $designsRaw;
        if (! is_array($designs)) {
            $designs = [];
        }

        return response()->json([
            'sheet_url' => $sheetUrl,
            'rendered_path' => $renderedPath,
            'designs' => $designs,
        ]);
    }

    public function store(Request $request)
    {
        $allowed = ['sheet_url', 'rendered_path', 'designs'];

        foreach ($allowed as $field) {
            if ($request->has($field)) {
                $value = $request->input($field);
                if (is_array($value)) {
                    $value = json_encode($value);
                }
                Setting::set($field, $value);
            }
        }

        return response()->json(['ok' => true]);
    }
}
