# Handoff: AD.FACTORY — video-ad production platform

## Overview
AD.FACTORY is the internal video-ad production platform for Creditstar Group brands
(Monefit SmartSaver, Monefit Credit, Credit24, Creditstar). It has **two workspaces**:

- **AD.FACTORY (Admin)** — the production team manages the clip library, maps localized
  copy, and fulfills orders (the `Templater` CSV / render pipeline).
- **Growth Portal** — growth marketers browse clips, choose an ad design, and submit
  video-ad orders for a brand + market.

This bundle is the **design reference** for both workspaces: Login, Dashboard, Clip
library, Order builder, Orders queue + detail, and Copy mapping editor.

The target codebase is **Laravel 11 + Vue 3 + Inertia + Tailwind** (the
`adfactory-laravel` repo).

---

## About the design files
The files in this bundle are **design references created in HTML/React-on-the-page** —
prototypes showing the intended look and behavior. They are **not production code to copy
directly**. The `.jsx` files use React via in-browser Babel (no build step) purely so the
whole reference runs from a single `index.html`.

**Your task:** recreate these designs in the target codebase using its established
patterns — **Vue 3 Single-File Components + Inertia pages, styled with Tailwind**. Re-implement
each React component as a Vue SFC, and wire the screens to real Eloquent models
(Clip, AdDesign/Template, Order, CopyMap) instead of the mock `data.js`.

Treat the HTML as the **structure + style spec**, not source to paste.

---

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interaction states are all
specified below and in `theme.css`. Recreate the UI pixel-accurately using Tailwind mapped
to these tokens. The one exception is real content/media — the colored-gradient clip
thumbnails are placeholders for real video poster frames.

---

## Design tokens

> Single source of truth: **`theme.css`**. Everything references `var(--*)`. The app supports
> **dark (default)** and **light** themes via `data-theme` on `<html>`, and three **densities**
> via `data-density`. Map these into `tailwind.config.js` (`theme.extend`), keeping the
> dark/light split as a Tailwind `dark:` strategy or a `[data-theme]` selector.

### Brand constants (theme-independent)
| Token | Value | Use |
|---|---|---|
| `--brand-mint` | `#49DA8A` | dominant green from the Figma file; primary action on dark |
| `--brand-mint-2` | `#3FC97D` | mint hover |
| `--brand-teal` | `#48DABA` | "Rendering" status |
| `--brand-sage` | `#cad8cb` | Monefit "Main" card tint source |
| `--brand-sky` | `#d4e2e8` | Monefit "Vaults" card tint source |
| `--brand-blue` | `#3880ff` | Monefit electric-blue link accent |
| `--brand-yellow` | `#f6c642` | ⚡ flourish / warnings |

### Surfaces
| Token | Dark | Light | Use |
|---|---|---|---|
| `--surface-0` | `#16191b` | `#f6f4f2` | app canvas |
| `--surface-1` | `#1c1f21` | `#ffffff` | sidebar / topbar |
| `--surface-2` | `#212528` | `#ffffff` | cards |
| `--surface-2b` | `#25292c` | `#faf8f5` | card header / subtle raise / row hover |
| `--surface-3` | `#2b3034` | `#f0ece7` | hover / pressed / wells |
| `--surface-inset` | `#15181a` | `#f0ece7` | inset wells, video letterbox |

### Text
| Token | Dark | Light | Use |
|---|---|---|---|
| `--text-1` | `#f1efe9` | `#15161a` | primary ink |
| `--text-2` | `#a7aab0` | `#5f636b` | muted / secondary |
| `--text-3` | `#71747b` | `#9aa0a8` | tertiary / placeholder |
| `--text-on-accent` | `#0a2416` | `#ffffff` | ink on the accent fill |

### Accent / status
| Token | Dark | Light |
|---|---|---|
| `--accent` | `#49DA8A` | `#14a35a` |
| `--accent-hover` | `#3FC97D` | `#0f8c4c` |
| `--accent-soft` | `rgba(73,218,138,.14)` | `rgba(20,163,90,.12)` |
| `--accent-ring` (focus) | `rgba(73,218,138,.30)` | `rgba(20,163,90,.28)` |
| `--link` | `#6fa2ff` | `#3880ff` |
| `--danger` / `--danger-soft` | `#ff6a6a` / `rgba(255,106,106,.14)` | `#e11d2a` / `#feeded` |
| `--warning` | `#f6c642` | `#b7791f` |
| `--success` | `#49DA8A` | `#14a35a` |
| `--info` | `#6fa2ff` | `#3880ff` |
| `--tint-sage` / `--tint-sky` / `--tint-violet` | soft status fills (see `theme.css`) | — |

