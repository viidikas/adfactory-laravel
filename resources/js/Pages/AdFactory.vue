<template>
  <div>
    <div class="app">

      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-text">AD<span>.</span>FACTORY</div>
          <div class="logo-version">v4 &middot; AI-powered</div>
        </div>

        <nav class="nav">
          <div class="nav-section">Workflow</div>
          <div class="nav-item active" @click="goStep(1)" id="nav-1">
            <span class="ni">&#9312;</span> Data Sources
            <span class="nav-badge" id="nb-1">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(2)" id="nav-2">
            <span class="ni">&#9313;</span> Clip Library
            <span class="nav-badge" id="nb-2">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(3)" id="nav-3">
            <span class="ni">&#9314;</span> Filters
            <span class="nav-badge" id="nb-3">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(4)" id="nav-4">
            <span class="ni">&#9315;</span> Copy Mapping
            <span class="nav-badge" id="nb-4">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(5)" id="nav-5">
            <span class="ni">&#9316;</span> Copy &amp; Settings
            <span class="nav-badge" id="nb-5">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(6)" id="nav-6">
            <span class="ni">&#9317;</span> Preview Table
            <span class="nav-badge" id="nb-6">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(7)" id="nav-7">
            <span class="ni">&#9318;</span> Generate
            <span class="nav-badge" id="nb-7">&mdash;</span>
          </div>
          <div class="nav-item" @click="goStep(8)" id="nav-8">
            <span class="ni">&#128203;</span> Orders
            <span class="nav-badge" id="nb-8">&mdash;</span>
          </div>

          <div class="nav-section" style="margin-top:8px;">Config</div>
          <div class="nav-item" @click="goStep(9)" id="nav-9">
            <span class="ni">&#9881;</span> Settings
          </div>
          <div class="nav-item" @click="goStep(10)" id="nav-10">
            <span class="ni">&#128101;</span> Admin
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="api-status">
            <div class="api-dot" id="api-dot"></div>
            <span id="api-status-text">Claude API not configured</span>
          </div>
          <button class="logout-btn" @click="logout()">Sign out</button>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="main">
        <div class="topbar">
          <div>
            <div class="page-title" id="page-title">Step 1 &mdash; Data Sources</div>
            <div class="page-sub" id="page-sub">Paste your Google Sheets URLs &mdash; AI will read and interpret them</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div id="topbar-status" style="font-size:10px;color:var(--muted);"></div>
            <button class="btn btn-primary btn-sm" @click="nextStep()" id="btn-next">Next &rarr;</button>
          </div>
        </div>

        <div class="content" ref="contentArea"></div>
      </div>
    </div>

    <div id="toast"></div>
    <div id="modal-overlay" class="modal-overlay hidden"></div>
  </div>
</template>

<script>
import { router } from '@inertiajs/vue3';

