<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Project;
use App\Services\ClipParser;
use Illuminate\Http\Request;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class ProjectController extends Controller
{
    public function index()
    {
        return response()->json(
            Project::orderByDesc('is_active')
                ->orderByDesc('scanned_at')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'path' => 'required|string|max:255|unique:projects,path',
        ]);

        $basePath = rtrim(config('app.footage_path', '/mnt/footage'), '/');
        $fullPath = $validated['path'] === '.'
            ? $basePath
            : $basePath . '/' . $validated['path'];

        if (! is_dir($fullPath)) {
            return response()->json([
                'message' => "Folder not found: {$validated['path']}",
            ], 422);
        }

        $project = Project::create($validated);

        return response()->json($project, 201);
    }

    public function scan(Project $project)
    {
        $basePath = rtrim(config('app.footage_path', '/mnt/footage'), '/');
        $projectPath = $project->path === '.'
            ? $basePath
            : $basePath . '/' . $project->path;

        if (! is_dir($projectPath)) {
            return response()->json([
                'message' => "Folder not found: {$project->path}",
            ], 422);
        }

        // Delete existing clips for this project
        Clip::where('project_id', $project->id)->delete();

        $clips = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($projectPath, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                continue;
            }

            $filename = $file->getFilename();

            if (! ClipParser::isVideo($filename)) {
                continue;
            }

            // relative_path from FOOTAGE_PATH root (includes project subfolder)
            $relativePath = ltrim(str_replace($basePath, '', $file->getPathname()), '/');

            $parsed = ClipParser::parse($filename, $relativePath);
            // Use project path + nameNoExt as ID for uniqueness across projects
            $parsed['id'] = $project->path . '/' . $parsed['name_no_ext'];
            $parsed['project_id'] = $project->id;

            $clips[] = $parsed;
        }

        // Bulk insert
        foreach (array_chunk($clips, 100) as $chunk) {
            Clip::upsert($chunk, ['id'], [
                'project_id', 'name', 'name_no_ext', 'relative_path',
                'category', 'slate', 'slate_num', 'actor', 'version',
            ]);
        }

        $project->update([
            'clips_count' => count($clips),
            'scanned_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'count' => count($clips),
        ]);
    }

    public function activate(Project $project)
    {
        Project::where('is_active', true)->update(['is_active' => false]);
        $project->update(['is_active' => true]);

        return response()->json(['ok' => true]);
    }

    public function designs(Project $project)
    {
        return response()->json($project->designs ?? []);
    }

    public function updateDesigns(Request $request, Project $project)
    {
        $project->update(['designs' => $request->input('designs', [])]);

        return response()->json(['ok' => true, 'count' => count($project->designs ?? [])]);
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->json(['ok' => true]);
    }
}
