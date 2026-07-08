# CLAUDE.md — AD.FACTORY design implementation

You are implementing the **AD.FACTORY** design (in `design_handoff_adfactory/`) inside the
**`adfactory-laravel`** repo: **Laravel 11 + Vue 3 + Inertia + Tailwind**.

Read `README.md` in this folder first — it is the full spec (screens, tokens, interactions,
data shapes). The HTML/`.jsx` files are a **runnable visual reference**, not code to paste.
Rebuild everything as **Vue 3 SFCs + Inertia pages, styled with Tailwind**.

## Order of work
1. **Tokens → Tailwind.** Port `theme.css` variables into the project. Two good options:
   - Keep `theme.css` as a global stylesheet (it already drives everything via `var(--*)`),
     set `data-theme` / `data-density` on `<html>`, and reference the vars from Tailwind via
     `theme.extend.colors = { surface0: 'var(--surface-0)', accent: 'var(--accent)', ... }`.
   - Or hard-map the dark/light values into `tailwind.config.js` and use the Tailwind `dark:`
     strategy. Preserve radii (`rounded-[18px]` cards, `rounded-full` pill buttons, 12px
     inputs) and the density spacing scale.
2. **Base components** (`resources/js/Components/`): Button, IconButton, Card, StatusPill,
   Tag, Field, Input, Select, Segmented, Progress, Sparkline, Thumb, Avatar, Drawer,
   SectionLabel, EmptyState. Mirror the props/variants in `components.jsx`. Use
   **`lucide-vue-next`** for icons (drop the inline `AF_ICONS` set and `FILL` helper).
3. **App shell** (layout): Sidebar + TopNav variants, WorkspaceSwitch (admin/portal),
   NavItem, UserChip. Make it an Inertia persistent layout.
4. **Screens → Inertia pages** (`resources/js/Pages/`): Login, Dashboard, ClipLibrary,
   OrderBuilder, Orders (+ OrderDetail drawer), CopyMapping. Wire to controllers + Eloquent
   models (Clip, AdDesign/Template, Order, CopyMap) — replace the mock `data.js`.
5. **Routing:** map the prototype's client `route` state to real Inertia routes
   (`/`, `/clips`, `/copy`, `/orders`, `/orders/create`). Order detail = a drawer on the
   orders index (query param or nested route).

## Rules
- **Match the spec pixel-accurately** (hi-fi): colors, type scale, radii, spacing, hover/
  focus/press states are all in `README.md` + `theme.css`. Don't invent new values.
- Follow the **Monefit SmartSaver** brand: Manrope type, pill buttons, hero numerics,
  "Your data is protected 🔒" / "⚡" voice, dark-first admin with the light theme using a
  black-pill primary.
- Ignore the no-build artifacts: `FILL`, `window`-scope exports, in-browser Babel.
- Keep the two themes (`data-theme="dark|light"`) and three densities working.
- Replace gradient clip tiles with real video poster frames / `<video>` posters.

## Suggested target structure
```
resources/js/
  Layouts/AppLayout.vue           # shell (sidebar/topnav + workspace switch)
  Components/                      # Button.vue, Card.vue, Thumb.vue, Drawer.vue, ...
  Pages/
    Auth/Login.vue
    Dashboard.vue
    Clips/Index.vue
    Orders/Index.vue              # table + detail drawer
    Orders/Create.vue            # 5-step builder
    Copy/Index.vue               # copy mapping editor
resources/css/app.css             # @import theme tokens
tailwind.config.js                # token map
```
Start with **tokens + base components + ClipLibrary**, then OrderBuilder, then the rest.
