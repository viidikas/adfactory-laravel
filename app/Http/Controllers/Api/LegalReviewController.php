<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Copy;
use App\Models\DeliveredClip;
use App\Models\DeliveredClipReview;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Legal clip-by-clip review. Gated by the `legal` middleware (role = legal only).
 * Each decision (approve / decline) updates the clip and writes an append-only
 * audit row. This is the ONLY surface that changes a clip's review_status from a
 * human decision — admins cannot approve/decline. The download gate
 * (DeliveredClipController@download) is what actually enforces the result.
 */
class LegalReviewController extends Controller
{
    /** Logical walk-through order for formats. */
    private const FORMAT_ORDER = ['16:9', '1:1', '9:16', '4:5'];

    /**
     * The clip-review list, split by status and filtered/sorted/paginated
     * server-side (still ALL markets — legal is a single global reviewer).
     *
     *  status=pending  → pending queue (default). Sort: walk (market→category→
     *                    slate→format→name, default) | oldest | newest.
     *  status=reviewed → approved + declined history, reviewed_at desc; may be
     *                    filtered by outcome=approved|declined.
     *
     * Field filters (market code, format, category, language, brand) + name
     * search combine with AND. Category is derived from the matching market copy.
     */
    public function index(Request $request)
    {
        // Pending | Approved | Declined are the three tabs; 'reviewed'
        // (approved+declined) is kept for back-compat.
        $valid = ['pending', 'approved', 'declined', 'reviewed'];
        $status = in_array($request->query('status'), $valid, true) ? $request->query('status') : 'pending';

        // Whole status set (the only DB-level filter); everything else is applied
        // in PHP so the derived `category` participates uniformly.
        $set = DeliveredClip::with(['market', 'uploadedBy', 'reviewer'])
            ->when($status === 'reviewed',
                fn ($q) => $q->whereIn('review_status', [DeliveredClip::STATUS_APPROVED, DeliveredClip::STATUS_DECLINED]),
                fn ($q) => $q->where('review_status', $status))
            ->get();

        // Resolve the derived copy meta (category + full text) once, N+1-free.
        $copiesByMarket = Copy::whereIn('market_id', $set->pluck('market_id')->unique()->all())
            ->get()->groupBy('market_id');
        $set->each(function (DeliveredClip $c) use ($copiesByMarket) {
            $meta = $this->resolveCopy($c, $copiesByMarket->get($c->market_id) ?? collect());
            $c->setAttribute('_category', $meta['category']);
            $c->setAttribute('_copy_full', $meta['full']);
        });

        // Filter option lists — from the full status set, so dropdowns are stable
        // regardless of which other filters are active.
        $options = [
            'markets' => $set->map(fn ($c) => optional($c->market)->code)->filter()->unique()->sort()->values(),
            'formats' => $set->pluck('format')->filter()->unique()
                ->sortBy(fn ($f) => $this->formatRank($f))->values(),
            'categories' => $set->pluck('_category')->filter()->unique()->sort()->values(),
            'languages' => $set->pluck('lang')->filter()->unique()->sort()->values(),
            'brands' => $set->pluck('brand')->filter()->unique()->sort()->values(),
            'creatives' => $set->pluck('creative_key')->filter()->unique()->sort()->values(),
            // Upload batches with a readable label (count + date) for the dropdown.
            'batches' => $set->filter(fn ($c) => $c->upload_batch_id)
                ->groupBy('upload_batch_id')
                ->map(fn ($g, $id) => [
                    'id' => $id,
                    'label' => $g->count().' clip'.($g->count() === 1 ? '' : 's').' · '.optional($g->first()->created_at)->format('M j, Y'),
                ])->values(),
        ];

        // Field filters (AND).
        $rows = $set;
        if ($v = $request->query('market')) {
            $rows = $rows->filter(fn ($c) => optional($c->market)->code === $v);
        }
        if ($v = $request->query('format')) {
            $rows = $rows->filter(fn ($c) => $c->format === $v);
        }
        if ($v = $request->query('category')) {
            $rows = $rows->filter(fn ($c) => $c->getAttribute('_category') === $v);
        }
        if ($v = $request->query('language')) {
            $rows = $rows->filter(fn ($c) => $c->lang === $v);
        }
        if ($v = $request->query('brand')) {
            $rows = $rows->filter(fn ($c) => $c->brand === $v);
        }
        if ($v = $request->query('creative')) {
            $rows = $rows->filter(fn ($c) => $c->creative_key === $v);
        }
        if ($v = $request->query('batch')) {
            $rows = $rows->filter(fn ($c) => $c->upload_batch_id === $v);
        }
        if (($v = trim((string) $request->query('search'))) !== '') {
            $needle = mb_strtolower($v);
            $rows = $rows->filter(fn ($c) => str_contains(mb_strtolower((string) $c->name), $needle));
        }
        if ($status === 'reviewed'
            && in_array($request->query('outcome'), [DeliveredClip::STATUS_APPROVED, DeliveredClip::STATUS_DECLINED], true)) {
            $rows = $rows->filter(fn ($c) => $c->review_status === $request->query('outcome'));
        }

        // Sort. Group-by-creative keeps all formats of a creative contiguous
        // (so the frontend can render creative headers, page-stable). Otherwise:
        // pending → walk / oldest / newest; approved & declined → reviewed_at desc.
        if ($request->boolean('group')) {
            $rows = $rows->sortBy(fn ($c) => $this->creativeSortKey($c));
        } elseif ($status === 'pending') {
            $sort = $request->query('sort', 'walk');
            $rows = match ($sort) {
                'oldest' => $rows->sortBy(fn ($c) => optional($c->created_at)->timestamp ?? 0),
                'newest' => $rows->sortByDesc(fn ($c) => optional($c->created_at)->timestamp ?? 0),
                default => $rows->sortBy(fn ($c) => $this->walkKey($c)),
            };
        } else {
            $rows = $rows->sortByDesc(fn ($c) => optional($c->reviewed_at)->timestamp ?? 0);
        }
        $rows = $rows->values();

        // Paginate.
        $perPage = min(max((int) $request->query('per_page', 60), 1), 200);
        $page = max((int) $request->query('page', 1), 1);
        $total = $rows->count();
        $data = $rows->forPage($page, $perPage)->values()->map(fn (DeliveredClip $c) => $this->present($c));

        $counts = [
            'pending' => DeliveredClip::where('review_status', DeliveredClip::STATUS_PENDING)->count(),
            'approved' => DeliveredClip::where('review_status', DeliveredClip::STATUS_APPROVED)->count(),
            'declined' => DeliveredClip::where('review_status', DeliveredClip::STATUS_DECLINED)->count(),
        ];

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => max(1, (int) ceil($total / $perPage)),
            'pending_count' => $counts['pending'],
            'counts' => $counts,
            'filters' => $options,
        ]);
    }

    /** Count of clips awaiting review — drives the nav badge + header count. */
    public function pendingCount()
    {
        return response()->json(['count' => $this->pendingTotal()]);
    }

    private function pendingTotal(): int
    {
        return DeliveredClip::where('review_status', DeliveredClip::STATUS_PENDING)->count();
    }

    /** Sort key that keeps a creative's formats together: creative → format → name. */
    private function creativeSortKey(DeliveredClip $c): string
    {
        return implode('|', [
            mb_strtolower((string) $c->creative_key),
            $this->formatRank($c->format),
            mb_strtolower((string) $c->name),
        ]);
    }

    /** Composite sort key: market → category → slate → format → name. */
    private function walkKey(DeliveredClip $c): string
    {
        return implode('|', [
            mb_strtolower((string) optional($c->market)->code),
            mb_strtolower((string) $c->getAttribute('_category')),
            mb_strtolower((string) $c->slate),
            $this->formatRank($c->format),
            mb_strtolower((string) $c->name),
        ]);
    }

    private function formatRank(?string $format): int
    {
        $i = array_search($format, self::FORMAT_ORDER, true);

        return $i === false ? 9 : $i;
    }

    /**
     * Derive a clip's matching market copy (full text + category) by re-slugifying
     * each copy's text the way the Templater named the file — same match used for
     * the portal/admin copy resolution. Display-only; does not affect any gate.
     *
     * @return array{full:?string,category:?string}
     */
    private function resolveCopy(DeliveredClip $c, Collection $copies): array
    {
        if (! $c->copy) {
            return ['full' => null, 'category' => null];
        }

        $target = $this->normalizeSlug($c->copy);
        $lang = strtolower((string) $c->lang);

        foreach ($copies as $copy) {
            $texts = is_array($copy->copy_text) ? $copy->copy_text : [];
            foreach ($texts as $text) {
                if ($text && $this->normalizeSlug(DeliveredClip::slugifyCopy($text)) === $target) {
                    return [
                        'full' => ($lang && ! empty($texts[$lang])) ? $texts[$lang] : $text,
                        'category' => $copy->category,
                    ];
                }
            }
        }

        return ['full' => null, 'category' => null];
    }

    private function normalizeSlug(string $s): string
    {
        return strtolower(str_replace(' ', '_', trim($s)));
    }

    /** Approve a clip — one decision per clip. Writes an approved audit row. */
    public function approve(Request $request, DeliveredClip $deliveredClip)
    {
        $deliveredClip->update([
            'review_status' => DeliveredClip::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => Carbon::now(),
            'decline_reason' => null,
        ]);

        $this->audit($deliveredClip, $request->user()->id, DeliveredClipReview::ACTION_APPROVED);

        return response()->json($this->present($deliveredClip->fresh(['market', 'uploadedBy', 'reviewer'])));
    }

    /** Decline a clip — requires a non-empty reason. Writes a declined audit row. */
    public function decline(Request $request, DeliveredClip $deliveredClip)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ], [
            'reason.required' => 'A reason is required to decline a clip.',
        ]);

        $deliveredClip->update([
            'review_status' => DeliveredClip::STATUS_DECLINED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => Carbon::now(),
            'decline_reason' => trim($validated['reason']),
        ]);

        $this->audit($deliveredClip, $request->user()->id, DeliveredClipReview::ACTION_DECLINED, trim($validated['reason']));

        return response()->json($this->present($deliveredClip->fresh(['market', 'uploadedBy', 'reviewer'])));
    }

    private function audit(DeliveredClip $clip, int $userId, string $action, ?string $reason = null): void
    {
        DeliveredClipReview::create([
            'delivered_clip_id' => $clip->id,
            'user_id' => $userId,
            'action' => $action,
            'reason' => $reason,
        ]);
    }

    /** @return array<string, mixed> */
    private function present(DeliveredClip $c): array
    {
        // Use the pre-resolved copy meta from index(); resolve on the fly for the
        // single-clip approve/decline responses (no _category set there).
        $attrs = $c->getAttributes();
        if (array_key_exists('_category', $attrs)) {
            $category = $attrs['_category'];
            $copyFull = $attrs['_copy_full'] ?? null;
        } else {
            $meta = $this->resolveCopy($c, Copy::where('market_id', $c->market_id)->get());
            $category = $meta['category'];
            $copyFull = $meta['full'];
        }

        return [
            'id' => $c->id,
            'name' => $c->name,
            'format' => $c->format,
            'slate' => $c->slate,
            'actor' => $c->actor,
            'design' => $c->design,
            'lang' => $c->lang,
            'brand' => $c->brand,
            'category' => $category,
            'copy' => $c->copy,
            'copy_full' => $copyFull,
            'ad_title' => $c->ad_title,
            'ad_description' => $c->ad_description,
            'upload_batch_id' => $c->upload_batch_id,
            'creative_key' => $c->creative_key,
            'file_size' => (int) $c->file_size,
            'order_short' => $c->order_id ? substr((string) $c->order_id, 0, 8) : null,
            'market' => $c->market ? [
                'id' => $c->market->id,
                'code' => $c->market->code,
                'name' => $c->market->name,
                'brand' => $c->market->brand,
            ] : null,
            'thumbnail_url' => $c->thumbnail_path ? "/api/delivered-clips/{$c->id}/thumbnail" : null,
            'stream_url' => "/api/delivered-clips/{$c->id}/stream",
            'uploaded_by' => optional($c->uploadedBy)->name,
            'created_at' => optional($c->created_at)->toIso8601String(),
            'review_status' => $c->review_status,
            'reviewer' => optional($c->reviewer)->name,
            'reviewed_at' => optional($c->reviewed_at)->toIso8601String(),
            'decline_reason' => $c->decline_reason,
        ];
    }
}
