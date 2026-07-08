# AD.FACTORY

A market-aware ad-copy and video-clip delivery platform for the dual-brand
**Creditstar / Monefit** group. Admins prepare markets (localized ad copy synced
from Google Sheets) and a library of source footage; growth leads assemble orders
by pairing approved copy with clips; the production team renders finished,
localized videos and delivers them back through the platform. Everything is
gated by two server-side compliance controls — copy confirmation and legal clip
review — so nothing ships without sign-off.

Built with **Laravel 12** (PHP 8.2+), **PostgreSQL**, **Redis**, and a **Vue 3 +
Inertia.js** front end bundled by **Vite**. Video thumbnails/format detection use
**ffmpeg**.

---

## Core domain concepts

- **Markets** — one per country for Creditstar (EE, FI, ES, CZ, PL, SE, DK, UK)
  and a single EEA-wide market for Monefit. A market is created **inactive**; an
  admin prepares and reviews it, then explicitly enables it. Only active markets
  appear in the lead-facing selector. See `Market::canonical()`.
- **Copies** — the advertising copy lines for a market, **synced read-only** from
  a Google Sheet (Category / Shot / Brand / language columns). Copy text is never
  edited in the app; the sheet is the source of truth. Each copy carries an
  `enabled` flag and an optional per-copy disclaimer requirement.
- **Orders** — a growth lead's basket of *(clip × copy × languages × designs)*
  line items, submitted against one active market. Status flow:
  `pending → processing → ready` (or `rejected`).
- **Delivered clips** — the rendered, localized videos the production team uploads
  back against an order/market. Each carries parsed metadata
  (brand/lang/copy/slate/actor/design/format), a `creative_key` grouping its
  formats, and a legal `review_status`.
- **Legal role & clip review** — a dedicated `legal` user reviews each delivered
  clip and approves or declines it (with an append-only audit trail). Admins
  upload clips but **do not** approve them — a deliberate separation of duties.

### The two-gate compliance model

Two independent, **server-side-enforced** gates stand between raw material and a
downloadable ad. They are separate controls — do not conflate them:

1. **Copy confirmation (the message).** Copy is synced read-only from the sheet.
   A per-copy `enabled` flag is the content gate: a market can only be *enabled*
   once at least one copy is enabled, and leads are only ever offered/able to
   order **enabled** copy. A `MarketConfirmation` records a compliance sign-off
   against a deterministic **content hash** of the market's copy set
   (`Market::computeContentHash()` / `isConfirmed()`); if any copy text, key, or
   disclaimer flag changes, the hash changes and the confirmation lapses.

2. **Clip legal review (the finished video).** Every delivered clip starts
   `pending`. Only a `legal` user can move it to `approved` / `declined`.
   **Downloads are approved-only for everyone** (admins and leads included).
   Legal and admins may *stream* an unapproved clip to review it, but leads can
   only preview approved clips. Replacing a clip's video file resets its review
   to `pending` (with an audit row).

The download endpoint itself is doubly gated: `authorizeView()` (market
visibility) **and** `isApproved()` (legal). These rules live server-side in
`DeliveredClipController` and the `Market` / `DeliveredClip` models — the UI
mirrors them but never enforces them.

---

## Roles & access control

Authentication is **passwordless**: a user enters their email, receives a 6-digit
code by email (queued), and verifies it. The resolved user id lives in the
session; `/api/*` runs inside the web group and is therefore **CSRF-protected**
(the front end sends `X-XSRF-TOKEN`, wired in `resources/js/app.js`).

| Role | Home | Can do | Gated by |
|------|------|--------|----------|
| **Super-admin** | `/` (operator panel) | Everything: manage markets, per-copy enablement, projects/clips, Templater CSV generation, users, delivered-clip admin | Email **allowlist** in `config/adfactory.php` → `super_admins` (env `ADFACTORY_SUPER_ADMINS`, comma-separated, case-insensitive). `SuperAdmin` middleware. |
| **Admin** (`role = admin`) | portal / admin APIs | Admin-scoped APIs (upload delivered clips, etc.); sees all markets. An `admin` **not** on the super-admin allowlist is treated like a lead for the operator panel. | `AdminOnly` middleware (`role === 'admin'`). |
| **Growth lead** (`role = growth_lead`) | `/portal` | Browse clips/copy for **active** markets, build and submit orders, download **approved** delivered clips for their market | `auth` + `RejectLegal`. |
| **Legal** (`role = legal`) | `/legal` | Review delivered clips only (approve/decline). Cannot reach the operator panel or the portal. | `Legal` middleware (`role === 'legal'`); `RejectLegal` bounces legal users out of the portal. |

Middleware aliases (`bootstrap/app.php`): `auth`, `admin`, `superadmin`,
`legal`, `rejectlegal`.

---

## Local setup

Prerequisites: **PHP 8.2+**, **Composer**, **Node.js + npm**, **Docker** (for
Postgres), and **ffmpeg** (thumbnails / format detection).

```bash
# 1. PHP + JS dependencies
composer install
npm install

# 2. App env
cp .env.example .env
php artisan key:generate

# 3. Postgres (local + test DBs) via Docker
#    Brings up postgres:16 with adfactory_local and adfactory_test
#    (see docker-compose.yml and docker/postgres/init/).
docker compose up -d      # or: docker-compose up -d

# 4. Schema + seed data (markets are seeded INACTIVE; UserSeeder adds users)
php artisan migrate
php artisan db:seed

# 5. Run it
npm run dev               # Vite dev server
php artisan serve         # or your usual PHP host
```

