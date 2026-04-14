# AD.FACTORY

Video ad production platform for Creditstar/Monefit. Built with Laravel 11, Vue 3, Inertia.js.

Two interfaces:
- **AD.FACTORY** (`/`) — Admin tool for managing projects, clips, copy mapping, and Templater CSV generation
- **Growth Portal** (`/portal`) — Growth lead interface for browsing clips by copy or category, and submitting video ad orders

## How it works

### Admin workflow

1. **Create a project** — each project is a folder on the server under `/mnt/footage/`. Upload graded masters via rsync, then scan the folder to index all clips.

2. **Connect copy sheets** — paste Google Sheets URL(s) containing advertising copy with columns: Category, Shot, Brand, EN, ET, FR, DE, ES. The system parses the sheet deterministically and maps copy lines to clips by slate code (e.g. PU1 = Product Usage slate 1).

3. **AI analysis (optional)** — run "Analyse All" to send sheets + clip list to Claude API. The AI matches shot descriptions to slates and stores enriched metadata (description, markets). This supplements the deterministic copy matching.

4. **Sync copy** — after analysis, copy is synced from the sheet into the database. Each clip's slate code determines which copy lines apply. Shot column has specific slates (e.g. "LE1, LE3") or blank for category-wide fallback.

5. **Verify matching** — use the "Filter by Copy" panel in the clip library to click a copy line and see which clips it applies to. The clip modal shows only matched copy options.

6. **Configure output** — set designs, formats, filename convention (drag-drop parts), folder structure, and AE composition name mapping.

7. **Generate CSV** — select brands, languages, designs, and optionally filter by a specific copy line. The system generates a Dataclay Templater-ready CSV with one row per clip x language x design x format combination. Rows with no copy for a given language are silently omitted.

8. **Export** — download as CSV or copy to clipboard and paste into Google Sheets.

### Growth lead workflow

1. **Login** — enter email, receive a 6-digit code, verify.

2. **Browse by Copy** — see all copy lines as cards, filter by category. Click a copy line to see matching clips. Select clips, choose languages and designs, add to order.

3. **Browse by Clips** — browse all clips with category/actor/search filters. Click a clip to open a detail panel with video preview, copy selector, language and design pickers.

4. **Submit order** — review basket, enter market and optional note, submit. Admin receives the order in their Orders tab.

5. **Track orders** — see order status: Pending → Processing → Ready.

### Copy matching rules

The Google Sheet has columns: Category, Shot, Brand, EN, ET, FR, DE, ES.

- If **Shot** has slate codes (e.g. "PU1, PU7, PU18") → that copy applies only to those slates
- If **Shot** is blank → copy applies to the entire category as fallback
- Multiple copy lines can match the same slate — admin/user picks which to use
- Slate codes: PU = Product Usage, TH = Travel and Holiday, HR = Home Renovation, LE = Lifestyle and Events, EG = Electronics and Devices, FR = Financial Relief

### Clip filename convention

Clips are parsed from filenames: `Category_SlateNumber_Actor.mov`

- `Product Usage_18_Andrey.mov` → PU18, actor Andrey
- `Travel and Holiday_3_Viktoria_Lauri.mov` → TH3, actors Viktoria and Lauri
- `Lifestyle and Events_3_Andrey_v2.mov` → LE3, actor Andrey, version 2
- Trailing underscores (e.g. `Actor_.mov`) are stripped automatically

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
| `ANTHROPIC_API_KEY` | Claude API key for AI sheet analysis |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP for login code emails |
| `MAIL_SCHEME` | `smtps` for port 465 SSL (Laravel 11 uses Symfony Mailer) |
| `FOOTAGE_PATH` | Absolute path to source video clips (default: `/mnt/footage`) |
| `RENDERED_PATH` | Absolute path to rendered exports (default: `/mnt/exports`) |

## Queue worker

Login code emails are queued via Redis. A worker must be running:

```bash
php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
```

In production, use Supervisor to keep it running.

## API endpoints

### Public
- `GET/POST /login/*` — passwordless email login

### Authenticated (all users)
- `GET /api/clips` — list clips (optional: `?category=`, `?search=`, `?actor=`)
- `GET /api/copy-lines` — parsed copy lines from the configured sheet
- `GET /api/projects` — list projects
- `GET /api/orders` — list orders (growth leads see own, admins see all)
- `POST /api/orders` — submit an order
- `GET /api/video?path=` — stream video file
- `GET /api/thumb?path=` — generate/serve video thumbnail

### Admin only
- `POST /api/projects` — create project
- `POST /api/projects/{id}/scan` — scan project folder for clips
- `PUT /api/projects/{id}/activate` — set project as active
- `PUT /api/projects/{id}/designs` — update project designs
- `POST /api/copy-lines/sync` — fetch sheet and rebuild copy-to-slate mapping
- `POST /api/analyse-sheets` — AI analysis of sheets + clips
- `POST /api/config` — update settings
- `CRUD /api/users` — manage growth lead accounts

## Testing

Tests use a separate `adfactory_test` database to protect production data:

```bash
./run-tests.sh
```

28 tests covering: auth, clips, copy lines, orders, portal access, user management.

## Server deployment

Provisioned with [adfactory-candalf](https://github.com/viidikas/adfactory-candalf) spellbook using [candalf](https://github.com/jarmo/candalf):

```bash
cd adfactory-candalf
cp .env.example .env  # fill in secrets
./run.sh
```

## Tech stack

- **Backend**: Laravel 11, PHP-FPM, PostgreSQL, Redis
- **Frontend**: Vue 3 + Inertia.js, Vite
- **External**: Anthropic Claude API, Google Sheets, ffmpeg
- **Server**: Nginx, Supervisor, Let's Encrypt SSL, Hetzner
