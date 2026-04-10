<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    public function index()
    {
        return response()->json([
            'sheet_url' => Setting::get('sheet_url', ''),
            'rendered_path' => Setting::get('rendered_path', ''),
            'designs' => $this->getJson('designs'),
            'copy_rows' => $this->getJson('copy_rows'),
            'shot_descriptions' => $this->getJson('shot_descriptions'),
        ]);
    }

    public function store(Request $request)
    {
        $allowed = ['sheet_url', 'rendered_path', 'designs', 'copy_rows', 'shot_descriptions'];

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

    private function getJson(string $key): array
    {
        $raw = Setting::get($key, '[]');
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

        return is_array($decoded) ? $decoded : [];
    }
}
