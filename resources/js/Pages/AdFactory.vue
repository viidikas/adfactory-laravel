<template>
  <div>
    <div class="app">

      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-text">AD<span>.</span>FACTORY</div>
        </div>

        <nav class="nav">
          <div class="nav-item active" id="nav-orders" @click="goView('orders')">
            <span class="ni">&#128203;</span> Orders
            <span class="nav-badge" id="nb-orders">&mdash;</span>
          </div>

          <div class="nav-section" id="nav-project-header" style="cursor:pointer;" @click="goView('projects')">
            PROJECT
            <span id="nav-project-name" style="display:block;font-size:9px;color:var(--accent);margin-top:2px;font-weight:400;"></span>
          </div>
          <div class="nav-item" id="nav-clips" @click="goView('clips')">
            <span class="ni">&#128193;</span> Clips
            <span class="nav-badge" id="nb-clips">&mdash;</span>
          </div>
          <div class="nav-item" id="nav-copy" @click="goView('copy')">
            <span class="ni">&#128221;</span> Copy
          </div>
          <div class="nav-item" id="nav-generate" @click="goView('generate')">
            <span class="ni">&#11015;</span> Generate
          </div>
          <div class="nav-item" id="nav-preview" @click="goView('preview')">
            <span class="ni">&#128065;</span> Preview
            <span class="nav-badge" id="nb-preview">&mdash;</span>
          </div>
        </nav>

        <div class="sidebar-footer">
          <button class="logout-btn" @click="logout()">Sign out</button>
          <button class="settings-btn" @click="goView('settings')">&#9881; Settings</button>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="main">
        <div class="topbar">
          <div>
            <div class="page-title" id="page-title">Orders</div>
            <div class="page-sub" id="page-sub">Incoming orders from growth leads</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div id="topbar-status" style="font-size:10px;color:var(--muted);"></div>
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
    this.$refs.contentArea.innerHTML = this.getContentHTML();
    this.loadCSS();

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
    goView(v) {
      if (typeof window.goView === 'function') window.goView(v);
    },
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
    <!-- VIEW: ORDERS (default landing) -->
    <div class="view-panel active" id="view-orders">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
        <div class="status-tabs" id="order-status-tabs">
          <span class="status-tab active" onclick="filterAdminOrders('all')">All</span>
          <span class="status-tab" onclick="filterAdminOrders('pending')">Pending</span>
          <span class="status-tab" onclick="filterAdminOrders('processing')">Processing</span>
          <span class="status-tab" onclick="filterAdminOrders('ready')">Ready</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="loadAFOrders()" style="margin-left:auto;">&#8635; Refresh</button>
        <span id="af-orders-count" style="font-size:10px;color:var(--muted);"></span>
      </div>
      <div id="af-orders-list"></div>
      <div id="af-orders-empty" class="empty" style="display:none;"><div class="empty-icon">&#128237;</div><div class="empty-title">No orders yet</div><div class="empty-sub">Orders from growth leads will appear here</div></div>
    </div>

    <!-- VIEW: PROJECTS -->
    <div class="view-panel" id="view-projects">
      <div id="project-cards-list"></div>
      <div style="background:var(--s2);border:1px solid var(--border2);border-radius:8px;padding:20px;margin-top:16px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:12px;">Create new project</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="text" id="new-project-name" placeholder="Project name" style="background:var(--s3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:180px;">
          <input type="text" id="new-project-path" placeholder="folder-name" style="background:var(--s3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:150px;">
          <button class="btn btn-primary btn-sm" onclick="createProject()">+ Create</button>
        </div>
        <div id="project-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div>
      </div>
    </div>

    <!-- VIEW: CLIPS -->
    <div class="view-panel" id="view-clips">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="scanActiveProject()">Scan / Rescan</button>
        <span id="clip-scan-info" style="font-size:10px;color:var(--muted);"></span>
        <div style="flex:1;"></div>
        <button class="btn btn-secondary btn-sm" onclick="toggleCopyFilterPanel()" id="btn-copy-filter">Filter by Copy &#9662;</button>
      </div>

      <div id="lib-copy-filter" style="display:none;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-size:10px;color:var(--muted2);text-transform:uppercase;letter-spacing:1px;">Filter by Copy</div>
          <button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:9px;" onclick="clearCopyFilter()">Clear filter</button>
        </div>
        <div id="lib-copy-cat-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>
        <div id="lib-copy-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;background:var(--s2);"></div>
      </div>
      <div id="lib-copy-active-pill" style="display:none;margin-bottom:10px;padding:8px 12px;background:rgba(232,255,71,.06);border:1px solid var(--accent);border-radius:6px;font-size:10px;align-items:center;gap:8px;"></div>

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

    <!-- VIEW: COPY -->
    <div class="view-panel" id="view-copy">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div class="card">
            <div class="card-title">&#128202; Sheet Configuration</div>
            <div class="card-sub">Copy sheet URL. Click Sync to fetch and map copy to clips.</div>
            <div id="sheet-list"></div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button class="btn btn-secondary btn-sm" onclick="addSheetRow()">+ Add Sheet</button>
              <button class="btn btn-primary btn-sm" onclick="syncCopyFromSheet()">&#8635; Sync Copy</button>
              <button class="btn btn-secondary btn-sm" onclick="analyseAllSheets()">&#129302; AI Analysis</button>
            </div>
            <div id="copy-sync-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div>
          </div>
          <div class="card" id="analysis-card" style="display:none;">
            <div class="card-title">&#129302; AI Analysis Results</div>
            <div id="analysis-results"></div>
          </div>
        </div>
        <div>
          <div class="card">
            <div class="card-title">&#128221; Copy Browser</div>
            <div class="card-sub">Verify copy-to-clip matching. Click a line to filter Clips view.</div>
            <div id="copy-browser-cat-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>
            <div id="copy-browser-list" style="max-height:500px;overflow-y:auto;"></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-title">&#9997;&#65039; Copy Mapping</div>
        <div class="card-sub">Slates with no copy are omitted from export.</div>
        <div style="display:flex;gap:8px;margin-top:4px;margin-bottom:12px;">
          <button class="btn btn-secondary btn-sm" onclick="copyMappingFilterAll()">Show all</button>
          <button class="btn btn-secondary btn-sm" onclick="copyMappingFilterMissing()">Show missing only</button>
          <select id="copy-mapping-cat-filter" onchange="renderCopyMappingPage()" style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:5px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;">
            <option value="">All categories</option><option value="Product Usage">Product Usage</option><option value="Travel and Holiday">Travel and Holiday</option><option value="Home Renovation">Home Renovation</option><option value="Lifestyle and Events">Lifestyle and Events</option><option value="Electronics and Devices">Electronics and Devices</option><option value="Financial Relief">Financial Relief</option>
          </select>
        </div>
        <div id="copy-mapping-list"></div>
      </div>
    </div>

    <!-- VIEW: GENERATE -->
    <div class="view-panel" id="view-generate">
      <div class="card">
        <div class="card-title">&#127919; Filters</div>
        <div class="filters-grid">
          <div class="filter-group"><div class="filter-group-title">Brand</div><div class="chip-grid" id="filter-brand"><div class="chip sel" data-val="Creditstar" onclick="toggleChip(this,'brand')">Creditstar</div><div class="chip" data-val="Monefit" onclick="toggleChip(this,'brand')">Monefit</div></div></div>
          <div class="filter-group"><div class="filter-group-title">Language</div><div class="chip-grid" id="filter-lang"><div class="chip sel" data-val="EN" onclick="toggleChip(this,'lang')">EN</div><div class="chip" data-val="ET" onclick="toggleChip(this,'lang')">ET</div><div class="chip" data-val="DE" onclick="toggleChip(this,'lang')">DE</div><div class="chip" data-val="FR" onclick="toggleChip(this,'lang')">FR</div><div class="chip" data-val="ES" onclick="toggleChip(this,'lang')">ES</div></div></div>
          <div class="filter-group" style="grid-column:1/-1;"><div class="filter-group-title">Category</div><div class="chip-grid" id="filter-cat"><div class="chip sel" data-val="Product Usage" onclick="toggleChip(this,'cat')">Product Usage</div><div class="chip sel" data-val="Travel and Holiday" onclick="toggleChip(this,'cat')">Travel and Holiday</div><div class="chip sel" data-val="Home Renovation" onclick="toggleChip(this,'cat')">Home Renovation</div><div class="chip sel" data-val="Lifestyle and Events" onclick="toggleChip(this,'cat')">Lifestyle and Events</div><div class="chip sel" data-val="Electronics and Devices" onclick="toggleChip(this,'cat')">Electronics and Devices</div><div class="chip sel" data-val="Financial Relief" onclick="toggleChip(this,'cat')">Financial Relief</div></div></div>
          <div class="filter-group" style="grid-column:1/-1;"><div class="filter-group-title">Slates <button class="btn btn-ghost btn-sm" style="margin-left:8px;padding:2px 8px;font-size:9px;" onclick="toggleAllSlates(true)">All</button><button class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:9px;" onclick="toggleAllSlates(false)">None</button></div><div id="filter-slate" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div></div>
          <div class="filter-group"><div class="filter-group-title">Designs</div><div class="chip-grid" id="filter-design"></div></div>
          <div class="filter-group"><div class="filter-group-title">Formats</div><div class="chip-grid" id="filter-fmt"></div></div>
        </div>
      </div>

      <div class="card"><div class="card-title">&#128203; Filter Summary</div><div id="filter-summary" style="font-size:11px;color:var(--muted);line-height:1.9;"></div></div>
      <div class="card card-blue" id="copy-selector-card" style="display:none;"><div class="card-title">&#9997;&#65039; Copy Selection</div><div class="card-sub">Some slates have multiple copy options. Select which one to use.</div><div id="copy-selector-list"></div></div>

      <div class="card"><div class="card-title">&#9997;&#65039; Copy Override</div><div class="card-sub">Override per language here. Leave blank to use sheet copy.</div><div class="copy-lang-grid" id="copy-override-fields"></div></div>

      <div class="card"><div class="card-title">&#128193; Output Path</div><div class="card-sub">Set this to match Templater's Destination folder.</div><div class="input-row" style="margin-bottom:10px;"><label>Base folder</label><input type="text" id="base-path" placeholder="/path/to/output" oninput="updatePathPreview()"></div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px;">Subfolder structure &mdash; drag to reorder</div><div class="fn-builder" id="folder-builder"></div><div class="fn-part-pool" id="folder-pool"></div><div class="fn-preview" id="path-preview" style="margin-top:10px;"></div></div>
      <div class="card"><div class="card-title">&#127991;&#65039; Filename Convention</div><div class="card-sub">Drag parts to reorder. Parts are joined with underscores.</div><div class="fn-builder" id="fn-builder"></div><div class="fn-part-pool" id="fn-pool"></div><div class="fn-preview" id="fn-preview"></div></div>
      <div class="card"><div class="card-title">&#127908; AE Composition Names</div><div class="card-sub">Map each design + format to an exact AE comp name.</div><div id="comp-name-fields"></div><button class="btn btn-secondary btn-sm" onclick="addCompNameRow()" style="margin-top:10px;">+ Add comp</button></div>

    </div>

    <!-- VIEW: PREVIEW -->
    <div class="view-panel" id="view-preview">
      <div id="gen-preview-panel" class="card" style="margin-bottom:14px;">
        <div class="card-title">Generation Summary</div>
        <div id="gen-preview-content" style="font-size:10px;color:var(--muted2);line-height:2.2;"></div>
      </div>
      <div class="card card-green"><div class="card-title">&#9889; Generate Templater Sheet</div><div class="card-sub" id="gen-summary">Ready to generate.</div><div class="btn-row"><button class="btn btn-primary" onclick="generateSheet()">&#9889; Generate</button><button class="btn btn-blue" onclick="exportCSV()" id="btn-export-csv" disabled>&#11015; Download CSV</button><button class="btn btn-green" onclick="exportGSheets()" id="btn-export-gs" disabled>&#8599; Open in Google Sheets</button></div></div>
      <div id="gen-progress" style="display:none;" class="progress-block"><div class="pb-row"><div class="pb-lbl">Building rows</div><div class="pb-bar"><div class="pb-fill" id="pb-fill" style="width:0%"></div></div><div class="pb-val" id="pb-val">0%</div></div></div>
      <div id="preview-section" style="display:none;"><div class="preview-wrap"><div class="preview-header"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">Output Preview</div><div class="preview-count" id="preview-count"></div></div><div class="table-scroll"><table><thead><tr><th>#</th><th>format</th><th>aef_output_name</th><th>aef_duration</th><th>trim_in</th><th>trim_out</th><th>aef_footage</th><th>format</th><th>headline</th><th>brand</th><th>disclaimer</th><th>duration_full</th><th>status</th><th>filename</th><th>output (Templater)</th></tr></thead><tbody id="preview-tbody"></tbody></table></div></div></div>
    </div>

    <!-- VIEW: SETTINGS -->
    <div class="view-panel" id="view-settings">
      <div style="display:flex;gap:6px;margin-bottom:20px;">
        <span class="status-tab active" onclick="showSettingsTab('users')">Users</span>
        <span class="status-tab" onclick="showSettingsTab('output')">Output</span>
        <span class="status-tab" onclick="showSettingsTab('designs')">Project Designs</span>
      </div>

      <!-- USERS TAB -->
      <div id="settings-tab-users">
        <div class="card"><div class="card-title">&#128101; Growth Lead Users</div><div class="card-sub">Manage who can access the Growth Portal.</div><div id="users-list" style="margin-bottom:16px;"></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><input type="text" id="new-user-name" placeholder="Name" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:150px;"><input type="email" id="new-user-email" placeholder="Email" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:180px;"><button class="btn btn-primary btn-sm" onclick="addGrowthLead()">+ Add</button></div><div id="users-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div></div>
      </div>

      <!-- OUTPUT TAB -->
      <div id="settings-tab-output" style="display:none;">
        <div class="card card-blue"><div class="card-title">&#127912; Designs (Templater)</div><div class="card-sub">Each design maps to an AE graphic package. Define which formats each design supports.</div><div id="designs-list"></div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-secondary btn-sm" onclick="addDesign()">+ Add design</button><button class="btn btn-primary btn-sm" onclick="applyDesignsFormats()">&#10003; Save &amp; Apply</button></div></div>
        <div class="card"><div class="card-title">&#128208; Formats</div><div class="card-sub">Available output formats (aspect ratios).</div><div id="formats-list"></div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-secondary btn-sm" onclick="addFormat()">+ Add format</button><button class="btn btn-primary btn-sm" onclick="applyDesignsFormats()">&#10003; Save &amp; Apply</button></div></div>
        <div class="card"><div class="card-title">&#128194; Rendered Files Path</div><div class="card-sub">Where finished renders are placed on the server.</div><div class="input-row" style="margin-bottom:8px;"><label>Rendered output folder</label><input type="text" id="admin-rendered-path" placeholder="/path/to/exports"></div><div class="btn-row"><button class="btn btn-primary btn-sm" onclick="saveAdminConfig()">Save</button><span id="admin-path-status" style="font-size:10px;color:var(--muted);margin-left:8px;"></span></div></div>
        <div class="card"><div class="card-title">&#9881; Defaults</div><div class="input-row"><label>Default Templater output path</label><input type="text" id="default-path-settings" placeholder="/path/to/templater/output"></div><div class="btn-row"><button class="btn btn-primary" onclick="saveSettings()">Save</button><button class="btn btn-secondary" onclick="clearAll()">Reset All</button></div></div>
      </div>

      <!-- PROJECT DESIGNS TAB -->
      <div id="settings-tab-designs" style="display:none;">
        <div class="card card-blue"><div class="card-title">&#127912; Designs for Growth Portal</div><div class="card-sub">Each design can have sample images per aspect ratio. These are shown to growth leads in the portal.</div><div id="admin-designs-list" style="margin-bottom:16px;"></div>
          <div style="background:var(--s3);border:1px solid var(--border2);border-radius:8px;padding:14px;">
            <div style="font-size:10px;color:var(--muted2);font-weight:500;margin-bottom:10px;">Add new design</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><input type="text" id="new-design-key" placeholder="Key (e.g. design1)" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:160px;"><input type="text" id="new-design-label" placeholder="Label" style="background:var(--s2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;flex:1;min-width:180px;"></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;"><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">16x9</div><input type="file" id="new-design-img-16x9" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">1x1</div><input type="file" id="new-design-img-1x1" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">9x16</div><input type="file" id="new-design-img-9x16" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div><div><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">4x5</div><input type="file" id="new-design-img-4x5" accept="image/*" style="width:100%;font-size:9px;color:var(--muted2);"></div></div>
            <button class="btn btn-primary btn-sm" onclick="addAdminDesign()">+ Add Design</button>
            <div id="admin-designs-status" style="font-size:10px;color:var(--muted);margin-top:8px;"></div>
          </div>
        </div>
      </div>
    </div>`;
    },
  },
};
</script>

<style>
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
  border-color: var(--accent, #e8ff47);
  color: var(--accent, #e8ff47);
}
.settings-btn {
  background: none;
  border: 1px solid var(--border, #2d333b);
  border-radius: 6px;
  color: var(--muted, #7a8399);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 4px;
  width: 100%;
}
.settings-btn:hover {
  border-color: var(--accent, #e8ff47);
  color: var(--accent, #e8ff47);
}
.status-tabs { display: flex; gap: 0; }
.status-tab { padding: 6px 14px; font-size: 10px; cursor: pointer; color: var(--muted2, #718096); border: 1px solid var(--border, #1f242e); border-right: none; font-family: 'DM Mono', monospace; transition: all .15s; }
.status-tab:first-child { border-radius: 5px 0 0 5px; }
.status-tab:last-child { border-radius: 0 5px 5px 0; border-right: 1px solid var(--border, #1f242e); }
.status-tab.active { background: var(--accent, #e8ff47); color: #000; border-color: var(--accent, #e8ff47); }
.status-tab:hover:not(.active) { color: var(--text, #e8eaf0); }
</style>
