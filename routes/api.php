<?php

use App\Http\Controllers\Api\ClipController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProxyController;
use App\Http\Controllers\Api\SheetController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VideoController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Config
    Route::get('/config', [ConfigController::class, 'index']);
    Route::post('/config', [ConfigController::class, 'store'])->middleware('admin');

    // Sheets
    Route::get('/sheets', [SheetController::class, 'show']);

    // Claude proxy
    Route::post('/proxy', [ProxyController::class, 'forward']);

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

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store'])->middleware('admin');
});