### Buttons
| Token | Dark | Light |
|---|---|---|
| `--btn-primary-bg` | `#49DA8A` (mint) | `#000000` (black pill — true to Monefit) |
| `--btn-primary-ink` | `#0a2416` | `#ffffff` |
| `--btn-primary-hover` | `#3FC97D` | `#1a1a1a` |
| `--btn-secondary-bg` | transparent | `#ffffff` |
| `--btn-secondary-ink` | `--text-1` | `#000000` |
| `--btn-secondary-bd` | `--border-strong` | `rgba(0,0,0,.22)` |

### Borders & shadows
| Token | Dark | Light |
|---|---|---|
| `--border` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.10)` |
| `--border-strong` | `rgba(255,255,255,.16)` | `rgba(0,0,0,.22)` |
| `--divider` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.07)` |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.4)` | `0 1px 2px rgba(0,0,0,.03), 0 4px 16px rgba(0,0,0,.05)` |
| `--shadow-pop` | `0 16px 48px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.4)` | `0 16px 48px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08)` |

### Radii (theme-independent)
`--r-card: 18px` · `--r-md: 12px` · `--r-input: 12px` · `--r-chip: 10px` · `--r-pill: 999px`
(Brand cue: **all buttons are pills**. Cards 18px. Inputs/selects 12px.)

### Density (drives spacing/sizing — `data-density`)
| Token | compact | regular (default) | comfy |
|---|---|---|---|
| `--pad-card` | 16 | 20 | 26 |
| `--pad-screen` | 22 | 32 | 44 |
| `--row-h` | 40 | 52 | 62 |
| `--gap` | 12 | 16 | 22 |
| `--gap-sm` | 8 | 10 | 14 |
| `--ctrl-h` (button/input height) | 38 | 44 | 50 |
| `--grid-min` (clip card min width) | 184 | 220 | 260 |

### Typography
- **Family:** Manrope (Google Fonts), weights 400/500/600/700/800. Fallback Inter → system.
  Monospace `JetBrains Mono` for IDs/filenames (`.mono`).
- **Base:** 15px / line-height 1.45. Antialiased.
- **Hero numeric** (`.hero-num`): weight 800, `letter-spacing: -0.02em`, `tabular-nums`,
  line-height 1.0 — used for dashboard stat values, login stats.
- **Scale used:** screen H1 27px/800/-0.02em · card title 16px/700 · stat value 34px hero ·
  body 14–15px · labels 12.5–13px/600 · meta 12px `--text-3` · uppercase section labels
  12.5px/700/0.04em.

---

## Global layout / app shell

- **Two shell modes**, toggled by the `nav` tweak:
  - **Sidebar (default):** CSS grid `252px 1fr`. Left `<aside>` is `--surface-1`, full
    height, sticky. Right `#af-main` scrolls (`height: 100vh; overflow-y:auto`).
  - **Top-nav:** 64px sticky header on `--surface-1`; `#af-main` is `calc(100vh - 64px)`.
- **Sidebar contents (top→bottom):** brand lockup → workspace switch → nav items →
  (Growth Portal only) "Start an order" primary button → user chip pinned to bottom.
- **Brand lockup:** 40px mint rounded square (radius 11) holding the white `m` logo SVG,
  then wordmark `AD` + mint `.` + `FACTORY`, 19px/800/-0.02em.
- **Workspace switch:** segmented 2-up control (`AD.FACTORY`/Admin, `Growth Portal`),
  switching resets route to dashboard.
- **Nav items (Admin):** Dashboard (grid), Clip library (film), Copy mapping (filetext),
  Orders (clipboard). **(Portal):** Overview, Browse clips, My orders. Active item: filled
  `--surface-3`, icon tinted `--accent`, weight 700.
- **User chip:** avatar (initials on a hue) + name + email, opens a popover menu
  (Account, Settings, divider, Sign out in `--danger`).

---

