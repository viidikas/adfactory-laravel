# AD.FACTORY UX/UI Audit

_Audit date: 2026-04-13_

---

## 1. Does It Actually Work?

### Admin Flows

| Flow | Status | Notes |
|------|--------|-------|
| Login (email -> OTP -> verify -> redirect to /) | **WORKS** | LoginController handles email lookup, code generation, verification. Growth leads redirected to /portal via AdminOnly middleware. |
| Clip library scan (project -> scan -> grid) | **WORKS** | ProjectController@scan walks filesystem, ClipParser extracts metadata, clips stored in DB, grid renders from /api/clips. |
| Filter clips by copy (panel -> grid filters) | **WORKS** | adminActiveCopyFilter in clips.js filters by shot codes or category in renderClipGrid(). |
| CSV generation (filters -> generate -> download) | **WORKS** | generateSheet() in generate.js applies copy filter + slate/category/lang/design/brand filters. getCopy() uses DB-populated COPY_KEYS. exportCSV() triggers blob download. |
| User management (add/delete growth leads) | **WORKS** | UserController CRUD endpoints. Admin.js addGrowthLead() posts name+email. Delete with self-protection. |
| Order management (view -> status change) | **WORKS** | OrderController@update accepts status changes. Admin portal renders status buttons. |
| Config (sheet URL -> copy sync) | **WORKS** | ConfigController stores sheet_url. CopyLineController@sync fetches CSV, parses deterministically, stores copy_lines + slate_copy_mapping. |

### Growth Lead Flows

| Flow | Status | Notes |
|------|--------|-------|
| Login (email -> OTP -> redirect to /portal) | **WORKS** | Same LoginController. Role check redirects growth_lead to /portal. |
| Browse by Copy (cards -> click -> clips) | **WORKS** | copy-browse.js: category chips filter copy grid, selectCopyLine filters clips by shot codes, Step 3 collects langs/designs. |
| Browse by Clips (grid -> detail panel -> basket) | **WORKS** | clips.js: openDetailPanel renders slide-in with video/copy/lang/design. addFromDetailPanel builds basket item. |
| Basket (add items -> review -> submit) | **WORKS** | Basket persisted in localStorage. submitOrder() POSTs to /api/orders. OrderController creates Order + OrderItems. |
| My Orders (list -> status visible) | **WORKS** | loadOrders() fetches /api/orders, filters by user_id for growth_leads. Collapsible cards with status badges. |

**Verdict: All 12 major flows are functional end-to-end.**

---

## 2. UX Bottlenecks

### Missing Loading States

| Location | Issue | Impact |
|----------|-------|--------|
| portal-js/clips.js:8 | `loadClipsFromServer()` shows "Loading clips..." text but no spinner | User sees blank grid momentarily |
| portal-js/copy-browse.js:50 | `renderCopyGrid()` has no loading indicator while copyLines load | "No copy lines found" flashes before data arrives |
| adfactory-js/clips.js:scanProject() | Server-side scan has toast "Scanning folder..." but no progress bar | Scan could take 10+ seconds on large folders |
| adfactory-js/generate.js:383 | Progress bar exists for generation but starts at 0% with no animation | Feels stuck on first iteration |

### Missing Empty States

| Location | Issue |
|----------|-------|
| portal-js/orders.js:80 | "No orders yet" shown but no call-to-action directing user to browse clips |
| portal-js/copy-browse.js:50 | Empty copy grid says "No copy lines found" - should say "Admin needs to sync copy sheets" |
| adfactory-js/clips.js:renderClipGrid:344 | Empty clip grid shows generic message - should distinguish "no clips scanned" from "no clips match filter" |

### Missing Error States

| Location | Issue |
|----------|-------|
| portal-js/clips.js:50 | Failed clip load shows "Could not load clips" with no retry button |
| portal-js/main.js:80 | Failed loadCopyLines silently sets empty array - user never knows copy is missing |
| adfactory-js/admin.js:207 | saveProjectDesigns failure shows toast but design appears saved locally |

### Destructive Actions Without Confirmation

| Location | Action |
|----------|--------|
| adfactory-js/clips.js:deleteProject() | Has confirm() dialog - OK |
| portal-js/clips.js:clearBasket() | **No confirmation** - clears entire basket immediately |
| adfactory-js/clips.js:clearCopyFilter() | No confirmation needed - non-destructive |

### Undocumented Knowledge Required

| What | Who Needs to Know |
|------|-------------------|
| Slate code meaning (PU=Product Usage, TH=Travel) | Admin, but no legend shown in UI |
| "Active" project concept (only one at a time) | Admin - no tooltip explaining why |
| Copy matching rules (slate-specific vs category-wide) | Admin - Step 4 Copy Mapping has no explanation |
| Comp name format for After Effects | Admin - no validation or examples shown |

---

## 3. UI Consistency

### CSS Variables

Both admin (`adfactory.css`) and portal (`growth-portal.css`) define the same CSS custom properties. **Consistent.**

```
--bg: #0a0b0e  --s1: #111318  --s2: #161920  --s3: #1c2028
--accent: #e8ff47  --blue: #47c8ff  --green: #34d399  --orange: #ff6b47
```

### Hardcoded Colours

| File | Line | Issue |
|------|------|-------|
| portal-js/copy-browse.js:110 | `background:var(--accent);color:#000` | #000 hardcoded instead of using a variable |
| adfactory-js/clips.js (copy filter) | `background:rgba(232,255,71,.06)` | Raw RGB of --accent; should use var(--accent) with opacity |
| GrowthPortal.vue:253 | `.logout-btn` border `#2d333b` | Hardcoded instead of var(--border) |

