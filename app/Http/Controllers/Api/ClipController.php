<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clip;
use App\Models\Copy;
use App\Models\Market;
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

        // Optional filters
        if ($request->filled('category')) {
            $query->whereRaw('LOWER(category) = ?', [strtolower($request->input('category'))]);
        }

        if ($request->filled('search')) {
            $search = '%'.strtolower($request->input('search')).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(actor) LIKE ?', [$search]);
            });
        }

        if ($request->filled('actor')) {
            $query->where('actor', $request->input('actor'));
        }

        // slate_data still provides shot description / market hints (clip metadata).
        $slateDataRaw = Setting::get('slate_data', '{}');
        $slateData = json_decode($slateDataRaw, true) ?: [];

        // Copy comes from the LIVE per-market copies (enabled, in an active market),
        // not the stale legacy slate_data snapshot — so Generate and the clip
        // copy-key picker reflect exactly what's approved in Markets today.
        [$copyBySlate, $copyByCategory] = $this->liveCopyMaps();

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
            'description' => $slateData[$c->slate]['description'] ?? null,
            'markets' => $slateData[$c->slate]['markets'] ?? null,
            'copy' => $this->copyForClip($c, $copyBySlate, $copyByCategory),
        ]));
    }

    /**
     * Build slate→copy[] and category→copy[] maps from the copies that are
     * ENABLED in an ACTIVE market — the live, approved copy. Rows are merged
     * across active markets by copy_key so each line carries every language those
     * markets provide. A copy attaches to the slates listed in its `shot` codes;
     * a blank/codeless shot attaches category-wide. Replaces the stale legacy
     * slate_data copy snapshot that previously surfaced retired copy in Generate.
     *
     * @return array{0: array<string, array<string, array>>, 1: array<string, array<string, array>>}
     */
    private function liveCopyMaps(): array
    {
        $bySlate = [];
        $byCategory = [];

        $activeMarketIds = Market::where('active', true)->pluck('id');
        if ($activeMarketIds->isEmpty()) {
            return [$bySlate, $byCategory];
        }

        $copies = Copy::whereIn('market_id', $activeMarketIds)->where('enabled', true)->get();

        foreach ($copies as $copy) {
            $text = $copy->copy_text ?? [];
            $row = [
                'key' => $copy->copy_key,
                'category' => $copy->category,
                'shot' => $copy->shot,
                'brand' => $copy->brand,
                'en' => $text['en'] ?? '',
                'et' => $text['et'] ?? '',
                'fr' => $text['fr'] ?? '',
                'de' => $text['de'] ?? '',
                'es' => $text['es'] ?? '',
            ];

            $codes = preg_split('/[\s,;]+/', (string) $copy->shot) ?: [];
            $matchedSlate = false;
            foreach ($codes as $code) {
                $code = strtoupper(trim($code));
                if (preg_match('/^[A-Z]{2}\d+$/', $code)) {
                    $matchedSlate = true;
                    $bySlate[$code][$copy->copy_key] = $this->mergeCopyRow($bySlate[$code][$copy->copy_key] ?? null, $row);
                }
            }

            if (! $matchedSlate && $copy->category) {
                $byCategory[$copy->category][$copy->copy_key] = $this->mergeCopyRow($byCategory[$copy->category][$copy->copy_key] ?? null, $row);
            }
        }

        return [$bySlate, $byCategory];
    }

    /**
     * Merge two copy rows for the same key, filling empty languages from the
     * incoming row (per-market copy_text only carries that market's languages).
     */
    private function mergeCopyRow(?array $existing, array $incoming): array
    {
        if (! $existing) {
            return $incoming;
        }
        foreach (['en', 'et', 'fr', 'de', 'es'] as $lang) {
            if (($existing[$lang] ?? '') === '' && ($incoming[$lang] ?? '') !== '') {
                $existing[$lang] = $incoming[$lang];
            }
        }

        return $existing;
    }

    /**
     * Copy lines available for a clip: its slate's copy first, then any
     * category-wide copy not already covered by a slate match.
     *
     * @return array<int, array>
     */
    private function copyForClip(Clip $c, array $bySlate, array $byCategory): array
    {
        $copies = isset($bySlate[$c->slate]) ? array_values($bySlate[$c->slate]) : [];

        if ($c->category && isset($byCategory[$c->category])) {
            $seen = $bySlate[$c->slate] ?? [];
            foreach ($byCategory[$c->category] as $key => $row) {
                if (! isset($seen[$key])) {
                    $copies[] = $row;
                }
            }
        }

        return $copies;
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
