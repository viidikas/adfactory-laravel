<?php

use App\Http\Controllers\Auth\LoginController;
use App\Support\DesignPreviewData;
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

// Protected routes
Route::middleware('auth')->group(function () {
    // The AD.FACTORY operator panel is restricted to super admins (the markets /
    // per-copy admin lives here). Everyone else is sent to the Growth Portal.
    Route::get('/', function () {
        return Inertia::render('AdFactory');
    })->middleware('superadmin');

    Route::get('/portal', function () {
        return Inertia::render('GrowthPortal');
    });
});

// ── AD.FACTORY design preview (WIP) ─────────────────────────────────────────
// The new design rendered with representative data (App\Support\DesignPreviewData,
// mirrors the handoff's data.js); not yet wired to real models. Gated to super
// admins — a private preview on the production domain, NOT public.
// Chrome: ?ws=portal switches workspace; ?theme=light + ?density=compact|comfy
// override appearance (then persisted client-side as you navigate).
Route::middleware('superadmin')->prefix('design')->group(function () {
    $chrome = fn (Request $r) => [
        'workspace' => $r->query('ws') === 'portal' ? 'portal' : 'admin',
        'theme' => in_array($r->query('theme'), ['light', 'dark'], true) ? $r->query('theme') : null,
        'density' => in_array($r->query('density'), ['compact', 'comfy', 'regular'], true) ? $r->query('density') : null,
        'user' => [
            'name' => optional($r->user())->name ?: 'Mark Viidik',
            'email' => optional($r->user())->email ?: 'mark@creditstar.com',
        ],
    ];

    Route::get('/', fn (Request $r) => Inertia::render('Dashboard', $chrome($r) + [
        'stats' => DesignPreviewData::stats(),
        'orders' => DesignPreviewData::orders(),
        'activity' => DesignPreviewData::activity(),
        'markets' => DesignPreviewData::markets(),
    ]))->name('design.dashboard');

    Route::get('/clips', fn (Request $r) => Inertia::render('Clips/Index', $chrome($r) + [
        'clips' => DesignPreviewData::clips(),
        'markets' => DesignPreviewData::markets(),
        'categories' => DesignPreviewData::categories(),
    ]));

    Route::get('/copy', fn (Request $r) => Inertia::render('Copy/Index', $chrome($r) + [
        'rows' => DesignPreviewData::copyRows(),
        'langs' => DesignPreviewData::langs(),
    ]));

    Route::get('/orders', fn (Request $r) => Inertia::render('Orders/Index', $chrome($r) + [
        'orders' => DesignPreviewData::orders(),
        'markets' => DesignPreviewData::markets(),
        'designs' => DesignPreviewData::designs(),
        'clips' => DesignPreviewData::clips(),
        'statuses' => DesignPreviewData::statuses(),
        'langs' => DesignPreviewData::langs(),
        'openId' => $r->query('open'),
        'justSubmitted' => (bool) $r->query('submitted'),
    ]));

    Route::get('/orders/create', fn (Request $r) => Inertia::render('Orders/Create', $chrome($r) + [
        'clips' => DesignPreviewData::clips(),
        'designs' => DesignPreviewData::designs(),
        'markets' => DesignPreviewData::markets(),
        'brands' => DesignPreviewData::brands(),
        'langs' => DesignPreviewData::langs(),
    ]));

    Route::get('/login', fn (Request $r) => Inertia::render('Auth/DesignLogin', $chrome($r) + [
        'clips' => DesignPreviewData::clips(),
    ]));
});

// API routes — under /api prefix, using web middleware (sessions)
Route::prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