### Typography

- **DM Mono** (body): Applied consistently via `font-family:'DM Mono',monospace` on all inputs, buttons, body text
- **Syne** (headings): Applied via `font-family:'Syne',sans-serif;font-weight:800` on card-title, modal-title, topbar-logo
- **Font size range**: 8px to 28px. The 8px and 9px sizes (slate codes, captions) are very small but intentional for data-dense UI.

### Button Styles

| Style | Admin | Portal | Consistent? |
|-------|-------|--------|-------------|
| .btn-primary | Yes | Yes | Yes |
| .btn-ghost | Yes | Yes | Yes |
| .btn-blue | Yes | Yes | Yes |
| .btn-green | Yes | Yes | Yes |
| .btn-danger | No | Yes | Admin missing danger style |

### Responsiveness

- **Admin**: Sidebar is fixed 240px. Content overflows on <1024px screens. No `@media` breakpoints.
- **Portal**: Topbar + tab bar are responsive. Clip grid uses `auto-fill, minmax(220px, 1fr)`. Detail panel is fixed 400px - squeezes content on <900px.
- **Login/Verify**: Centered box with max-width 440px. **Works on mobile.**

---

## 4. Missing Features vs Original Spec

| Feature | Status | Notes |
|---------|--------|-------|
| Filename convention builder (drag-drop) | **Built** | Step 5 in admin, persisted in localStorage |
| Folder path builder (drag-drop) | **Built** | Step 5, same mechanism |
| Rendered video linking to orders | **Partial** | Schema exists (rendered_clips JSON on orders), UI for admin to attach files not fully built |
| Row count preview before generation | **Built** | updateGenPreview() in generate.js shows estimate in Step 7 |
| Path/folder preview | **Built** | Step 5 shows live preview of output path |
| Bulk order actions for admin | **Not built** | Admin can only change status one order at a time |
| Mobile layout for portal | **Not built** | No responsive breakpoints for portal |
| Designs tab in portal | **Removed** | Was separate tab, now integrated into browse modes |

---

## 5. Priority Fixes

### P1 — Broken (prevents usage)

_None found. All flows work._

### P2 — Critical UX (causes confusion)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | clearBasket() has no confirmation | portal-js/clips.js:241 | Add `if (!confirm('Clear all items from your order?')) return;` before line 242 |
| 2 | Copy lines loading silently fails - portal shows no copy options | portal-js/main.js:79-83 | If copyLines is empty after load, show toast: "No copy data available. Ask admin to sync sheets." |
| 3 | Stale COPY_KEYS if admin hasn't run analysis | adfactory-js/constants.js:19 | The hardcoded COPY_KEYS in constants.js are overwritten by loadSlateData() — but if loadSlateData runs before clips load, stale data persists. Move the rebuild to after loadClipsFromProxy resolves. |
| 4 | Admin designs save fails silently if no active project | adfactory-js/admin.js:208 | Show error message "No active project. Activate a project in Step 2 first." instead of just returning false |

### P3 — Important (improves experience)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 5 | No loading spinner for clip grid | portal-js/clips.js:9 | Replace "Loading clips..." text with a CSS spinner animation before the fetch |
| 6 | Empty copy browse shows confusing message | portal-js/copy-browse.js:50 | Change "No copy lines found" to "Copy not configured yet. Ask admin to sync sheets in AD.FACTORY." |
| 7 | Slate code legend not shown | adfactory-js/clips.js (copy filter panel) | Add a collapsible legend below category chips: "PU = Product Usage, TH = Travel and Holiday..." |
| 8 | Tab underline sometimes flickers on portal load | portal-js/main.js:37-48 | Ensure showTab is called only after DOM is fully ready (already deferred via portalInit, but CSS transition can cause flash) |
| 9 | Portal detail panel too narrow on small screens | portal-css/growth-portal.css:230 | Add `@media (max-width: 900px) { .clip-detail-panel { width: 100%; position: fixed; } }` |
| 10 | Admin sidebar overflows on narrow screens | adfactory-css/adfactory.css | Add `@media (max-width: 1024px)` to collapse sidebar into hamburger menu |

### P4 — Nice to Have (polish)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 11 | No keyboard focus indicators | Both CSS files | Add `:focus-visible { outline: 2px dashed var(--accent); outline-offset: 2px; }` to both stylesheets |
| 12 | Toast duration fixed at 3s | portal-js/main.js:20, adfactory-js equivalent | Scale toast duration by message length: `Math.max(3000, msg.length * 60)` |
| 13 | No URL-based filter state | Both apps | Store active tab/filters in URL query params for shareability |
| 14 | Base64 design images bloat settings table | Project model | Store images as files in storage/app/designs/ and reference by URL |
| 15 | No audit log for config changes | ConfigController.php | Log old→new values when sheet_url, rendered_path change |
| 16 | Emoji icons lack alt text | Both Vue files | Add `aria-label` to all emoji-only buttons and icons |
| 17 | 9px font size too small for some users | Both CSS files | Set minimum body font to 11px; use 9px only for tertiary labels |
| 18 | No onboarding for new admin | AdFactory.vue | Add first-visit modal explaining the 7-step workflow |

---

## Summary

**Overall status: Production-ready for internal use.** All 12 major user flows work end-to-end. No P1 (blocking) issues found. Four P2 (critical UX) issues should be addressed before wider rollout. The application is well-structured with consistent theming and clear navigation.

**Strongest areas:** Multi-mode browsing, deterministic copy matching, CSV generation pipeline.

**Weakest areas:** Mobile responsiveness, accessibility (keyboard navigation), error recovery.
