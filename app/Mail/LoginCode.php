<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginCode extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $plainCode,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'AD.FACTORY — your login code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.login-code',
            with: [
                'userName' => $this->user->name,
                'code' => $this->plainCode,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
