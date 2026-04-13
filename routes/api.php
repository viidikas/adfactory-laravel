<?php

use App\Http\Controllers\Api\AnalyseController;
use App\Http\Controllers\Api\ClipController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\CopyLineController;
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
    Route::post('/config', [ConfigController::class, 'store'])->middleware('admin');

    // Sheets
    Route::get('/sheets', [SheetController::class, 'show']);

    // Claude proxy
    Route::post('/proxy', [ProxyController::class, 'forward']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}/designs', [ProjectController::class, 'designs']);

    // Copy lines
    Route::get('/copy-lines', [CopyLineController::class, 'index']);

    // Clips
    Route::get('/clips', [ClipController::class, 'index']);
    Route::post('/clips', [ClipController::class, 'store'])->middleware('admin');
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

    // Admin-only routes
    Route::middleware('admin')->group(function () {
        Route::post('/analyse-sheets', [AnalyseController::class, 'analyse']);
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::post('/projects/{project}/scan', [ProjectController::class, 'scan']);
        Route::put('/projects/{project}/activate', [ProjectController::class, 'activate']);
        Route::put('/projects/{project}/designs', [ProjectController::class, 'updateDesigns']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });
});
