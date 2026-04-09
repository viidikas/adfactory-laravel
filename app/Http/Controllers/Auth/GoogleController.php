<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback()
    {
        $googleUser = Socialite::driver('google')->user();

        $email = $googleUser->getEmail();
        $domain = substr(strrchr($email, '@'), 1);

        if (! in_array($domain, ['creditstar.com', 'monefit.com'])) {
            return redirect('/login')->with('error', 'Access denied. Only @creditstar.com and @monefit.com email addresses are allowed.');
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $googleUser->getName(),
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
            ]
        );

        Auth::login($user, remember: true);

        if ($user->role === 'admin') {
            return redirect('/');
        }

        return redirect('/portal');
    }
}
