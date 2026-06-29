<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
use App\Models\DeliveredClip;
use App\Models\Market;
use App\Models\Order;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

/**
 * Delivered clips: final rendered creative, market-scoped. Mirrors the design
 * upload pattern, but stores on the NON-public `local` disk and serves through
 * authenticated streaming routes — finished creative must require login.
 */
class DeliveredClipController extends Controller
{
    private const FORMATS = ['16:9', '1:1', '9:16', '4:5'];

    /** The disk the original files in `path` are served from. */
    private const DISK = 'local';

    /**
     * List a market's delivered clips. Growth leads only see clips for markets
     * they can otherwise see (active) — same rule as copy visibility.
     */
    public function index(Request $request)
    {
        $validated = $request->validate(['market_id' => 'required|integer']);

        $market = Market::find($validated['market_id']);
        if (! $market) {
            return response()->json(['message' => 'Market not found.'], 404);
        }
        if (! $this->userCanSee($request, $market)) {
            return response()->json(['message' => 'You do not have access to this market.'], 403);
        }

        $clips = DeliveredClip::with('uploadedBy')
            ->where('market_id', $market->id)
            ->orderByDesc('created_at')
            ->get();

        // Load the market's copies once so each clip's copy slug can be resolved
        // back to its full text without an N+1.
        $copies = Copy::where('market_id', $market->id)->get();

        return response()->json($clips->map(fn (DeliveredClip $c) => $this->present($c, $copies)));
    }

    /**
     * Upload a single delivered clip (admin). Name and format default to the
     * filename and the auto-detected aspect when not supplied.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'market_id' => 'required|integer|exists:markets,id',
            'name' => 'nullable|string|max:255',
            'file' => 'required|file|mimetypes:video/mp4,video/quicktime,video/webm|max:500000',
            'format' => 'nullable|in:'.implode(',', self::FORMATS),
            'order_id' => 'nullable|string|exists:orders,id',
        ], [
            'file.mimetypes' => 'Only MP4, MOV or WEBM video files are allowed.',
            'file.max' => 'The video may not be larger than 500 MB.',
        ]);

        if (! empty($validated['order_id']) && ! $this->orderInMarket($validated['order_id'], $validated['market_id'])) {
            return response()->json(['message' => 'That order does not belong to this market.'], 422);
        }

        try {
            $clip = $this->createFromUpload(
                $request->file('file'),
                (int) $validated['market_id'],
                $validated['order_id'] ?? null,
                $request->user()->id,
                $validated['name'] ?? null,
                $validated['format'] ?? null,
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json($this->present($clip->fresh('uploadedBy')), 201);
    }

    /**
     * Upload a batch of delivered clips (admin). Each file's metadata (brand,
     * lang, copy, slate, actor, design) is parsed from its filename and its
     * format auto-detected from the video — no manual entry. Returns the created
     * clips plus any per-file errors so the UI can report partial failures.
     */
    public function storeBatch(Request $request)
    {
        $validated = $request->validate([
            'market_id' => 'required|integer|exists:markets,id',
            'files' => 'required|array|min:1|max:50',
            'files.*' => 'file|mimetypes:video/mp4,video/quicktime,video/webm|max:500000',
            'order_id' => 'nullable|string|exists:orders,id',
        ], [
            'files.*.mimetypes' => 'Only MP4, MOV or WEBM video files are allowed.',
            'files.*.max' => 'Each video may not be larger than 500 MB.',
        ]);

        if (! empty($validated['order_id']) && ! $this->orderInMarket($validated['order_id'], $validated['market_id'])) {
            return response()->json(['message' => 'That order does not belong to this market.'], 422);
        }

        $created = [];
        $errors = [];
        foreach ($request->file('files') as $file) {
            try {
                $clip = $this->createFromUpload(
                    $file,
                    (int) $validated['market_id'],
                    $validated['order_id'] ?? null,
                    $request->user()->id,
                );
                $created[] = $this->present($clip->fresh('uploadedBy'));
            } catch (\Throwable $e) {
                Log::warning('DeliveredClip batch: a file failed', [
                    'name' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ]);
                $errors[] = ['name' => $file->getClientOriginalName(), 'error' => $e->getMessage()];
            }
        }

        return response()->json(['clips' => $created, 'errors' => $errors], 201);
    }

