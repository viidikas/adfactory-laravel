<?php

use App\Http\Controllers\Auth\LoginController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Auth routes (no middleware)
Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
// Throttle code generation and verification to slow down enumeration,
// mail-bombing, and OTP brute-forcing.
Route::post('/login/select', [LoginController::class, 'selectUser'])->middleware('throttle:5,1');
Route::get('/login/verify', [LoginController::class, 'showVerify']);
Route::post('/login/verify', [LoginController::class, 'verify'])->middleware('throttle:10,1');
Route::get('/login/resend', [LoginController::class, 'resend'])->middleware('throttle:5,1');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

// Optional first-load appearance overrides (?theme / ?density); thereafter the
// choice is persisted client-side. Workspace drives nav + labels.
$chrome = fn (Request $r, string $workspace) => [
    'workspace' => $workspace,
    'theme' => in_array($r->query('theme'), ['light', 'dark'], true) ? $r->query('theme') : null,
    'density' => in_array($r->query('density'), ['compact', 'comfy', 'regular'], true) ? $r->query('density') : null,
];

// A single placeholder page covers screens not yet rebuilt in the new design.
// Each links to the still-functional classic UI, so no capability is lost during
// the cutover (see the "Open classic UI" affordance + the legacy routes below).
$soon = fn (Request $r, string $ws, string $active, string $title, string $blurb, string $legacy) =>
    Inertia::render('Placeholder', $chrome($r, $ws) + compact('active', 'title', 'blurb', 'legacy'));

// ── AD.FACTORY admin (super-admin only) ─────────────────────────────────────
Route::middleware('superadmin')->group(function () use ($chrome, $soon) {
    Route::get('/', fn (Request $r) => Inertia::render('Admin/Dashboard', $chrome($r, 'admin')))->name('home');
    Route::get('/orders', fn (Request $r) => Inertia::render('Admin/Orders', $chrome($r, 'admin') + [
        'openId' => $r->query('open'),
    ]))->name('admin.orders');

    Route::get('/markets', fn (Request $r) => Inertia::render('Admin/Markets', $chrome($r, 'admin')))->name('admin.markets');
    Route::get('/markets/{code}', fn (Request $r, $code) => Inertia::render('Admin/MarketCopies', $chrome($r, 'admin') + ['code' => $code]));
    Route::get('/projects', fn (Request $r) => $soon($r, 'admin', 'projects', 'Projects',
        'Footage project management (create · scan · activate) is being rebuilt here.', '/legacy#projects'))->name('admin.projects');
    Route::get('/clips', fn (Request $r) => $soon($r, 'admin', 'clips', 'Clip library',
        'Clip browsing, copy-key assignment and the video player are being rebuilt here.', '/legacy#clips'))->name('admin.clips');
    Route::get('/generate', fn (Request $r) => $soon($r, 'admin', 'generate', 'Generate',
        'The Templater CSV generator (filter rules) is being rebuilt here.', '/legacy#generate'))->name('admin.generate');
    Route::get('/preview', fn (Request $r) => $soon($r, 'admin', 'preview', 'Preview & export',
        'The output preview and CSV / Google-Sheets export are being rebuilt here.', '/legacy#preview'))->name('admin.preview');
    Route::get('/settings', fn (Request $r) => $soon($r, 'admin', 'settings', 'Settings',
        'Users, output/filename builders, AE comp-name mapping and project designs are being rebuilt here.', '/legacy#settings'))->name('admin.settings');

    // Legacy operator panel — kept reachable so the heavy tooling stays at full
    // parity until each screen is rebuilt in the new design.
    Route::get('/legacy', fn () => Inertia::render('AdFactory'))->name('legacy.admin');
});

// ── Growth Portal (any authenticated user) ──────────────────────────────────
Route::middleware('auth')->group(function () use ($soon) {
    Route::get('/portal', fn (Request $r) => $soon($r, 'portal', 'copy-browse', 'Browse by copy',
        'The copy-first ordering flow is being rebuilt here.', '/portal/legacy'))->name('portal');
    Route::get('/portal/clips', fn (Request $r) => $soon($r, 'portal', 'clips', 'Browse clips',
        'The clip-first ordering flow is being rebuilt here.', '/portal/legacy'));
    Route::get('/portal/designs', fn (Request $r) => $soon($r, 'portal', 'designs', 'Designs',
        'The design gallery is being rebuilt here.', '/portal/legacy'));
    Route::get('/portal/orders', fn (Request $r) => $soon($r, 'portal', 'orders', 'My orders',
        'Your order history and rendered-clip downloads are being rebuilt here.', '/portal/legacy'));

    // Legacy Growth Portal — kept reachable during cutover.
    Route::get('/portal/legacy', fn () => Inertia::render('GrowthPortal'))->name('legacy.portal');
});

// API routes — under /api prefix, using web middleware (sessions)
Route::prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