export default {
  name: 'AdFactory',
  mounted() {
    // Inject the HTML content area with all step panels
    this.$refs.contentArea.innerHTML = this.getContentHTML();

    // Load CSS
    this.loadCSS();

    // Load scripts in dependency order
    const scripts = [
      '/adfactory-js/constants.js',
      '/adfactory-js/state.js',
      '/adfactory-js/clips.js',
      '/adfactory-js/copy.js',
      '/adfactory-js/generate.js',
      '/adfactory-js/admin.js',
      '/adfactory-js/main.js',
    ];

    this.loadScriptsSequential(scripts, 0);
  },
  methods: {
    goStep(n) {
      if (typeof window.goStep === 'function') window.goStep(n);
    },
    nextStep() {
      if (typeof window.nextStep === 'function') window.nextStep();
    },
    logout() {
      router.post('/logout');
    },
    loadCSS() {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/adfactory-css/adfactory.css';
      document.head.appendChild(link);
    },
    loadScriptsSequential(scripts, index) {
      if (index >= scripts.length) return;
      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => this.loadScriptsSequential(scripts, index + 1);
      document.body.appendChild(script);
    },
    getContentHTML() {
      return `
    <!-- STEP 1 — DATA SOURCES -->
    <div class="step-panel active" id="step-1">
      <div class="card card-accent">
        <div class="card-title">&#128273; Claude API Key</div>
        <div class="card-sub">Required for AI to read and interpret your Google Sheets. Your key is stored locally only.</div>
        <div class="input-group">
          <div class="input-row" style="margin:0;">
            <input type="password" id="api-key-input" placeholder="sk-ant-api03-..." oninput="checkApiKey()">
          </div>
          <button class="btn btn-secondary" onclick="saveApiKey()">Save</button>
        </div>
        <div id="api-key-hint" class="input-hint" style="margin-top:6px;"></div>
      </div>
      <div class="card">
        <div class="card-title">&#128202; Google Sheets</div>
        <div class="card-sub">Paste Google Sheets URLs below. Sheets must be set to <strong style="color:var(--text)">General access &rarr; Anyone with the link</strong>.</div>
        <div id="sheet-list"></div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-secondary btn-sm" onclick="addSheetRow()">+ Add Sheet</button>
          <button class="btn btn-primary btn-sm" onclick="analyseAllSheets()">&#129302; Analyse All</button>
        </div>
      </div>
      <div class="card" id="analysis-card" style="display:none;">
        <div class="card-title">&#129302; AI Analysis Results</div>
        <div class="card-sub">What Claude found in your sheets</div>
        <div id="analysis-results"></div>
      </div>
    </div>

    <!-- STEP 2 — CLIP LIBRARY -->
    <div class="step-panel" id="step-2">
      <div class="card card-accent">
        <div class="card-title">&#128194; Footage Source</div>
        <div class="card-sub">Enter the absolute path to your source footage folder. Then click "Scan Folder" to browse and index files.<br><br><strong style="color:var(--warn);">Note:</strong> Scanning requires Chrome or Edge.</div>
        <div class="input-row" style="margin-bottom:12px;">
          <label>Footage path</label>
          <input type="text" id="footage-base-path" placeholder="/Users/.../03_Exports/02_Graded_Masters" onchange="saveFootagePath(this.value)">
        </div>
        <div class="btn-row" style="margin-top:0;">
          <button class="btn btn-primary" onclick="scanFolder()">&#128269; Scan Folder</button>
          <button class="btn btn-secondary" onclick="clearLibrary()" id="btn-clear-lib" style="display:none;">&#10005; Clear Library</button>
        </div>
      </div>
      <div id="lib-stats-bar" style="display:none;" class="lib-stats">
        <div class="lib-stat"><div class="lib-stat-dot" style="background:var(--green);"></div><span id="stat-matched">0 matched</span></div>
        <div class="lib-stat"><div class="lib-stat-dot" style="background:var(--warn);"></div><span id="stat-partial">0 partial copy</span></div>
        <div class="lib-stat"><div class="lib-stat-dot" style="background:var(--orange);"></div><span id="stat-unmatched">0 unmatched</span></div>
        <div class="lib-stat" style="margin-left:auto;"><span id="stat-total" style="color:var(--muted);">0 clips total</span></div>
      </div>
      <div class="lib-toolbar" id="lib-toolbar" style="display:none;">
        <input type="text" id="lib-search" placeholder="Search clips..." oninput="renderClipGrid()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:200px;">
        <select id="lib-filter-status" onchange="renderClipGrid()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;">
          <option value="">All clips</option><option value="matched">Matched</option><option value="partial">Partial copy</option><option value="unmatched">Unmatched</option>
        </select>
        <select id="lib-filter-cat" onchange="renderClipGrid()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;">
          <option value="">All categories</option><option value="Product Usage">Product Usage</option><option value="Travel and Holiday">Travel and Holiday</option><option value="Home Renovation">Home Renovation</option><option value="Lifestyle and Events">Lifestyle and Events</option><option value="Electronics and Devices">Electronics and Devices</option><option value="Financial Relief">Financial Relief</option>
        </select>
        <span id="lib-grid-count" style="font-size:10px;color:var(--muted);margin-left:4px;"></span>
      </div>
      <div id="clip-grid" class="clip-grid"></div>
      <div id="lib-empty" class="empty" style="display:none;"><div class="empty-icon">&#128269;</div><div class="empty-title">No clips match</div><div class="empty-sub">Try clearing the search or filter.</div></div>
    </div>

    <!-- STEP 3 — FILTERS -->
    <div class="step-panel" id="step-3">
      <div class="card card-blue"><div class="card-title">&#127919; Production Filters</div><div class="card-sub">Select what you want to generate.</div></div>
      <div class="filters-grid">
        <div class="filter-group"><div class="filter-group-title">Brand</div><div class="chip-grid" id="filter-brand"><div class="chip sel" data-val="Creditstar" onclick="toggleChip(this,'brand')">Creditstar</div><div class="chip" data-val="Monefit" onclick="toggleChip(this,'brand')">Monefit</div></div></div>
        <div class="filter-group"><div class="filter-group-title">Language</div><div class="chip-grid" id="filter-lang"><div class="chip sel" data-val="EN" onclick="toggleChip(this,'lang')">EN</div><div class="chip" data-val="ET" onclick="toggleChip(this,'lang')">ET</div><div class="chip" data-val="DE" onclick="toggleChip(this,'lang')">DE</div><div class="chip" data-val="FR" onclick="toggleChip(this,'lang')">FR</div><div class="chip" data-val="ES" onclick="toggleChip(this,'lang')">ES</div></div></div>
        <div class="filter-group" style="grid-column:1/-1;"><div class="filter-group-title">Category</div><div class="chip-grid" id="filter-cat"><div class="chip sel" data-val="Product Usage" onclick="toggleChip(this,'cat')">Product Usage</div><div class="chip sel" data-val="Travel and Holiday" onclick="toggleChip(this,'cat')">Travel and Holiday</div><div class="chip sel" data-val="Home Renovation" onclick="toggleChip(this,'cat')">Home Renovation</div><div class="chip sel" data-val="Lifestyle and Events" onclick="toggleChip(this,'cat')">Lifestyle and Events</div><div class="chip sel" data-val="Electronics and Devices" onclick="toggleChip(this,'cat')">Electronics and Devices</div><div class="chip sel" data-val="Financial Relief" onclick="toggleChip(this,'cat')">Financial Relief</div></div></div>
        <div class="filter-group" style="grid-column:1/-1;"><div class="filter-group-title">Slates <button class="btn btn-ghost btn-sm" style="margin-left:8px;padding:2px 8px;font-size:9px;" onclick="toggleAllSlates(true)">All</button><button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:9px;" onclick="toggleAllSlates(false)">None</button></div><div id="filter-slate" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div></div>
        <div class="filter-group"><div class="filter-group-title">Designs</div><div class="chip-grid" id="filter-design"></div></div>
        <div class="filter-group"><div class="filter-group-title">Formats</div><div class="chip-grid" id="filter-fmt"></div></div>
      </div>
      <div class="card"><div class="card-title">&#128203; Filter Summary</div><div id="filter-summary" style="font-size:11px;color:var(--muted);line-height:1.9;"></div></div>
      <div class="card card-blue" id="copy-selector-card" style="display:none;"><div class="card-title">&#9997;&#65039; Copy Selection</div><div class="card-sub">Some slates have multiple copy options. Select which one to use.</div><div id="copy-selector-list"></div></div>
    </div>

    <!-- STEP 4 — COPY MAPPING -->
    <div class="step-panel" id="step-4">
      <div class="card card-accent">
        <div class="card-title">&#9997;&#65039; Copy Mapping</div>
        <div class="card-sub">Slates with no copy are omitted from export. Assign or override copy here.</div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="btn btn-secondary btn-sm" onclick="copyMappingFilterAll()">Show all</button>
          <button class="btn btn-secondary btn-sm" onclick="copyMappingFilterMissing()">Show missing only</button>
          <select id="copy-mapping-cat-filter" onchange="renderCopyMappingPage()" style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:5px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;">
            <option value="">All categories</option><option value="Product Usage">Product Usage</option><option value="Travel and Holiday">Travel and Holiday</option><option value="Home Renovation">Home Renovation</option><option value="Lifestyle and Events">Lifestyle and Events</option><option value="Electronics and Devices">Electronics and Devices</option><option value="Financial Relief">Financial Relief</option>
          </select>
        </div>
      </div>
      <div id="copy-mapping-list"></div>
    </div>

    <!-- STEP 5 — COPY & SETTINGS -->
    <div class="step-panel" id="step-5">
      <div class="card card-blue"><div class="card-title">&#9997;&#65039; Copy Override</div><div class="card-sub">Override per language here. Leave blank to use sheet copy.</div><div class="copy-lang-grid" id="copy-override-fields"></div></div>
      <div class="card"><div class="card-title">&#128193; Output Path</div><div class="card-sub">Set this to match Templater's Destination folder.</div><div class="input-row" style="margin-bottom:10px;"><label>Base folder</label><input type="text" id="base-path" placeholder="/path/to/output" oninput="updatePathPreview()"></div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px;">Subfolder structure &mdash; drag to reorder</div><div class="fn-builder" id="folder-builder"></div><div class="fn-part-pool" id="folder-pool"></div><div class="fn-preview" id="path-preview" style="margin-top:10px;"></div></div>
      <div class="card"><div class="card-title">&#127991;&#65039; Output Filename Convention</div><div class="card-sub">Drag parts to reorder. Parts are joined with underscores.</div><div class="fn-builder" id="fn-builder"></div><div class="fn-part-pool" id="fn-pool"></div><div class="fn-preview" id="fn-preview"></div></div>
      <div class="card"><div class="card-title">&#127908; AE Composition Names</div><div class="card-sub">Map each design + format to an exact AE comp name.</div><div id="comp-name-fields"></div><button class="btn btn-secondary btn-sm" onclick="addCompNameRow()" style="margin-top:10px;">+ Add comp</button></div>
    </div>

    <!-- STEP 6 — PREVIEW TABLE -->
    <div class="step-panel" id="step-6">
      <div class="card card-blue"><div class="card-title">&#128065; Templater Output Preview</div><div class="card-sub">Live table based on your current settings.</div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="buildPreviewTable()">&#8635; Refresh Preview</button><button class="btn btn-secondary btn-sm" onclick="togglePreviewCols()">&#8862; Columns</button><button class="btn btn-secondary btn-sm" onclick="exportPreviewCSV()">&#11015; Download CSV</button><span id="preview-row-count" style="font-size:10px;color:var(--muted);margin-left:4px;"></span></div></div>
      <div id="preview-col-toggles" style="display:none;background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:10px;">Visible columns</div><div id="col-toggle-chips" style="display:flex;flex-wrap:wrap;gap:6px;"></div></div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="text" id="preview-search" placeholder="Search any field..." oninput="filterPreviewTable()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:220px;">
        <select id="preview-filter-design" onchange="filterPreviewTable()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;"><option value="">All designs</option></select>
        <select id="preview-filter-fmt" onchange="filterPreviewTable()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;"><option value="">All formats</option></select>
        <select id="preview-filter-brand" onchange="filterPreviewTable()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;"><option value="">All brands</option><option value="Creditstar">Creditstar</option><option value="Monefit">Monefit</option></select>
        <select id="preview-filter-status" onchange="filterPreviewTable()" style="background:var(--s1);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;"><option value="">All statuses</option><option value="pending">Pending</option><option value="done">Done</option></select>
      </div>
      <div id="preview-table-wrap" class="preview-wrap"><div class="empty" style="padding:48px 20px;"><div class="empty-icon">&#128065;</div><div class="empty-title">No preview yet</div><div class="empty-sub">Click "Refresh Preview" to build the table.</div></div></div>
      <div class="pag" id="preview-pag"></div>
    </div>

    <!-- STEP 7 — GENERATE -->
    <div class="step-panel" id="step-7">
      <div class="card card-green"><div class="card-title">&#9889; Generate Templater Sheet</div><div class="card-sub" id="gen-summary">Ready to generate.</div><div class="btn-row"><button class="btn btn-primary" onclick="generateSheet()">&#9889; Generate</button><button class="btn btn-blue" onclick="exportCSV()" id="btn-export-csv" disabled>&#11015; Download CSV</button><button class="btn btn-green" onclick="exportGSheets()" id="btn-export-gs" disabled>&#8599; Open in Google Sheets</button></div></div>
      <div id="gen-progress" style="display:none;" class="progress-block"><div class="pb-row"><div class="pb-lbl">Building rows</div><div class="pb-bar"><div class="pb-fill" id="pb-fill" style="width:0%"></div></div><div class="pb-val" id="pb-val">0%</div></div></div>
      <div id="preview-section" style="display:none;"><div class="preview-wrap"><div class="preview-header"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">Output Preview</div><div class="preview-count" id="preview-count"></div></div><div class="table-scroll"><table><thead><tr><th>#</th><th>format</th><th>aef_output_name</th><th>aef_duration</th><th>trim_in</th><th>trim_out</th><th>aef_footage</th><th>format</th><th>headline</th><th>brand</th><th>disclaimer</th><th>duration_full</th><th>status</th><th>filename</th><th>output (Templater)</th></tr></thead><tbody id="preview-tbody"></tbody></table></div></div></div>
    </div>

    <!-- STEP 8 — ORDERS -->
    <div class="step-panel" id="step-8">
      <div class="card card-blue"><div class="card-title">&#128203; Growth Portal Orders</div><div class="card-sub">Incoming orders from growth leads.</div><div style="display:flex;gap:8px;margin-bottom:14px;"><button class="btn btn-secondary btn-sm" onclick="loadAFOrders()">&#8635; Refresh</button><span id="af-orders-count" style="font-size:10px;color:var(--muted);line-height:32px;"></span></div><div id="af-orders-list"></div></div>
    </div>

    <!-- STEP 9 — SETTINGS -->
    <div class="step-panel" id="step-9">
      <div class="card card-accent"><div class="card-title">&#9881; Settings</div><div class="card-sub">Configure the app.</div><div class="input-row"><label>Claude API Key</label><input type="password" id="api-key-settings" placeholder="sk-ant-api03-..."></div><div class="input-row"><label>Default Base Output Path</label><input type="text" id="default-path-settings"></div><div class="btn-row"><button class="btn btn-primary" onclick="saveSettings()">Save Settings</button><button class="btn btn-secondary" onclick="clearAll()">Reset All</button></div></div>
      <div class="card card-blue"><div class="card-title">&#127912; Designs</div><div class="card-sub">Each design is a distinct graphic package in your AE project.</div><div id="designs-list"></div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-secondary btn-sm" onclick="addDesign()">+ Add design</button><button class="btn btn-primary btn-sm" onclick="applyDesignsFormats()">&#10003; Save &amp; Apply</button></div></div>
      <div class="card"><div class="card-title">&#128208; Formats</div><div class="card-sub">All available formats.</div><div id="formats-list"></div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-secondary btn-sm" onclick="addFormat()">+ Add format</button><button class="btn btn-primary btn-sm" onclick="applyDesignsFormats()">&#10003; Save &amp; Apply</button></div></div>
    </div>

    <!-- STEP 10 — ADMIN -->
    <div class="step-panel" id="step-10">
      <div class="card card-blue"><div class="card-title">&#127912; Designs for Growth Portal</div><div class="card-sub">Each design can have sample images per aspect ratio.</div><div id="admin-designs-list" style="margin-bottom:16px;"></div>
        <div style="background:var(--s3);border:1px solid var(--border2);border-radius:8px;padding:14px;">
          <div style="font-size:10px;color:var(--muted2);font-weight:500;margin-bottom:10px;">Add new design</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><input type="text" id="new-design-key" placeholder="Key (e.g. design1)" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:160px;"><input type="text" id="new-design-label" placeholder="Label" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:180px;"></div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;"><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">16x9</div><input type="file" id="new-design-img-16x9" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">1x1</div><input type="file" id="new-design-img-1x1" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">9x16</div><input type="file" id="new-design-img-9x16" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">4x5</div><input type="file" id="new-design-img-4x5" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div></div>
          <button class="btn btn-primary btn-sm" onclick="addAdminDesign()">+ Add Design</button>
          <div id="admin-designs-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div>
        </div>
      </div>
      <div class="card card-blue"><div class="card-title">&#128194; Rendered Files Path</div><div class="card-sub">Where finished renders are placed.</div><div class="input-row" style="margin-bottom:8px;"><label>Rendered output folder</label><input type="text" id="admin-rendered-path" placeholder="/path/to/exports"></div><div class="btn-row"><button class="btn btn-primary btn-sm" onclick="saveAdminConfig()">Save</button><span id="admin-path-status" style="font-size:10px;color:var(--muted);margin-left:8px;"></span></div></div>
      <div class="card"><div class="card-title">&#128101; Growth Lead Users</div><div class="card-sub">Manage who can access the Growth Portal.</div><div id="users-list" style="margin-bottom:16px;"></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><input type="text" id="new-user-name" placeholder="Name" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:150px;"><input type="text" id="new-user-market" placeholder="Market" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:120px;"><button class="btn btn-primary btn-sm" onclick="addGrowthLead()">+ Add</button></div><div id="users-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div></div>
    </div>`;
    },
  },
};
</script>

<style>
/* Base styles are loaded from adfactory.css via the dynamic link tag */
.logout-btn {
  background: none;
  border: 1px solid var(--border, #2d333b);
  border-radius: 6px;
  color: var(--muted, #7a8399);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 8px;
  width: 100%;
}
.logout-btn:hover {
  border-color: #e8ff47;
  color: #e8ff47;
}
</style>
