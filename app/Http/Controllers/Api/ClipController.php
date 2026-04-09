<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Setting;
use Illuminate\Http\Request;

class ClipController extends Controller
{
    public function index()
    {
        return response()->json(Clip::all());
    }

    public function meta()
    {
        return response()->json([
            'clips_count' => Clip::count(),
            'base_path' => Setting::get('footage_base_path', ''),
        ]);
    }

    public function store(Request $request)
    {
        if ($request->has('clips')) {
            $clips = $request->input('clips', []);

            Clip::truncate();

            foreach ($clips as $clipData) {
                Clip::create([
                    'id' => $clipData['id'] ?? $clipData['nameNoExt'] ?? '',
                    'name' => $clipData['name'] ?? '',
                    'name_no_ext' => $clipData['nameNoExt'] ?? '',
                    'relative_path' => $clipData['relativePath'] ?? '',
                    'category' => $clipData['category'] ?? null,
                    'slate' => $clipData['slate'] ?? null,
                    'slate_num' => $clipData['slateNum'] ?? null,
                    'actor' => $clipData['actor'] ?? null,
                    'version' => $clipData['version'] ?? null,
                ]);
            }

            if ($request->has('base_path')) {
                Setting::set('footage_base_path', $request->input('base_path'));
            }

            return response()->json([
                'ok' => true,
                'count' => count($clips),
            ]);
        }

        if ($request->has('base_path')) {
            Setting::set('footage_base_path', $request->input('base_path'));

            return response()->json(['ok' => true]);
        }

        return response()->json(['ok' => false, 'error' => 'No data provided'], 400);
    }
}
