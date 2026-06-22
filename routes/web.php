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

// ── AD.FACTORY admin (super-admin only) ─────────────────────────────────────
Route::middleware('superadmin')->group(function () use ($chrome) {
    Route::get('/', fn (Request $r) => Inertia::render('Admin/Dashboard', $chrome($r, 'admin')))->name('home');
    Route::get('/orders', fn (Request $r) => Inertia::render('Admin/Orders', $chrome($r, 'admin') + [
        'openId' => $r->query('open'),
    ]))->name('admin.orders');

    Route::get('/markets', fn (Request $r) => Inertia::render('Admin/Markets', $chrome($r, 'admin')))->name('admin.markets');
    Route::get('/markets/{code}', fn (Request $r, $code) => Inertia::render('Admin/MarketCopies', $chrome($r, 'admin') + ['code' => $code]));
    // Delivered clips — market list → per-market clips page (mirrors markets).
    Route::get('/delivered', fn (Request $r) => Inertia::render('Admin/DeliveredClips', $chrome($r, 'admin')))->name('admin.delivered');
    Route::get('/delivered/{code}', fn (Request $r, $code) => Inertia::render('Admin/DeliveredClipsMarket', $chrome($r, 'admin') + ['code' => $code]));
    Route::get('/projects', fn (Request $r) => Inertia::render('Admin/Projects', $chrome($r, 'admin')))->name('admin.projects');
    Route::get('/clips', fn (Request $r) => Inertia::render('Admin/Clips', $chrome($r, 'admin')))->name('admin.clips');
    Route::get('/generate', fn (Request $r) => Inertia::render('Admin/Generate', $chrome($r, 'admin')))->name('admin.generate');
    Route::get('/preview', fn (Request $r) => Inertia::render('Admin/Preview', $chrome($r, 'admin')))->name('admin.preview');
    Route::get('/settings', fn (Request $r) => Inertia::render('Admin/Settings', $chrome($r, 'admin')))->name('admin.settings');

    // Legacy operator panel — kept reachable so the heavy tooling stays at full
    // parity until each screen is rebuilt in the new design.
    Route::get('/legacy', fn () => Inertia::render('AdFactory'))->name('legacy.admin');
});

// ── Growth Portal (any authenticated user) ──────────────────────────────────
Route::middleware('auth')->group(function () use ($chrome) {
    Route::get('/portal', fn (Request $r) => Inertia::render('Portal/CopyBrowse', $chrome($r, 'portal')))->name('portal');
    Route::get('/portal/clips', fn (Request $r) => Inertia::render('Portal/Clips', $chrome($r, 'portal')));
    Route::get('/portal/designs', fn (Request $r) => Inertia::render('Portal/Designs', $chrome($r, 'portal')));
    Route::get('/portal/delivered', fn (Request $r) => Inertia::render('Portal/Delivered', $chrome($r, 'portal')));
    Route::get('/portal/orders', fn (Request $r) => Inertia::render('Portal/Orders', $chrome($r, 'portal') + [
        'justSubmitted' => (bool) $r->query('submitted'),
    ]));

    // Legacy Growth Portal — kept reachable during cutover.
    Route::get('/portal/legacy', fn () => Inertia::render('GrowthPortal'))->name('legacy.portal');
});

// API routes — under /api prefix, using web middleware (sessions)
Route::prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
