<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveredClip;
use App\Models\Market;
use App\Models\Order;
use Illuminate\Http\Request;
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

        return response()->json($clips->map(fn (DeliveredClip $c) => $this->present($c)));
    }

    /**
     * Upload a delivered clip (admin). Streamed move to the private disk under
     * delivered/{market_id}/, then a best-effort ffmpeg poster frame.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'market_id' => 'required|integer|exists:markets,id',
            'name' => 'required|string|max:255',
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

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'mp4');
        $dir = "delivered/{$validated['market_id']}";
        $filename = Str::random(24).'.'.$ext;

        $stored = $file->storeAs($dir, $filename, self::DISK);
        $path = "{$dir}/{$filename}";
        if ($stored === false || ! Storage::disk(self::DISK)->exists($path)) {
            return response()->json(['message' => 'Storage write failed — check permissions on storage/app.'], 500);
        }

        $clip = DeliveredClip::create([
            'market_id' => $validated['market_id'],
            'name' => $validated['name'],
            'file_path' => $path,
            'file_size' => Storage::disk(self::DISK)->size($path),
            'format' => $validated['format'] ?? null,
            'order_id' => $validated['order_id'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        // Best-effort poster frame — never fail the upload if ffmpeg is missing.
        if ($thumb = $this->generateThumbnail($clip)) {
            $clip->update(['thumbnail_path' => $thumb]);
        }

        return response()->json($this->present($clip->fresh('uploadedBy')), 201);
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

    /** @return array<string, mixed> */
    private function present(DeliveredClip $c): array
    {
        return [
            'id' => $c->id,
            'market_id' => $c->market_id,
            'name' => $c->name,
            'format' => $c->format,
            'file_size' => (int) $c->file_size,
            'order_id' => $c->order_id,
            'order_short' => $c->order_id ? substr((string) $c->order_id, 0, 8) : null,
            'has_thumbnail' => (bool) $c->thumbnail_path,
            'thumbnail_url' => $c->thumbnail_path ? "/api/delivered-clips/{$c->id}/thumbnail" : null,
            'download_url' => "/api/delivered-clips/{$c->id}/download",
            'uploaded_by' => optional($c->uploadedBy)->name,
            'created_at' => optional($c->created_at)->toIso8601String(),
        ];
    }
}
