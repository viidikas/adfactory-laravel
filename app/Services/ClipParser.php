<?php

namespace App\Services;

class ClipParser
{
    const VIDEO_EXTS = ['mov', 'mp4', 'm4v', 'avi', 'mxf', 'mkv', 'webm'];

    const CAT_SLUG_MAP = [
        'Product Usage' => 'PU',
        'Product_Usage' => 'PU',
        'Travel and Holiday' => 'TH',
        'Travel_and_Holiday' => 'TH',
        'Home Renovation' => 'HR',
        'Home_Renovation' => 'HR',
        'Lifestyle and Events' => 'LE',
        'Lifestyle_and_Events' => 'LE',
        'Electronics and Devices' => 'EG',
        'Electronics_and_Devices' => 'EG',
        'Financial Relief' => 'FR',
        'Financial_Relief' => 'FR',
    ];

    /**
     * Parse a clip filename and relative path into structured metadata.
     * Port of buildClipEntry() from adfactory-js/clips.js
     */
    public static function parse(string $filename, string $relativePath): array
    {
        $nameNoExt = preg_replace('/\.[^.]+$/', '', $filename);
        $parts = explode('_', $nameNoExt);

        // Strip empty trailing parts (from trailing underscores like "Actor_.mov")
        while (count($parts) > 1 && $parts[count($parts) - 1] === '') {
            array_pop($parts);
        }

        $category = '';
        $slateNum = '';
        $actor = '';
        $version = '';

        if (count($parts) >= 3) {
            $lastPart = end($parts);
            // Detect version: pure digit ("2") or v+digit ("v2")
            $hasVersionSuffix = ctype_digit($lastPart) || preg_match('/^v\d+$/i', $lastPart);

            if ($hasVersionSuffix && count($parts) >= 4) {
                // Strip version, then walk back from end to find slate number
                $version = preg_replace('/^v/i', '', $lastPart);
                $actorParts = [];
                $i = count($parts) - 2; // start before version
                while ($i > 0 && ! ctype_digit($parts[$i])) {
                    array_unshift($actorParts, $parts[$i]);
                    $i--;
                }
                $slateNum = $parts[$i];
                $actor = implode(' ', $actorParts);
                $category = implode(' ', array_slice($parts, 0, $i));
            } else {
                // No version: walk back from end to find the slate number
                $actorParts = [$parts[count($parts) - 1]];
                $i = count($parts) - 2;
                while ($i > 0 && ! ctype_digit($parts[$i])) {
                    array_unshift($actorParts, $parts[$i]);
                    $i--;
                }
                if (ctype_digit($parts[$i])) {
                    $slateNum = $parts[$i];
                    $actor = implode(' ', $actorParts);
                    $category = implode(' ', array_slice($parts, 0, $i));
                } else {
                    // Fallback: no slate number found
                    $actor = $parts[count($parts) - 1];
                    $category = implode(' ', array_slice($parts, 0, count($parts) - 1));
                }
            }
        } elseif (count($parts) === 2) {
            $slateNum = $parts[0];
            $actor = $parts[1];
        } else {
            $actor = $nameNoExt;
        }

        // Try matching category from subfolder name (more reliable)
        $folderParts = explode('/', $relativePath);
        if (count($folderParts) > 1) {
            $subfolderName = $folderParts[count($folderParts) - 2];
            if (isset(self::CAT_SLUG_MAP[$subfolderName])) {
                $category = str_replace('_', ' ', $subfolderName);
            }
        }

        // Compute category slug and slate code
        $catSlug = self::CAT_SLUG_MAP[$category]
            ?? self::CAT_SLUG_MAP[str_replace(' ', '_', $category)]
            ?? strtoupper(substr(preg_replace('/\s+/', '', $category), 0, 2));

        $slate = $slateNum ? $catSlug . $slateNum : '';

        return [
            'id' => $nameNoExt,
            'name' => $filename,
            'name_no_ext' => $nameNoExt,
            'relative_path' => $relativePath,
            'category' => $category,
            'slate' => $slate,
            'slate_num' => $slateNum,
            'actor' => $actor,
            'version' => $version,
        ];
    }

    /**
     * Check if a filename has a video extension.
     */
    public static function isVideo(string $filename): bool
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($ext, self::VIDEO_EXTS);
    }
}
