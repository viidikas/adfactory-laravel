<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Http\Request;

class ClipController extends Controller
{
    public function index(Request $request)
    {
        $query = Clip::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        } else {
            // Default: return clips for the active project
            $activeProject = Project::where('is_active', true)->first();
            if ($activeProject) {
                $query->where('project_id', $activeProject->id);
            }
        }

        return response()->json($query->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'nameNoExt' => $c->name_no_ext,
            'relativePath' => $c->relative_path,
            'category' => $c->category,
            'slate' => $c->slate,
            'slateNum' => $c->slate_num,
            'actor' => $c->actor,
            'version' => $c->version,
        ]));
    }

    public function meta()
    {
        $activeProject = Project::where('is_active', true)->first();

        return response()->json([
            'clips_count' => $activeProject ? $activeProject->clips_count : Clip::count(),
            'base_path' => Setting::get('footage_base_path', ''),
            'active_project' => $activeProject ? [
                'id' => $activeProject->id,
                'name' => $activeProject->name,
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        if ($request->has('clips')) {
            $clips = $request->input('clips', []);

            Clip::whereNull('project_id')->delete();

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