    /**
     * Store one uploaded video on the private disk, parse its filename for
     * metadata, auto-detect its format, and create the row + poster frame.
     * Shared by store() (single) and storeBatch() (many).
     */
    private function createFromUpload(
        UploadedFile $file,
        int $marketId,
        ?string $orderId,
        ?int $userId,
        ?string $nameOverride = null,
        ?string $formatOverride = null,
    ): DeliveredClip {
        $originalNoExt = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $meta = DeliveredClip::parseFilename($originalNoExt);

        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'mp4');
        $dir = "delivered/{$marketId}";
        $filename = Str::random(24).'.'.$ext;

        $stored = $file->storeAs($dir, $filename, self::DISK);
        $path = "{$dir}/{$filename}";
        if ($stored === false || ! Storage::disk(self::DISK)->exists($path)) {
            throw new \RuntimeException('Storage write failed — check permissions on storage/app.');
        }

        // Format: an explicit choice wins; otherwise measure the video; otherwise
        // fall back to the format token parsed from the filename.
        $format = $formatOverride
            ?: $this->detectFormat(Storage::disk(self::DISK)->path($path), $meta['format']);

        $clip = DeliveredClip::create([
            'market_id' => $marketId,
            'name' => $nameOverride ?: ($originalNoExt ?: 'Clip'),
            'brand' => $meta['brand'],
            'lang' => $meta['lang'],
            'slate' => $meta['slate'],
            'actor' => $meta['actor'],
            'design' => $meta['design'],
            'copy' => $meta['copy'],
            'file_path' => $path,
            'file_size' => Storage::disk(self::DISK)->size($path),
            'format' => $format,
            'order_id' => $orderId ?: null,
            'uploaded_by' => $userId,
        ]);

        // Best-effort poster frame — never fail the upload if ffmpeg is missing.
        if ($thumb = $this->generateThumbnail($clip)) {
            $clip->update(['thumbnail_path' => $thumb]);
        }

