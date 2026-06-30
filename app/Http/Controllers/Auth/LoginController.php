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
    public function showLogin(Request $request)
    {
        if ($request->session()->has('auth_user_id')) {
            $user = User::find($request->session()->get('auth_user_id'));
            if ($user) {
                return redirect($this->homeFor($user));
            }
            $request->session()->forget('auth_user_id');
        }

        return Inertia::render('Auth/Login', ['step' => 'email']);
    }

    public function selectUser(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Always show the same message — don't reveal whether the email exists
        if (! $user) {
            session()->flash('success', 'If this email is registered, a login code has been sent.');
            return redirect('/login');
        }

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

        // Store pending user in session; reset any prior failed-attempt counter
        $request->session()->put('pending_user_id', $user->id);
        $request->session()->forget("otp_attempts_{$user->id}");

        return Inertia::render('Auth/Login', [
            'step' => 'code',
            'userName' => $user->name,
            'userEmail' => $user->email,
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

        return Inertia::render('Auth/Login', [
            'step' => 'code',
            'userName' => $user->name,
            'userEmail' => $user->email,
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

        $attemptsKey = "otp_attempts_{$user->id}";

        if (! $loginCode || ! Hash::check($request->code, $loginCode->code)) {
            $attempts = (int) $request->session()->get($attemptsKey, 0) + 1;
            $request->session()->put($attemptsKey, $attempts);

            // After 5 wrong attempts, invalidate the code entirely — the user must
            // request a new one. This caps brute-forcing the 6-digit code.
            if ($attempts >= 5) {
                LoginCode::where('user_id', $user->id)->delete();
                $request->session()->forget($attemptsKey);
                session()->flash('error', 'Too many incorrect attempts. Please request a new code.');
                return Inertia::render('Auth/Login', [
                    'step' => 'code',
                    'userName' => $user->name,
                    'userEmail' => $user->email,
                ]);
            }

            session()->flash('error', 'Invalid or expired code. Please try again.');
            return Inertia::render('Auth/Login', [
                'step' => 'code',
                'userName' => $user->name,
                'userEmail' => $user->email,
            ]);
        }

        // Delete used code
        $loginCode->delete();

        // Set authenticated session
        $request->session()->put('auth_user_id', $user->id);
        $request->session()->forget('pending_user_id');
        $request->session()->forget($attemptsKey);

        return redirect($this->homeFor($user));
    }

    /** Post-login landing page for a user's role. */
    private function homeFor(User $user): string
    {
        if ($user->isLegal()) {
            return '/legal';
        }

        return $user->isSuperAdmin() ? '/' : '/portal';
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

        // Fresh code → reset the failed-attempt counter
        $request->session()->forget("otp_attempts_{$user->id}");

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
