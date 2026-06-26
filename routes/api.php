<?php

use App\Http\Controllers\Api\ClipController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\CopyController;
use App\Http\Controllers\Api\CopyLineController;
use App\Http\Controllers\Api\DeliveredClipController;
use App\Http\Controllers\Api\MarketController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProxyController;
use App\Http\Controllers\Api\SheetController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VideoController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // Config
    Route::get('/config', [ConfigController::class, 'index']);
    Route::post('/config', [ConfigController::class, 'store'])->middleware('superadmin');

    // Sheets
    Route::get('/sheets', [SheetController::class, 'show']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}/designs', [ProjectController::class, 'designs']);

    // Copy lines (legacy AD.FACTORY generate flow — global single-sheet cache)
    Route::get('/copy-lines', [CopyLineController::class, 'index']);
    Route::post('/copy-lines/sync', [CopyLineController::class, 'sync'])->middleware('superadmin');

    // Markets — growth leads see ACTIVE markets only (the selector); admins see all.
    Route::get('/markets', [MarketController::class, 'index']);
    // Market-scoped copies — inactive markets' copies are never returned to leads.
    Route::get('/copies', [CopyController::class, 'index']);

    // Clips
    Route::get('/clips', [ClipController::class, 'index']);
    Route::post('/clips', [ClipController::class, 'store'])->middleware('superadmin');
    Route::get('/clips-meta', [ClipController::class, 'meta']);

    // Video
    Route::get('/video', [VideoController::class, 'stream']);
    Route::get('/thumb', [VideoController::class, 'thumb']);
    Route::get('/rendered-video', [VideoController::class, 'rendered']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::put('/orders/{order}', [OrderController::class, 'update']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Delivered clips — final rendered creative, market-scoped. Reads are open to
    // any authenticated user (leads see active markets only; enforced in the
    // controller); the file/thumbnail stream through authenticated routes, never
    // a public /storage URL.
    Route::get('/delivered-clips', [DeliveredClipController::class, 'index']);
    Route::get('/delivered-clips/{deliveredClip}/download', [DeliveredClipController::class, 'download']);
    Route::get('/delivered-clips/{deliveredClip}/stream', [DeliveredClipController::class, 'stream']);
    Route::get('/delivered-clips/{deliveredClip}/thumbnail', [DeliveredClipController::class, 'thumbnail']);

    // Admin-only routes — restricted to super admins (the AD.FACTORY panel).
    Route::middleware('superadmin')->group(function () {
        // Claude proxy forwards to the Anthropic API using the server's key, so it
        // must never be reachable by non-admin users.
        Route::post('/proxy', [ProxyController::class, 'forward']);

        Route::post('/projects', [ProjectController::class, 'store']);
        Route::post('/projects/{project}/scan', [ProjectController::class, 'scan']);
        Route::put('/projects/{project}/activate', [ProjectController::class, 'activate']);
        Route::put('/projects/{project}/designs', [ProjectController::class, 'updateDesigns']);
        Route::post('/projects/{project}/designs/upload', [ProjectController::class, 'uploadDesignImage']);
        Route::delete('/projects/{project}/designs/image', [ProjectController::class, 'deleteDesignImage']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        // Markets admin — prepare/review a market while inactive, then enable it.
        // `sync-all` is declared before the {market} routes to avoid any clash.
        Route::post('/markets/sync-all', [MarketController::class, 'syncAll']);
        Route::post('/markets', [MarketController::class, 'store']);
        Route::put('/markets/{market}', [MarketController::class, 'update']);
        Route::put('/markets/{market}/enable', [MarketController::class, 'enable']);
        Route::put('/markets/{market}/disable', [MarketController::class, 'disable']);
        Route::post('/markets/{market}/sync', [MarketController::class, 'sync']);
        // Copy review + per-copy enablement (copy text is read-only; the `enabled`
        // flag is the content gate).
        Route::get('/markets/{market}/copies', [MarketController::class, 'copies']);
        Route::put('/markets/{market}/copies/{copy}', [MarketController::class, 'toggleCopy']);

        // Delivered clips — upload / edit / replace-thumbnail / delete (admin).
        Route::post('/delivered-clips', [DeliveredClipController::class, 'store']);
        Route::post('/delivered-clips/batch', [DeliveredClipController::class, 'storeBatch']);
        Route::put('/delivered-clips/{deliveredClip}', [DeliveredClipController::class, 'update']);
        Route::post('/delivered-clips/{deliveredClip}/thumbnail', [DeliveredClipController::class, 'updateThumbnail']);
        Route::delete('/delivered-clips/{deliveredClip}', [DeliveredClipController::class, 'destroy']);
    });
});
