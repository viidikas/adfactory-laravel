<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\LoginCode as LoginCodeMail;
use App\Models\LoginCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class LoginController extends Controller
{
    public function showUserList(Request $request)
    {
        if ($request->session()->has('auth_user_id')) {
            $user = User::find($request->session()->get('auth_user_id'));
            if ($user) {
                return redirect($user->isAdmin() ? '/' : '/portal');
            }
            $request->session()->forget('auth_user_id');
        }

        $users = User::orderBy('role', 'asc')
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'email', 'role', 'market']);

        return Inertia::render('Login', [
            'users' => $users,
        ]);
    }

    public function selectUser(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);

        // Delete old codes for this user
        LoginCode::where('user_id', $user->id)->delete();

        // Generate 6-digit code
        $plainCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store bcrypt hash
        LoginCode::create([
            'user_id' => $user->id,
            'code' => bcrypt($plainCode),
            'expires_at' => now()->addMinutes(10),
        ]);

        // Queue email
        Mail::to($user->email)->queue(new LoginCodeMail($user, $plainCode));

        // Store pending user in session
        $request->session()->put('pending_user_id', $user->id);

        return Inertia::render('Verify', [
            'userName' => $user->name,
        ]);
    }

    public function showVerify(Request $request)
    {
        if (! $request->session()->has('pending_user_id')) {
            return redirect('/login');
        }

        $user = User::find($request->session()->get('pending_user_id'));
        if (! $user) {
            $request->session()->forget('pending_user_id');
            return redirect('/login');
        }

        return Inertia::render('Verify', [
            'userName' => $user->name,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6|regex:/^\d{6}$/',
        ]);

        $userId = $request->session()->get('pending_user_id');
        if (! $userId) {
            return redirect('/login');
        }

        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget('pending_user_id');
            return redirect('/login');
        }

        // Find latest valid login code
        $loginCode = LoginCode::where('user_id', $user->id)
            ->valid()
            ->latest()
            ->first();

        if (! $loginCode || ! Hash::check($request->code, $loginCode->code)) {
            session()->flash('error', 'Invalid or expired code. Please try again.');
            return Inertia::render('Verify', [
                'userName' => $user->name,
            ]);
        }

        // Delete used code
        $loginCode->delete();

        // Set authenticated session
        $request->session()->put('auth_user_id', $user->id);
        $request->session()->forget('pending_user_id');

        return redirect($user->isAdmin() ? '/' : '/portal');
    }

    public function resend(Request $request)
    {
        $userId = $request->session()->get('pending_user_id');
        if (! $userId) {
            return redirect('/login');
        }

        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget('pending_user_id');
            return redirect('/login');
        }

        // Delete old codes
        LoginCode::where('user_id', $user->id)->delete();

        // Generate new 6-digit code
        $plainCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store bcrypt hash
        LoginCode::create([
            'user_id' => $user->id,
            'code' => bcrypt($plainCode),
            'expires_at' => now()->addMinutes(10),
        ]);

        // Queue email
        Mail::to($user->email)->queue(new LoginCodeMail($user, $plainCode));

        session()->flash('success', 'A new code has been sent to your email.');

        return redirect('/login/verify');
    }

    public function logout(Request $request)
    {
        $request->session()->forget('auth_user_id');
        $request->session()->forget('pending_user_id');

        return redirect('/login');
    }
}
