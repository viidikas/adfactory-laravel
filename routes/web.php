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
    Route::get('/', function () {
        return Inertia::render('AdFactory');
    })->middleware('admin');

    Route::get('/portal', function () {
        return Inertia::render('GrowthPortal');
    });
});

// API routes — under /api prefix, using web middleware (sessions)
Route::prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
