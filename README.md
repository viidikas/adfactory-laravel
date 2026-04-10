# AD.FACTORY

Video ad production platform for Creditstar/Monefit. Built with Laravel 11, Vue 3, Inertia.js.

Two interfaces:
- **AD.FACTORY** (`/`) — Admin tool for managing clip libraries, copy mapping, Templater CSV generation, and order fulfillment
- **Growth Portal** (`/portal`) — Growth lead interface for browsing clips, selecting designs, and submitting video ad orders

## Requirements

- PHP 8.2+
- PostgreSQL 16
- Redis
- Node.js & npm
- ffmpeg (video thumbnails)
- Composer

## Setup

```bash
git clone https://github.com/viidikas/adfactory-laravel.git
cd adfactory-laravel
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env` with your database, Redis, SMTP, and Anthropic API credentials.

```bash
php artisan migrate
npm install
npm run build
```

Create the first admin user:

```bash
php artisan tinker --execute="App\Models\User::create(['name' => 'Your Name', 'email' => 'you@example.com', 'role' => 'admin']);"
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `DB_*` | PostgreSQL connection |
| `REDIS_*` | Redis connection (cache, sessions, queue) |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |
| `MAIL_*` | SMTP settings for login code emails |
| `FOOTAGE_PATH` | Absolute path to source video clips |
| `RENDERED_PATH` | Absolute path to rendered exports |

## Queue worker

Login code emails are queued. A worker must be running:

```bash
php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
```

In production, use Supervisor to keep it running.

## Server deployment

The `candalf` spellbook in the sibling repo handles full server provisioning:

```bash
./candalf.sh adfactory adfactory-book.sh
```

See the [candalf spellbook](https://github.com/viidikas/candalf) for details.

## Tech stack

- **Backend**: Laravel 11, PHP-FPM, PostgreSQL, Redis
- **Frontend**: Vue 3 + Inertia.js, Vite, Tailwind CSS
- **External**: Anthropic Claude API, Google Sheets, ffmpeg
- **Server**: Nginx, Supervisor, Let's Encrypt SSL