Point `.env` at the Docker Postgres (`DB_HOST=127.0.0.1`, `DB_DATABASE=adfactory_local`,
`DB_USERNAME=adfactory`, empty `DB_PASSWORD` — the container uses `trust` auth for
local dev only).

### Environment keys that matter

| Variable | Purpose |
|----------|---------|
| `DB_*` | PostgreSQL connection |
| `REDIS_*` | Redis (cache, sessions, queue) — production defaults to redis |
| `ANTHROPIC_API_KEY` | Claude API key for the **optional** AI sheet-analysis step (`config/services.php` → `anthropic`) |
| `ADFACTORY_SUPER_ADMINS` | Comma-separated super-admin email allowlist |
| `MAIL_*` | SMTP for login-code emails (`MAIL_SCHEME=smtps` for port 465) |
| `FOOTAGE_PATH` / `RENDERED_PATH` | Absolute paths to source footage / rendered exports |

> **Google Sheets:** copy is fetched from the sheet's **public gviz CSV endpoint**
> (`docs.google.com/.../gviz/tq?...`) in `SheetSyncService`. There are **no
> Google API credentials** — the sheet simply has to be shared as viewable.

Login-code emails are queued; run a worker when exercising login:
`php artisan queue:work`.

### Running the tests (PostgreSQL — **not** SQLite)

The suite runs against the `adfactory_test` Postgres database (created by the
Docker init script; config in `phpunit.xml` / `.env.testing`):

```bash
php artisan test
```

Suites: **Unit** (`tests/Unit`, e.g. the filename parser) and **Feature**
(`tests/Feature`, the HTTP/domain tests).

> ⚠️ **Known gotcha:** the committed `.env.testing` ships a placeholder `APP_KEY`
> that is **not** a valid 32-byte key, so the suite fails with an encryption
> error out of the box. Until that's fixed in the repo, run with a real key, e.g.
> `APP_KEY="base64:$(openssl rand -base64 32)" php artisan test`.
> *(TODO: replace the placeholder with a valid generated key.)*

---

## Deployment

Provisioned with the [adfactory-candalf](https://github.com/viidikas/adfactory-candalf)
spellbook (via [candalf](https://github.com/jarmo/candalf)) — Nginx, PHP-FPM,
PostgreSQL, Redis, Supervisor, Let's Encrypt.

Application deploys run from a workstation via `./deploy.sh`, which SSHes to the
`adfactory` host (`/var/www/adfactory`) and:

1. `git pull origin main`
2. `npm run build` — **the front-end bundle is built on the server**;
   `public/build` is gitignored and never committed.
3. Writes `public/version.json` with a fresh timestamp — **required** cache-bust
   so browsers pick up the new JS/CSS (stale `version.json` = stale app).
4. `storage:link`, fixes ownership, then `config:cache` + `route:cache`.

**`deploy.sh` does not run migrations.** Run them manually, and **always
`pg_dump` the database first**:

```bash
# on the server, after deploy.sh
pg_dump adfactory > backup-$(date +%F).sql      # 1. back up FIRST
php artisan migrate --force                      # 2. migrate
php artisan db:seed --force                      # 3. seed (idempotent) if needed
# 4. one-off backfills, as needed (both support --dry-run):
php artisan orders:backfill-market
php artisan designs:migrate-images
```

Order: **back up → migrate → seed → backfill.** Some data moves live inside
migrations (e.g. `backfill_orders_market_id`, the `creative_key` backfill);
larger/optional moves are the artisan backfill commands above.

---

## Templater filename convention

Two distinct filename shapes flow through the system; both are parsed by the
single authoritative service **`app/Services/ClipParser.php`**:

- **Source library clips** — `Category_SlateNumber_Actor[_version]`
  (`ClipParser::parse()`), e.g.
  - `Product Usage_18_Andrey.mov` → slate **PU18**, actor Andrey
  - `Travel and Holiday_3_Viktoria_Lauri.mov` → **TH3**, actors Viktoria & Lauri
  - `Lifestyle and Events_3_Andrey_v2.mov` → **LE3**, Andrey, version 2
  - Slate prefixes: PU (Product Usage), TH (Travel and Holiday),
    HR (Home Renovation), LE (Lifestyle and Events),
    EG (Electronics and Devices), FR (Financial Relief).
- **Rendered Templater outputs** — `brand_lang_copyslug_slate_actor_design_format`
  (`ClipParser::parseRendered()`), e.g.
  `Creditstar_FI_Suunnittele_Pt_Hae_PU8_Kemal_design1_16x9`.
  `ClipParser::creativeKey()` strips the trailing format token so every format of
  one creative shares a key.

`DeliveredClip` delegates its `parseFilename()` / `creativeKey()` /
`slugifyCopy()` to `ClipParser` — there is exactly one implementation of each so
the model and the controllers can't drift.

---

## Conventions

- **Branch-first + PR.** Never commit straight to `main` and never merge without
  review.
- **PostgreSQL for tests, not SQLite.** The app relies on Postgres behavior; the
  test suite is configured for `pgsql` and must stay that way.
- **No unsanctioned major dependency upgrades.** Framework/library major bumps
  are a deliberate, reviewed decision — don't fold them into unrelated work.
- **Compliance rules are server-side.** The copy-confirmation and legal-review
  gates (and the market-visibility rule, `Market::isVisibleTo()`) are enforced in
  controllers/models. Treat any front-end check as a mirror, not the source of
  truth.
