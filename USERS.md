# AD.FACTORY — User Guide

## Logging in

1. Go to https://adfactory.viljar.ee
2. Enter your email address
3. Check your inbox for a 6-digit login code (from adfactory@viljar.ee)
4. Enter the code — you'll be logged in automatically

The code expires after 10 minutes. Click "Resend code" if it doesn't arrive. Check your spam folder.

Only emails added by an admin can log in.

---

## Growth Portal

After logging in, you'll see the Growth Portal with three tabs.

### Browse Clips

Browse available video clips organized by category:
- Product Usage
- Travel and Holiday
- Home Renovation
- Lifestyle and Events
- Electronics and Devices
- Financial Relief

**Filter** by category, actor, or search by name.

**Click a clip** to open it. In the clip modal you can:
- Watch the video with prev/next navigation
- See clip details (slate, category, actor)
- Pick a **copy variant** from the dropdown — translations are shown below
- Select **languages** (EN, ET, FR, DE, ES)
- Select **designs** — click "View" to preview each design
- Click **Add to Order** to add it to your basket

A warning appears if you try to add a duplicate (same clip + copy + languages + designs).

### Submitting an order

The basket bar at the bottom shows how many clips you've selected.

1. Click **Submit Order**
2. Enter your **market** (e.g. FI, EE, DK) and an optional note
3. Review the order summary
4. Click **Submit**

### My Orders

View all your submitted orders with status:
- **Pending** — order received, waiting for admin
- **Processing** — admin is working on it
- **Ready** — rendered videos are available for download

### Designs

Browse all available design templates with preview images in each aspect ratio (16:9, 1:1, 9:16, 4:5). Click any thumbnail for a fullscreen preview.

---

## AD.FACTORY (Admin)

Admins land on the main AD.FACTORY interface — a multi-step workflow for generating Dataclay Templater CSV render sheets.

### Step 1 — Data Sources
Connect Google Sheets containing copy data. The AI analyses the sheet structure automatically.

### Step 2 — Clip Library
Scan your local footage folder to index all available clips. Clips are parsed by filename pattern: `Category_SlateNumber_ActorName.mov`.

### Step 3 — Filters
Select which brands, languages, categories, slates, and designs to include in the output.

### Step 4 — Copy Mapping
Review and assign copy text per slate. Fix any missing or mismatched copy.

### Step 5 — Copy & Settings
Configure language-specific overrides, output folder structure, and filename conventions. Map designs and formats to After Effects composition names.

### Step 6 — Preview Table
Review the full output table before generating. Search, filter, and toggle columns.

### Step 7 — Generate
Build the Templater CSV. Download it or export directly to Google Sheets.

### Step 8 — Orders
Review and manage Growth Portal orders:
- Update status (pending → processing → ready)
- Attach rendered video files

### Settings
- Configure API key, designs, formats
- Set rendered files path
- Manage growth lead users (name + email)
