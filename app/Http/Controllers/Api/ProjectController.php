<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Project;
use App\Services\ClipParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

    public function uploadDesignImage(Request $request, Project $project)
    {
        $request->validate([
            'image' => 'required|image|max:10240',
        ]);

        $file = $request->file('image');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        if ($ext === 'jpeg') {
            $ext = 'jpg';
        }
        $filename = Str::random(16) . '.' . $ext;
        $path = "designs/{$project->id}/{$filename}";

        Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));

        return response()->json([
            'url' => '/storage/' . $path,
        ]);
    }

    public function deleteDesignImage(Request $request, Project $project)
    {
        $url = (string) $request->input('url', '');
        // Only allow deletion of files we own: must match /storage/designs/{project_id}/<filename>
        $prefix = "/storage/designs/{$project->id}/";
        if (!str_starts_with($url, $prefix)) {
            return response()->json(['ok' => false, 'error' => 'invalid url'], 422);
        }
        $relative = substr($url, strlen('/storage/'));
        if (Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }
        return response()->json(['ok' => true]);
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->json(['ok' => true]);
    }
}
