<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Process\Process;

class VideoController extends Controller
{
    public function stream(Request $request)
    {
        $basePath = config('app.footage_path', '/mnt/footage');
        $relativePath = $request->query('path', '');

        return $this->streamFile($basePath, $relativePath);
    }

    public function thumb(Request $request)
    {
        $basePath = config('app.footage_path', '/mnt/footage');
        $relativePath = $request->query('path', '');

        if (! $relativePath) {
            abort(400, 'Missing path parameter');
        }

        // Validate path does not escape base
        $fullPath = realpath($basePath.'/'.ltrim($relativePath, '/'));
        if (! $fullPath || ! str_starts_with($fullPath, realpath($basePath))) {
            abort(403, 'Path traversal detected');
        }

        if (! file_exists($fullPath)) {
            abort(404, 'Video file not found');
        }

        // Check cache
        $cacheDir = storage_path('app/thumbs');
        if (! is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }

        $hash = md5($relativePath);
        $thumbPath = $cacheDir.'/'.$hash.'.jpg';

        if (! file_exists($thumbPath)) {
            // Generate thumbnail using ffmpeg
            $process = new Process([
                'ffmpeg',
                '-i', $fullPath,
                '-ss', '00:00:01',
                '-vframes', '1',
                '-vf', 'scale=320:-1',
                '-q:v', '4',
                '-y',
                $thumbPath,
            ]);

            $process->setTimeout(30);

            try {
                $process->run();
            } catch (\Exception $e) {
                abort(500, 'Thumbnail generation failed: '.$e->getMessage());
            }

            if (! $process->isSuccessful() || ! file_exists($thumbPath)) {
                abort(500, 'Thumbnail generation failed');
            }
        }

        return response()->file($thumbPath, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }

    public function rendered(Request $request)
    {
        $basePath = config('app.rendered_path', '/mnt/exports');
        $relativePath = $request->query('path', '');

        return $this->streamFile($basePath, $relativePath);
    }

    private function streamFile(string $basePath, string $relativePath)
    {
        if (! $relativePath) {
            abort(400, 'Missing path parameter');
        }

        // Validate path does not escape base
        $fullPath = realpath($basePath.'/'.ltrim($relativePath, '/'));
        if (! $fullPath || ! str_starts_with($fullPath, realpath($basePath))) {
            abort(403, 'Path traversal detected');
        }

        if (! file_exists($fullPath)) {
            abort(404, 'File not found');
        }

        $fileSize = filesize($fullPath);
        $mimeType = $this->getMimeType($fullPath);

        $rangeHeader = request()->header('Range');

        if ($rangeHeader) {
            return $this->streamRange($fullPath, $fileSize, $mimeType, $rangeHeader);
        }

        return new StreamedResponse(function () use ($fullPath) {
            $stream = fopen($fullPath, 'rb');
            while (! feof($stream)) {
                echo fread($stream, 8192);
                flush();
            }
            fclose($stream);
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Length' => $fileSize,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function streamRange(string $fullPath, int $fileSize, string $mimeType, string $rangeHeader): StreamedResponse
    {
        preg_match('/bytes=(\d*)-(\d*)/', $rangeHeader, $matches);

        $start = $matches[1] !== '' ? (int) $matches[1] : 0;
        $end = $matches[2] !== '' ? (int) $matches[2] : $fileSize - 1;

        if ($start > $end || $start >= $fileSize) {
            abort(416, 'Range not satisfiable');
        }

        $end = min($end, $fileSize - 1);
        $length = $end - $start + 1;

        return new StreamedResponse(function () use ($fullPath, $start, $length) {
            $stream = fopen($fullPath, 'rb');
            fseek($stream, $start);
            $remaining = $length;
            while ($remaining > 0 && ! feof($stream)) {
                $chunkSize = min(8192, $remaining);
                echo fread($stream, $chunkSize);
                $remaining -= $chunkSize;
                flush();
            }
            fclose($stream);
        }, 206, [
            'Content-Type' => $mimeType,
            'Content-Length' => $length,
            'Content-Range' => "bytes {$start}-{$end}/{$fileSize}",
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'mp4', 'm4v' => 'video/mp4',
            'mov' => 'video/quicktime',
            'avi' => 'video/x-msvideo',
            'mkv' => 'video/x-matroska',
            'webm' => 'video/webm',
            'mxf' => 'application/mxf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => 'application/octet-stream',
        };
    }
}