## Screens / Views

### 1. Login (`auth.jsx` → `LoginScreen`)
- **Purpose:** authenticate via work email + emailed 6-digit one-time code.
- **Layout:** full-viewport grid `1.1fr 1fr`. Left = brand panel on `--surface-1` with a
  decorative rotated 3×3 clip mosaic (opacity .5) and 3 hero stats (`248` clips, `9.96%`
  APY, `5` markets). Right = centered form column, max-width 380.
- **Step 1 (email):** title "Sign in" (26/800), sub "Use your work email — we'll send a
  one-time login code.", email `Field`+`Input` (user icon), primary full-width "Send login
  code" with right arrow. Validates `/\S+@\S+\.\S+/`.
- **Step 2 (code):** "Back" ghost link, title "Almost there ⚡", sub naming the email, **six
  58px mono digit inputs** (auto-advance on entry, backspace moves left, Enter submits),
  primary "Verify & continue", "Resend code" link.
- **Footer line:** "🔒 Your data is protected" (`--text-3`, 12.5px) — Monefit pattern.
- **Behavior:** any 6 digits authenticate (demo). Derives display name from the email
  local-part. In the real app, wire to your login route + OTP.

### 2. Dashboard / Overview (`screens.jsx` → `Dashboard`)
- **Purpose:** at-a-glance pipeline health + what needs attention.
- **Layout (`--pad-screen`, vertical `--gap`):** header row (greeting "Welcome back,
  {first} 👋" + sub, right "New order" primary) → **4-up stat grid** → **`1.6fr 1fr`** split:
  "Needs your attention" order list + "Recent activity" feed.
- **StatCard:** label + sparkline top row; big `.hero-num` value (34px) + delta pill
  (`--success`/`--danger`). Stats: Clips in library 248 (+12), Open orders 17 (+3),
  Rendered this week 92 (+28), Avg. turnaround 1.4d (−0.3d).
- **Sparkline:** inline SVG, 92×30, area fill at .13 opacity + 2px stroke in `--accent`.
- **Attention list rows:** title + meta (flag · brand · clip count · id), 90px progress bar,
  status pill; click → Orders with that id open. Header "All orders" link → Orders.
- **Activity feed:** icon bubble (submit=send, render=film, clip=scissors, copy=filetext) +
  "**Who** what **target**" + relative time.

### 3. Clip library / Browse clips (`screens.jsx` → `ClipLibrary`, `ClipCard`)
- **Purpose:** source-footage library (admin) / clip browser (portal).
- **Layout:** header (title + count sub; right = "Upload clips" admin / "Start an order"
  portal) → **toolbar** (search input flex, market `Select`, sort `Select`, grid/list
  `Segmented`) → **category chips** (All + Hook, Lifestyle, Product, Testimonial, CTA, B-roll)
  → results.
- **Grid:** `repeat(auto-fill, minmax(var(--grid-min),1fr))`, `--gap`. **ClipCard** = `Thumb`
  + name (1-line clamp) + meta (flag · category · used N×).
- **List:** rows `48px 1fr 110px 90px 90px` — thumb, name+id+tags, market+category, mono
  duration, used count.
- **Thumb:** aspect-correct (9:16 / 1:1 / 16:9) gradient tile (radius 12), faux film
  scanlines, hover play affordance (blurred circle), aspect badge top-left, mono `0:SS`
  duration bottom-right, selected = `--accent` outline + check bubble.
- **Filtering:** by category, market, and search over name+tags; sorts: recent, most used,
  shortest. Empty state with "Clear filters".

### 4. Order builder (`orders.jsx` → `OrderBuilder`, `Stepper`, `ReviewStep`)
- **Purpose:** create + submit a localized video-ad order. Max-width 1040, centered.
- **5 steps** via `Stepper` (done=mint check, active=raised, future=dim):
  1. **Brief** — title input; brand + market selects; **Format** segmented (9:16 Reels /
     1:1 Feed / 16:9 YouTube); **Objective** segmented (Performance/Awareness/Trust/
     Consideration). Gate: title length > 2.
  2. **Clips** — selectable grid filtered to the chosen aspect; live "N selected". Gate: ≥1.
  3. **Design** — choose an ad design template (cards preview scene count as mini tiles);
     designs filtered to aspect. Gate: one chosen.
  4. **Copy** — pick locales (EN/ES/DE/EE/FR chips) + production notes textarea + info note
     that copy variants pull from the copy map. Gate: ≥1 locale.
  5. **Review** — two-column summary (title/brand/market/format/objective/design/clips/
     locales/est. variants) + selected clip thumbnails.
- **Footer:** Back/Cancel ghost (left) + Continue/Submit primary (right, disabled until gate).
  Submit → Orders with a success banner.

### 5. Orders queue + detail (`orders.jsx` → `Orders`, `OrderDetail`)
- **Purpose:** track + fulfill orders.
- **Layout:** optional success banner → header (count + "New order") → **status filter
  chips** (All + Draft, Submitted, In production, Rendering, Review, Delivered, with counts)
  → **table** rows `1.7fr 1fr 0.9fr 1.1fr 0.9fr`: order (title + id·requester), brand+market,
  clips, progress bar + %, status pill (right). Row click opens the detail **Drawer**.
- **OrderDetail (right drawer, 460px):** status pill, title, meta; **5-node timeline**
  (Submitted→In production→Rendering→Review→Delivered, completed nodes filled mint);
  2×2 facts (design, clips, progress, due — overdue in `--danger`); selected clips grid;
  **rendered variants** list (`{id}_{locale}_{aspect}.mp4`, download when ≥Rendering else
  "queued"). Footer: "Templater CSV" secondary + "Open renders" primary.

### 6. Copy mapping editor (`copymapping.jsx` → `CopyMapping`)
- **Purpose:** maintain localized copy strings mapped to clip + scene; the source of the
  **Templater CSV** export.
- **Layout:** header (+ "Add slot" secondary, "Export Templater CSV" primary) → filter chips
  (All / Approved / In review / Missing) + right-aligned "N/M cells filled" + progress →
  **sticky-first-column table**: first col = slot key + mono slug + clip·scene; one column
  **per locale** (EN/ES/DE/EE/FR); last col = status pill.
- **Inline editing:** click any cell → autofocus textarea (accent border + focus ring);
  blur commits. Empty cells show italic "— add —" in `--text-3`.
- **Export:** shows a toast "templater_copy_5locales.csv generated".
- Slots include: hook_headline, sub_line, proof_stat, trust_line, cta_button, cta_caption,
  legal_disclaimer.

### Shared overlays
- **Drawer** (`components.jsx`): right-side panel, 460px (max 92vw), scrim at .5, slides in
  `translateX` 280ms `cubic-bezier(.3,0,0,1)`, header (title + close) + scroll body +
  optional footer button row. Used for order detail and clip preview.
- **Clip preview drawer** (`app.jsx` → `ClipPreview`): large thumb, name, tag chips, 2-col
  facts (category/market/duration/aspect/resolution/used-in). Footer differs by workspace
  (portal: "Use in order"; admin: "Edit tags").

---

## Interactions & behavior
- **Routing:** client-side `route` state in `App` (`app.jsx`): dashboard, clips, copy,
  orders, builder. `go(key, id?)` scrolls `#af-main` to top; opening Orders with an id opens
  its drawer. Map to **Inertia pages/routes** in the real app.
- **Workspace switch:** `ws` = `admin | portal`; changes nav set + some labels/CTAs; resets
  to dashboard.
- **Buttons:** hover = bg shifts to hover token (or `--surface-3` ghost); press =
  `scale(0.98)`; disabled = 50% opacity, `not-allowed`. (Monefit: hover ≈ subtle, no color
  jump; press scale 0.98.)
- **Rows:** `.row-hover` → `--surface-2b` on hover.
- **Inputs/selects/textarea:** focus = `--border-strong` + 3px `--accent-ring` box-shadow;
  error = `--danger` border. Radius 12.
- **Animations:** ~150–280ms, `cubic-bezier(.3,0,0,1)` for the drawer. Progress bars animate
  width .5s. No bounce/spring (brand restraint).
- **Form validation:** email regex on login; OTP requires 6 digits; builder steps gated as
  noted above.
- **Toasts/banners:** copy export toast (auto-dismiss 2.6s); order-submitted success banner
  on the Orders screen.

---

## State management
Per-screen local state in the prototype; in the real app back these with Inertia props +
Eloquent models.
- **App:** `authed`, `user {name,email}`, `ws`, `route`, `orderId`, `preview (clip|null)`,
  `submitted`. Tweaks: `theme`, `density`, `font`, `nav` (persisted by the tweak host).
- **Login:** `step (email|code)`, `email`, `code[6]`, error.
- **ClipLibrary:** `q`, `cat`, `market`, `view (grid|list)`, `sort`.
- **OrderBuilder:** `step`, `brief {title,brand,market,aspect,objective}`, `picked[]`,
  `design`, `langs[]`, `notes`.
- **Orders:** `tab` (status filter), `detail` (open order id).
- **CopyMapping:** `rows` (slot × locale variants), `edit {ri,lang}`, `filter`, toast.

### Data shapes (see `data.js` — replace with API/Inertia props)
- **Clip:** `id, name, category, duration(s), aspect(9:16|1:1|16:9), tags[], market,
  resolution, addedDays, usedCount, fav, color`.
- **AdDesign/Template:** `id, name, scenes, aspect, dur(s), kind, color`.
- **Order:** `id, title, brand, market, status, design, clipCount, requestedBy, ageDays,
  progress, aspect, dueDays`.
- **CopyRow:** `slot, key, clip, scene, variants{EN,ES,DE,EE,FR}, status(approved|review|missing)`.
- **Enums:** markets EE/ES/DE/FR/FI; brands; categories; statuses Draft→Delivered; langs.

---

## Assets
- `assets/logo-mark.svg` — the `m` mark (uses `currentColor`, so it tints per theme).
- `assets/logo-m-circle.png`, `assets/monefit-wordmark.png` — Monefit brand marks (reference).
- **Icons:** an inline Lucide-style set in `components.jsx` (`AF_ICONS` + `<Icon>`). In the
  real app use **`lucide-vue-next`** (same names where possible: grid, film, filetext,
  clipboard, search, play, download, send, scissors, sparkles, etc.).
- **Clip thumbnails:** colored CSS gradients standing in for real **video poster frames** —
  replace with actual stills/`<video>` posters.
- **Fonts:** Manrope + JetBrains Mono via Google Fonts (`index.html` `<link>`).

---

## Files in this bundle
| File | Contents |
|---|---|
| `index.html` | entry — loads React 18 + Babel + fonts, then the scripts below; boot splash |
| `theme.css` | **all design tokens** (dark/light/density/radii) — start here |
| `data.js` | mock domain data + enums |
| `components.jsx` | UI atoms: Icon, Button, IconButton, Card, StatusPill, Tag, Field, Input, Select, Segmented, Progress, Sparkline, Thumb, Avatar, Drawer, SectionLabel, EmptyState |
| `auth.jsx` | LoginScreen, BrandLockup |
| `screens.jsx` | Dashboard, StatCard, ClipLibrary, ClipCard |
| `orders.jsx` | OrderBuilder, Stepper, ReviewStep, Orders, OrderDetail |
| `copymapping.jsx` | CopyMapping editor |
| `app.jsx` | shell: App, Sidebar, TopNav, WorkspaceSwitch, NavItem, UserChip, ClipPreview, Tweaks wiring |
| `tweaks-panel.jsx` | (prototype-only) the in-page tweak controls — not needed in the app |
| `_ds/…` | bound Monefit SmartSaver design-system tokens (`colors_and_type.css`) |
| `CLAUDE.md` | build instructions for Claude Code in the Vue/Inertia/Tailwind repo |

**To preview the reference:** open `index.html` in a browser. Sign in with any work email +
any 6-digit code.

---

## Notes & flags
- The `.jsx` is **React-on-the-page with Babel** (no build) — a runnable spec, not Inertia
  code. Re-implement as Vue SFCs.
- **`FILL` helper** in `components.jsx` renders solids as flat `linear-gradient` background
  images — that's only to dodge a preview-tool quirk that strips `<button>` background-color.
  In your app use a plain `background-color`; you can ignore `FILL` entirely.
- Component scope is shared via `window` (`Object.assign(window, {...})`) because each
  `<script type="text/babel">` is isolated — an artifact of the no-build setup, irrelevant to Vue.
- Keep the **light theme black-pill primary** (true to Monefit) and the **dark theme mint
  primary** — both are intentional and defined in `theme.css`.
