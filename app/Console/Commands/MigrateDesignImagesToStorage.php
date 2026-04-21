<?php

namespace App\Console\Commands;

use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MigrateDesignImagesToStorage extends Command
{
    protected $signature = 'designs:migrate-images {--dry-run : Show what would change without writing}';
    protected $description = 'Convert base64 data-URL images in projects.designs to files under storage/app/public/designs/';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $projects = Project::whereNotNull('designs')->get();
        $totalConverted = 0;
        $totalBytesBefore = 0;
        $totalBytesAfter = 0;

        foreach ($projects as $project) {
            $designs = $project->designs ?? [];
            if (!is_array($designs) || !count($designs)) {
                continue;
            }

            $before = strlen(json_encode($designs));
            $totalBytesBefore += $before;
            $changed = false;

            foreach ($designs as $i => $design) {
                if (!isset($design['images']) || !is_array($design['images'])) {
                    continue;
                }
                foreach ($design['images'] as $ratio => $value) {
                    if (!is_string($value) || !str_starts_with($value, 'data:')) {
                        continue;
                    }
                    if (!preg_match('/^data:image\/([A-Za-z0-9+.-]+);base64,(.+)$/', $value, $m)) {
                        $this->warn("Project {$project->id} design {$design['key']}[$ratio]: unrecognized data URL, skipped");
                        continue;
                    }
                    $ext = strtolower($m[1]);
                    if ($ext === 'jpeg') {
                        $ext = 'jpg';
                    }
                    if (!in_array($ext, ['png', 'jpg', 'gif', 'webp', 'svg'], true)) {
                        $ext = 'png';
                    }
                    $binary = base64_decode($m[2], true);
                    if ($binary === false) {
                        $this->warn("Project {$project->id} design {$design['key']}[$ratio]: base64 decode failed, skipped");
                        continue;
                    }
                    $filename = Str::random(16) . '.' . $ext;
                    $path = "designs/{$project->id}/{$filename}";

                    if (!$dry) {
                        Storage::disk('public')->put($path, $binary);
                    }

                    $designs[$i]['images'][$ratio] = '/storage/' . $path;
                    $changed = true;
                    $totalConverted++;
                    $this->info("  Project {$project->id} · {$design['key']} [{$ratio}] → /storage/{$path} (" . number_format(strlen($binary)) . " bytes)");
                }
            }

            if ($changed && !$dry) {
                $project->update(['designs' => $designs]);
            }
            $after = strlen(json_encode($designs));
            $totalBytesAfter += $after;
            $this->line("Project {$project->id} ({$project->name}): JSON " . number_format($before) . " → " . number_format($after) . " bytes");
        }

        $this->newLine();
        $this->info("Converted {$totalConverted} image(s).");
        $this->info('JSON column total: ' . number_format($totalBytesBefore) . ' → ' . number_format($totalBytesAfter) . ' bytes');
        if ($dry) {
            $this->warn('Dry run — no files written, no DB rows updated.');
        }
        return self::SUCCESS;
    }
}