        return $clip;
    }

    /** Rename / change format / relink order (admin). */
    public function update(Request $request, DeliveredClip $deliveredClip)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'format' => 'sometimes|nullable|in:'.implode(',', self::FORMATS),
            'order_id' => 'sometimes|nullable|string|exists:orders,id',
        ]);

        if (array_key_exists('order_id', $validated) && ! empty($validated['order_id'])
            && ! $this->orderInMarket($validated['order_id'], $deliveredClip->market_id)) {
            return response()->json(['message' => 'That order does not belong to this market.'], 422);
        }

        $deliveredClip->update($validated);

        return response()->json($this->present($deliveredClip->fresh('uploadedBy')));
    }

    /** Replace/set the poster frame with a manually uploaded image (admin). */
    public function updateThumbnail(Request $request, DeliveredClip $deliveredClip)
    {
        $request->validate(['image' => 'required|image:allow_svg|max:10240']);

        $file = $request->file('image');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        if ($ext === 'jpeg') {
            $ext = 'jpg';
        }
        $dir = "delivered/{$deliveredClip->market_id}";
        $path = $dir.'/'.Str::random(24).'_thumb.'.$ext;

        $file->storeAs($dir, basename($path), self::DISK);

        // Drop the previous thumbnail file we own.
        if ($deliveredClip->thumbnail_path && Storage::disk(self::DISK)->exists($deliveredClip->thumbnail_path)) {
            Storage::disk(self::DISK)->delete($deliveredClip->thumbnail_path);
        }
        $deliveredClip->update(['thumbnail_path' => $path]);

        return response()->json($this->present($deliveredClip->fresh('uploadedBy')));
    }

    /** Delete the row and both files from disk (admin). */
    public function destroy(DeliveredClip $deliveredClip)
    {
        foreach ([$deliveredClip->file_path, $deliveredClip->thumbnail_path] as $p) {
            if ($p && Storage::disk(self::DISK)->exists($p)) {
                Storage::disk(self::DISK)->delete($p);
            }
        }
        $deliveredClip->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Stream the original file as an authenticated download. Any authenticated
     * user may download, subject to market visibility. Streamed, not buffered.
     */
    public function download(Request $request, DeliveredClip $deliveredClip)
    {
        $this->authorizeView($request, $deliveredClip);

        abort_unless(Storage::disk(self::DISK)->exists($deliveredClip->file_path), 404, 'File not found.');

        $ext = pathinfo($deliveredClip->file_path, PATHINFO_EXTENSION);
        $downloadName = $deliveredClip->name.($ext ? '.'.$ext : '');

        // Storage::download returns a streamed response (reads via a file handle).
        return Storage::disk(self::DISK)->download($deliveredClip->file_path, $downloadName);
    }

    /**
     * Stream the clip inline for in-app playback (authenticated, market-scoped).
     * BinaryFileResponse honours Range requests, so <video> can seek without
     * downloading the whole file.
     */
    public function stream(Request $request, DeliveredClip $deliveredClip)
    {
        $this->authorizeView($request, $deliveredClip);

        abort_unless(Storage::disk(self::DISK)->exists($deliveredClip->file_path), 404, 'File not found.');

        $ext = strtolower(pathinfo($deliveredClip->file_path, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            default => 'video/mp4',
        };

        return response()->file(Storage::disk(self::DISK)->path($deliveredClip->file_path), [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Download several clips as a single zip — used to grab a whole "set" (a
     * creative's formats) at once. Authenticated and market-scoped: every clip
     * must belong to a market the user can see. Video is stored uncompressed in
     * the zip (it's already compressed), so this is fast.
     */
    public function downloadSet(Request $request)
    {
        $validated = $request->validate(['ids' => 'required']);

        $ids = is_array($validated['ids']) ? $validated['ids'] : explode(',', (string) $validated['ids']);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        abort_if(! $ids, 422, 'No clips selected.');

        $clips = DeliveredClip::with('market')->whereIn('id', $ids)->get();
        abort_if($clips->isEmpty(), 404, 'No clips found.');

        foreach ($clips as $clip) {
            if (! $clip->market || ! $this->userCanSee($request, $clip->market)) {
                abort(403, 'You do not have access to one of these clips.');
            }
        }

        $tmp = tempnam(sys_get_temp_dir(), 'dset').'.zip';
        $zip = new \ZipArchive();
        if ($zip->open($tmp, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create the archive.');
        }

        $used = [];
        foreach ($clips as $clip) {
            if (! Storage::disk(self::DISK)->exists($clip->file_path)) {
                continue;
            }
            $ext = pathinfo($clip->file_path, PATHINFO_EXTENSION);
            $entry = $clip->name.($ext ? '.'.$ext : '');
            // De-duplicate identical names within the archive.
            $base = $entry;
            $n = 1;
            while (isset($used[$entry])) {
                $entry = pathinfo($base, PATHINFO_FILENAME).'_'.(++$n).($ext ? '.'.$ext : '');
            }
            $used[$entry] = true;

            $zip->addFile(Storage::disk(self::DISK)->path($clip->file_path), $entry);
            $zip->setCompressionName($entry, \ZipArchive::CM_STORE);
        }
        $zip->close();

        return response()->download($tmp, $this->setZipName($clips))->deleteFileAfterSend(true);
    }

    /** Serve the poster frame (authenticated, market-scoped). */
    public function thumbnail(Request $request, DeliveredClip $deliveredClip)
    {
        $this->authorizeView($request, $deliveredClip);

        abort_if(! $deliveredClip->thumbnail_path || ! Storage::disk(self::DISK)->exists($deliveredClip->thumbnail_path), 404, 'No thumbnail.');

        return response()->file(
            Storage::disk(self::DISK)->path($deliveredClip->thumbnail_path),
            ['Cache-Control' => 'private, max-age=3600']
        );
    }

    // ── helpers ─────────────────────────────────────────────────────

    private function userCanSee(Request $request, Market $market): bool
    {
        // Admins see every market; leads only active ones (copy-visibility rule).
        return $request->user()->role === 'admin' || $market->active;
    }

    private function authorizeView(Request $request, DeliveredClip $clip): void
    {
        $clip->loadMissing('market');
        if (! $clip->market || ! $this->userCanSee($request, $clip->market)) {
            abort(403, 'You do not have access to this market\'s delivered clips.');
        }
    }

    private function orderInMarket(string $orderId, int $marketId): bool
    {
        return Order::where('id', $orderId)->where('market_id', $marketId)->exists();
    }

    /**
     * Name a set zip after the message its clips share — brand_lang_copyslug_actor
     * (e.g. Creditstar_FI_Suunnittele_Pt_Hae_Kemal.zip) — falling back to whatever
     * is shared, else the market.
     */
    private function setZipName(Collection $clips): string
    {
        $shared = function (string $attr) use ($clips): ?string {
            $vals = $clips->pluck($attr)->filter()->unique();
            return $vals->count() === 1 ? (string) $vals->first() : null;
        };

        $copy = $shared('copy');
        $copySlug = $copy ? preg_replace('/\s+/', '_', trim($copy)) : null;

        $parts = array_filter([$shared('brand'), $shared('lang'), $copySlug, $shared('actor')]);
        if ($parts) {
            return implode('_', $parts).'.zip';
        }

        $code = optional($clips->first()->market)->code;
        return ($code ? $code.'_delivered' : 'delivered_clips').'.zip';
    }

    /**
     * Detect a clip's format from the actual video dimensions via ffprobe, mapped
     * to the nearest standard aspect. Falls back to the supplied value (parsed
     * from the filename) if ffprobe is unavailable or fails.
     */
    private function detectFormat(string $absPath, ?string $fallback): ?string
    {
        try {
            $process = new Process([
                'ffprobe', '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'csv=p=0:s=x',
                $absPath,
            ]);
            $process->setTimeout(30);
            $process->run();

            if ($process->isSuccessful()) {
                $parts = explode('x', trim($process->getOutput()));
                $w = (int) ($parts[0] ?? 0);
                $h = (int) ($parts[1] ?? 0);
                if ($w > 0 && $h > 0) {
                    return $this->aspectToFormat($w / $h);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('DeliveredClip format probe failed', ['error' => $e->getMessage()]);
        }

        return $fallback;
    }

    /** Map an aspect ratio to the nearest standard format label. */
    private function aspectToFormat(float $ratio): string
    {
        $candidates = ['16:9' => 16 / 9, '1:1' => 1.0, '4:5' => 0.8, '9:16' => 9 / 16];
        $best = '16:9';
        $bestDelta = INF;
        foreach ($candidates as $label => $value) {
            $delta = abs($ratio - $value);
            if ($delta < $bestDelta) {
                $bestDelta = $delta;
                $best = $label;
            }
        }

        return $best;
    }

    /**
     * Best-effort ffmpeg poster frame (~1s in). Returns the stored thumbnail path
     * on success, or null (logged) if ffmpeg is unavailable or fails — the upload
     * must never fail because of this.
     */
    private function generateThumbnail(DeliveredClip $clip): ?string
    {
        $videoAbs = Storage::disk(self::DISK)->path($clip->file_path);
        $thumbRel = "delivered/{$clip->market_id}/".Str::random(24).'_thumb.jpg';
        $thumbAbs = Storage::disk(self::DISK)->path($thumbRel);

        if (! is_dir(dirname($thumbAbs))) {
            @mkdir(dirname($thumbAbs), 0755, true);
        }

        try {
            $process = new Process([
                'ffmpeg', '-y',
                '-ss', '00:00:01',
                '-i', $videoAbs,
                '-frames:v', '1',
                '-vf', 'scale=480:-1',
                '-q:v', '4',
                $thumbAbs,
            ]);
            $process->setTimeout(60);
            $process->run();

            if ($process->isSuccessful() && is_file($thumbAbs) && filesize($thumbAbs) > 0) {
                return $thumbRel;
            }

            Log::warning('DeliveredClip thumbnail: ffmpeg failed', [
                'clip_id' => $clip->id,
                'stderr' => substr($process->getErrorOutput(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::warning('DeliveredClip thumbnail: ffmpeg unavailable', [
                'clip_id' => $clip->id,
                'error' => $e->getMessage(),
            ]);
        }

        if (is_file($thumbAbs)) {
            @unlink($thumbAbs);
        }

        return null;
    }

    /**
     * Resolve a clip's parsed copy slug back to the market copy that produced it,
     * by re-slugifying each copy's text the way the Templater did when naming the
     * file. Returns the full copy text (clip language preferred), the copy_key and
     * the category — so delivered clips can be organised by copy/category like the
     * copy picker. Null when nothing matches (copy edited/removed).
     *
     * @return array{full:string,key:?string,category:?string}|null
     */
    private function resolveCopy(DeliveredClip $c, Collection $copies): ?array
    {
        if (! $c->copy) {
            return null;
        }

        $target = $this->normalizeSlug($c->copy);
        $lang = strtolower((string) $c->lang);

        foreach ($copies as $copy) {
            $texts = is_array($copy->copy_text) ? $copy->copy_text : [];
            foreach ($texts as $text) {
                if ($text && $this->normalizeSlug(DeliveredClip::slugifyCopy($text)) === $target) {
                    return [
                        // The clip's language if the copy carries it, else the one that matched.
                        'full' => ($lang && ! empty($texts[$lang])) ? $texts[$lang] : $text,
                        'key' => $copy->copy_key,
                        'category' => $copy->category,
                    ];
                }
            }
        }

        return null;
    }

    /** Lowercase, treat spaces and underscores alike — for slug comparison. */
    private function normalizeSlug(string $s): string
    {
        return strtolower(str_replace(' ', '_', trim($s)));
    }

    /** @return array<string, mixed> */
    private function present(DeliveredClip $c, ?Collection $copies = null): array
    {
        $copies ??= Copy::where('market_id', $c->market_id)->get();
        $resolved = $this->resolveCopy($c, $copies);

        return [
            'id' => $c->id,
            'market_id' => $c->market_id,
            'name' => $c->name,
            'brand' => $c->brand,
            'lang' => $c->lang,
            'slate' => $c->slate,
            'actor' => $c->actor,
            'design' => $c->design,
            'copy' => $c->copy,
            'copy_full' => $resolved['full'] ?? null,
            'copy_key' => $resolved['key'] ?? null,
            'category' => $resolved['category'] ?? null,
            'format' => $c->format,
            'file_size' => (int) $c->file_size,
            'order_id' => $c->order_id,
            'order_short' => $c->order_id ? substr((string) $c->order_id, 0, 8) : null,
            'has_thumbnail' => (bool) $c->thumbnail_path,
            'thumbnail_url' => $c->thumbnail_path ? "/api/delivered-clips/{$c->id}/thumbnail" : null,
            'stream_url' => "/api/delivered-clips/{$c->id}/stream",
            'download_url' => "/api/delivered-clips/{$c->id}/download",
            'uploaded_by' => optional($c->uploadedBy)->name,
            'created_at' => optional($c->created_at)->toIso8601String(),
        ];
    }
}
