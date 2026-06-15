<?php

use App\Http\Controllers\Auth\LoginController;
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

// ── AD.FACTORY design preview (WIP — phase 1) ───────────────────────────────
// Renders the new design with representative data (mirrors the handoff's
// data.js); not yet wired to real models. Gated to super admins (same gate as
// the operator panel) — a private preview on the production domain, NOT public.
// Toggle with ?ws=portal, ?theme=light, ?density=compact|comfy.
Route::get('/design/clips', function (\Illuminate\Http\Request $request) {
    $thumbs = ['#2e6b57', '#365b7a', '#7a5a36', '#6b3550', '#41506b', '#5a6b35', '#356b6b', '#6b4135', '#4b3a6b', '#2e5b6b', '#6b6235', '#553a2e'];
    $markets = [
        ['code' => 'EE', 'flag' => '🇪🇪', 'name' => 'Estonia'],
        ['code' => 'ES', 'flag' => '🇪🇸', 'name' => 'Spain'],
        ['code' => 'DE', 'flag' => '🇩🇪', 'name' => 'Germany'],
        ['code' => 'FR', 'flag' => '🇫🇷', 'name' => 'France'],
        ['code' => 'FI', 'flag' => '🇫🇮', 'name' => 'Finland'],
    ];
    $categories = ['Hook', 'Lifestyle', 'Product', 'Testimonial', 'CTA', 'B-roll'];
    $defs = [
        ['Sunrise commute — phone unlock', 'Hook', 8, '9:16', ['urban', 'morning', 'hands']],
        ['Coffee + savings app glance', 'Lifestyle', 12, '9:16', ['kitchen', 'warm', 'app']],
        ['Vault balance count-up', 'Product', 6, '9:16', ['screen-rec', 'mint', 'numbers']],
        ['Couple reviewing budget', 'Lifestyle', 15, '1:1', ['home', 'couple', 'calm']],
        ['9.96% APY reveal', 'Hook', 5, '9:16', ['type', 'mint', 'bold']],
        ['Tap to deposit — UI close', 'Product', 7, '9:16', ['screen-rec', 'gesture']],
        ['Testimonial — Maria, Tallinn', 'Testimonial', 22, '9:16', ['interview', 'face']],
        ['City night timelapse', 'B-roll', 10, '16:9', ['urban', 'night', 'lights']],
        ['Hands counting cash → app', 'Hook', 9, '9:16', ['transition', 'money']],
        ['Get started CTA card', 'CTA', 4, '9:16', ['type', 'black', 'pill']],
        ['Office desk — laptop signup', 'Product', 13, '16:9', ['desk', 'signup']],
        ['Beach savings goal montage', 'Lifestyle', 18, '9:16', ['travel', 'warm', 'goal']],
        ['Testimonial — Lukas, Berlin', 'Testimonial', 20, '9:16', ['interview', 'face']],
        ['Slow-mo card tap', 'B-roll', 6, '9:16', ['macro', 'card']],
        ['Withdrawal in 1 day — type', 'Hook', 5, '1:1', ['type', 'mint']],
        ['Family kitchen evening', 'Lifestyle', 16, '9:16', ['home', 'warm', 'family']],
        ['Compound interest graph anim', 'Product', 11, '16:9', ['motion', 'graph', 'mint']],
        ['Get verified — passport scan', 'Product', 9, '9:16', ['kyc', 'screen-rec']],
        ['Rainy window, phone glow', 'B-roll', 8, '9:16', ['mood', 'rain']],
        ['Closing CTA — download', 'CTA', 4, '9:16', ['type', 'black']],
    ];
    $clips = [];
    foreach ($defs as $i => $d) {
        [$name, $cat, $dur, $aspect, $tags] = $d;
        $clips[] = [
            'id' => 'CLP-'.(1042 + $i),
            'name' => $name,
            'category' => $cat,
            'duration' => $dur,
            'aspect' => $aspect,
            'tags' => $tags,
            'color' => $thumbs[$i % count($thumbs)],
            'market' => $markets[$i % count($markets)]['code'],
            'resolution' => $aspect === '16:9' ? '1920×1080' : ($aspect === '1:1' ? '1080×1080' : '1080×1920'),
            'addedDays' => $i * 3 + 2,
            'usedCount' => ($i * 7 + 3) % 19,
        ];
    }
    $density = in_array($request->query('density'), ['compact', 'comfy'], true) ? $request->query('density') : 'regular';

    return Inertia::render('Clips/Index', [
        'clips' => $clips,
        'markets' => $markets,
        'categories' => $categories,
        'workspace' => $request->query('ws') === 'portal' ? 'portal' : 'admin',
        'theme' => $request->query('theme') === 'light' ? 'light' : 'dark',
        'density' => $density,
    ]);
})->middleware('superadmin');

// API routes — under /api prefix, using web middleware (sessions)
Route::prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
