// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
// Safe DOM setter — no-ops if element missing (old step badges removed)
function setEl(id, prop, val) { const e = document.getElementById(id); if (e) e[prop] = val; }

let toastT;
function toast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = (err ? 'show err' : 'show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 6000);
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
async function init() {
  // Load ALL settings from server
  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    if (cfg.templater_designs?.length) state.designs = cfg.templater_designs;
    if (cfg.templater_formats?.length) state.formats = cfg.templater_formats;
    if (cfg.templater_comp_names && Object.keys(cfg.templater_comp_names).length) state.compNames = cfg.templater_comp_names;
    migrateCompNames();
    if (cfg.base_output_path) state.basePath = cfg.base_output_path;
    if (cfg.filename_parts?.length) state.filenameParts = cfg.filename_parts;
    if (cfg.folder_parts?.length) state.folderParts = cfg.folder_parts;
    if (cfg.slate_assignments && Object.keys(cfg.slate_assignments).length) state.slateAssignments = cfg.slate_assignments;
    if (cfg.copy_selection && Object.keys(cfg.copy_selection).length) state.copySelection = cfg.copy_selection;
  } catch(e) {}

  // Load clips in background, then refresh current view
  loadClipsFromProxy().then(() => {
    loadSlateData();
    updateProjectNav();
    // Re-trigger current view's data init now that clips are loaded
    const currentView = window.location.hash.replace('#', '') || 'orders';
    if (currentView === 'generate') {
      syncFiltersFromDesigns(); updateFilterChips(); renderSlateFilter(); updateFilterSummary();
    }
    if (currentView === 'clips') renderClipGrid();
    if (currentView === 'preview' && typeof updateGenPreview === 'function') updateGenPreview();
  }).catch(() => {});

  // Load active project's designs so CSV export knows which ratios are valid per design
  if (typeof loadActiveProjectDesigns === 'function') loadActiveProjectDesigns();

  // Show version stamp
  fetch('/version.json').then(r => r.json()).then(v => {
    const el = document.getElementById('app-version');
    if (el && v.built) el.textContent = 'v' + v.built;
  }).catch(() => {});

  // Restore view from URL hash. `#markets/CODE` deep-links to a market's copies
  // page; otherwise restore a known top-level view, defaulting to orders.
  const hash = window.location.hash.replace(/^#/, '');
  const marketMatch = hash.match(/^markets\/(.+)$/);
  if (marketMatch && typeof openMarketCopiesByCode === 'function') {
    openMarketCopiesByCode(decodeURIComponent(marketMatch[1]));
  } else {
    const view = (ALL_VIEWS.includes(hash) && hash !== 'market-copies') ? hash : 'orders';
    goView(view);
  }
}

// Persist current view to URL hash
function setViewHash(view) {
  history.replaceState(null, '', '#' + view);
}

// Auto-save all mutable settings to server (debounced — runs 2s after last change)
let _autoSaveTimer = null;
function autoSaveState() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    fetch('/api/config', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        templater_designs: state.designs,
        templater_formats: state.formats,
        templater_comp_names: state.compNames,
        base_output_path: state.basePath,
        filename_parts: state.filenameParts,
        folder_parts: state.folderParts,
        slate_assignments: state.slateAssignments,
        copy_selection: state.copySelection,
      })
    }).catch(() => {});
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION — view-based
// ═══════════════════════════════════════════════════════════════
// 'market-copies' is a sub-page of Markets (reached by clicking a market row);
// it has no nav item but is listed so goView() hides it when leaving.
const ALL_VIEWS = ['orders','markets','market-copies','projects','clips','generate','preview','settings'];
const VIEW_TITLES = {
  orders:   ['Orders',          'Incoming orders from growth leads'],
  markets:  ['Markets',         'Staged market rollout + per-copy enablement'],
  projects: ['Projects',        'Manage footage projects — scan folders to index clips'],
  clips:    ['Clips',           'Browse and verify clip library'],
  generate: ['Generate',        'Configure filters, output paths, AE comp names'],
  preview:  ['Preview & Export', 'Review generation summary and export Templater CSV'],
  settings: ['Settings',        'Designs, formats, users, output configuration'],
};

function goView(view) {
  ALL_VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    const nav = document.getElementById('nav-' + v);
    if (el) el.classList.toggle('active', v === view);
    if (nav) nav.classList.toggle('active', v === view);
  });
  const t = VIEW_TITLES[view] || ['',''];
  document.getElementById('page-title').textContent = t[0];
  document.getElementById('page-sub').textContent = t[1];
  window.scrollTo({ top: 0, behavior: 'instant' });
  setViewHash(view);

  // Load data for each view
  if (view === 'orders') loadAFOrders();
  if (view === 'markets') loadAdminMarkets();
  if (view === 'projects') loadProjectCards();
  if (view === 'clips') { renderClipGrid(); loadProjects().then(updateProjectNav); }
  if (view === 'generate') {
    // Load copy lines if not yet loaded (needed for brand→slate filtering)
    if (typeof adminCopyLines !== 'undefined' && !adminCopyLines.length) {
      fetch('/api/copy-lines').then(r => r.json()).then(data => {
        if (Array.isArray(data)) adminCopyLines = data;
        renderSlateFilter(); updateFilterSummary();
      }).catch(() => {});
    }
    syncCompNames(); updateFilterChips(); updateFilterSummary(); renderSlateFilter();
    renderCompNameFields();
    // Populate input fields from persisted state
    const bp = document.getElementById('base-path'); if (bp && state.basePath) bp.value = state.basePath;
    const dps = document.getElementById('default-path-settings'); if (dps && state.basePath) dps.value = state.basePath;
    updatePathPreview(); renderFilenameBuilder(); renderFolderBuilder();
    updateCopyStatusSummary();
  }
  if (view === 'preview') {
    if (typeof updateGenPreview === 'function') updateGenPreview();
    const hasRows = state.generatedRows?.length > 0;
    const csvBtn = document.getElementById('btn-export-csv'); if (csvBtn) csvBtn.disabled = !hasRows;
    const gsBtn = document.getElementById('btn-export-gs'); if (gsBtn) gsBtn.disabled = !hasRows;
  }
  if (view === 'settings') {
    loadAdminConfig(); loadGrowthLeadUsers(); renderDesignsList(); renderFormatsList();
    // Hydrate the Output Path / Filename / AE Comp Names builders (moved from Generate view)
    const bp = document.getElementById('base-path'); if (bp && state.basePath) bp.value = state.basePath;
    renderFolderBuilder(); renderFilenameBuilder(); renderCompNameFields(); updatePathPreview();
  }
}

function updateProjectNav() {
  const nameEl = document.getElementById('nav-project-name');
  if (!nameEl) return;
  // Find active project from last loadProjects call
  fetch('/api/projects').then(r => r.json()).then(projects => {
    const active = projects.find(p => p.is_active);
    nameEl.textContent = active ? active.name : 'No active project';
    const clipBadge = document.getElementById('nb-clips');
    if (clipBadge && active) clipBadge.textContent = active.clips_count + ' clips';
  }).catch(() => {});
}

function loadProjectCards() {
  const el = document.getElementById('project-cards-list');
  if (!el) return;
  fetch('/api/projects').then(r => r.json()).then(projects => {
    if (!projects.length) {
      el.innerHTML = '<div class="empty" style="padding:40px;"><div class="empty-icon">&#128193;</div><div class="empty-title">No projects yet</div><div class="empty-sub">Create one below to get started</div></div>';
      return;
    }
    el.innerHTML = projects.map(p => `
      <div class="card" style="margin-bottom:10px;${p.is_active?'border-color:var(--accent);':''}">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;">${esc(p.name)}${p.is_active?' <span style="font-size:9px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-left:6px;">Active</span>':''}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px;">${p.clips_count} clips${p.scanned_at ? ' · Scanned '+new Date(p.scanned_at).toLocaleDateString() : ' · Not scanned'}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="scanProject(${p.id})">Scan</button>
            ${p.is_active?'':`<button class="btn btn-primary btn-sm" onclick="activateProject(${p.id})">Activate</button>`}
            <button class="btn btn-ghost btn-sm" style="color:var(--orange);" onclick="deleteProject(${p.id},'${esc(p.name)}')">Delete</button>
          </div>
        </div>
      </div>`).join('');
  }).catch(() => { el.innerHTML = '<div style="color:var(--orange);font-size:10px;">Could not load projects</div>'; });
}

function scanActiveProject() {
  fetch('/api/projects').then(r => r.json()).then(projects => {
    const active = projects.find(p => p.is_active);
    if (!active) { toast('No active project — activate one first', true); return; }
    scanProject(active.id);
  }).catch(() => toast('Could not load projects', true));
}

// Admin order status filter
let adminOrderStatusFilter = 'all';
function filterAdminOrders(status) {
  adminOrderStatusFilter = status;
  document.querySelectorAll('.status-tab').forEach(el => el.classList.toggle('active', el.textContent.toLowerCase() === status || (status === 'all' && el.textContent === 'All')));
  loadAFOrders();
}

// Legacy step navigation — maps to views for backward compat
function goStep(n) {
  const stepToView = {1:'markets', 2:'clips', 3:'generate', 4:'markets', 5:'generate', 6:'generate', 7:'generate', 8:'orders', 9:'settings', 10:'settings'};
  goView(stepToView[n] || 'orders');
}

function nextStep() {
  // Legacy — no-op in view-based navigation
}

function showSettingsTab(tab) {
  ['users','output','designs'].forEach(t => {
    const el = document.getElementById('settings-tab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  // Update tab styling
  const tabs = document.querySelectorAll('#view-settings .status-tab');
  tabs.forEach(el => el.classList.toggle('active', el.textContent.toLowerCase() === tab || (tab === 'designs' && el.textContent === 'Project Designs')));
  // Re-render builders whenever the Output tab becomes visible
  if (tab === 'output') {
    const bp = document.getElementById('base-path'); if (bp && state.basePath) bp.value = state.basePath;
    if (typeof renderFolderBuilder === 'function') renderFolderBuilder();
    if (typeof renderFilenameBuilder === 'function') renderFilenameBuilder();
    if (typeof renderCompNameFields === 'function') renderCompNameFields();
    if (typeof updatePathPreview === 'function') updatePathPreview();
  }
}

// ═══════════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════════
function toggleChip(el, group) {
  el.classList.toggle('sel');
  const chips = document.querySelectorAll(`#filter-${group} .chip`);
  state.filters[group] = [...chips].filter(c => c.classList.contains('sel')).map(c => c.dataset.val);
  updateFilterSummary();
  if (group === 'brand') { syncCompNames(); renderCompNameFields(); renderSlateFilter(); }
  if (group === 'cat') {
    // Reset slate selection to match the new category set
    const newCats = state.filters.cat;
    const scenes = SCENE_DATA.filter(s => newCats.includes(s.category));
    state.filters.slate = [...new Set(scenes.map(s => s.slate))];
    renderSlateFilter();
    updateFilterSummary();
  }
}

function renderSlateFilter() {
  const el = document.getElementById('filter-slate');
  if (!el) return;

  // Build allowed brand values from selected brands
  const selectedBrands = state.filters.brand || [];
  const allowedBrandValues = new Set();
  selectedBrands.forEach(b => {
    if (b === 'Creditstar') { allowedBrandValues.add('creditstar'); allowedBrandValues.add('credistar'); allowedBrandValues.add('either'); allowedBrandValues.add(''); }
    if (b === 'Monefit') { allowedBrandValues.add('smartsaver'); allowedBrandValues.add('monefit'); allowedBrandValues.add('either'); allowedBrandValues.add(''); }
  });

  // Get copy lines (from adminCopyLines or state.copyAssignments)
  const copyLines = (typeof adminCopyLines !== 'undefined' && adminCopyLines.length) ? adminCopyLines : [];

  // Determine which slates have copy for the selected brand(s)
  const slatesWithBrandCopy = new Set();
  const catsWithBrandCopy = new Set();
  copyLines.forEach(row => {
    const rowBrand = (row.brand || '').toLowerCase().trim();
    if (!allowedBrandValues.has(rowBrand)) return;
    const shot = (row.shot || '').trim();
    if (shot) {
      shot.split(/[\s,;]+/).forEach(s => { if (s) slatesWithBrandCopy.add(s.toUpperCase()); });
    } else if (row.category) {
      catsWithBrandCopy.add(row.category);
    }
  });

  // Filter SCENE_DATA by active categories
  const activeCats = state.filters.cat;
  let scenes = SCENE_DATA.filter(s => activeCats.includes(s.category));

  // Filter by brand: only show slates that have matching copy
  if (selectedBrands.length && copyLines.length) {
    scenes = scenes.filter(s =>
      slatesWithBrandCopy.has(s.slate) || catsWithBrandCopy.has(s.category)
    );
  }

  // If no brands selected, show no slates
  if (!selectedBrands.length) scenes = [];

  // On first render only, default to all visible slates selected
  if (state.filters._slateInitialised !== true) {
    state.filters.slate = scenes.map(s => s.slate);
    state.filters._slateInitialised = true;
  }

  // Remove stale slates from selection that are no longer visible
  const visibleSlates = new Set(scenes.map(s => s.slate));
  state.filters.slate = state.filters.slate.filter(s => visibleSlates.has(s));

  // Group by category for visual separation
  const byCat = {};
  scenes.forEach(s => {
    if (!byCat[s.category]) byCat[s.category] = [];
    if (!byCat[s.category].find(x => x.slate === s.slate)) byCat[s.category].push(s);
  });

  const catColors = {
    'Product Usage':           'var(--accent)',
    'Travel and Holiday':      'var(--blue)',
    'Home Renovation':         'var(--orange)',
    'Lifestyle and Events':    'var(--purple)',
    'Electronics and Devices': 'var(--green)',
    'Financial Relief':        'var(--warn)',
  };

  el.innerHTML = Object.entries(byCat).map(([cat, slates]) => {
    const color = catColors[cat] || 'var(--muted)';
    const chips = slates.map(s => {
      const sel = state.filters.slate.includes(s.slate);
      // Show copy indicator
      const hasCopy = !!state.copyAssignments[s.slate]?.length;
      return `<div class="chip ${sel ? 'sel' : ''}" data-val="${s.slate}"
        onclick="toggleSlateChip(this,'${s.slate}')"
        title="${esc(s.shot)}">
        ${s.slate}${hasCopy ? '' : '<span style="color:var(--orange);margin-left:2px;">·</span>'}
      </div>`;
    }).join('');
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;width:100%;">
      <span style="font-size:12px;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;width:100%;margin-bottom:4px;display:flex;align-items:center;gap:7px;"><span class="cat-dot" style="background:${color};"></span>${cat}</span>
      ${chips}
    </div>`;
  }).join('');
}

function toggleSlateChip(_el, slate) {
  const idx = state.filters.slate.indexOf(slate);
  if (idx >= 0) state.filters.slate.splice(idx, 1);
  else state.filters.slate.push(slate);
  renderSlateFilter();
  updateFilterSummary();
}

function toggleAllSlates(on) {
  const activeCats = state.filters.cat;
  const scenes = SCENE_DATA.filter(s => activeCats.includes(s.category));
  state.filters.slate = on ? [...new Set(scenes.map(s => s.slate))] : [];
  renderSlateFilter();
  updateFilterSummary();
}

function updateFilterSummary() {
  const f = state.filters;
  const designs = f.design;
  const fmtCounts = designs.reduce((acc, d) => {
    const validFmts = getDesignFmts(d).filter(fmt => f.fmt.includes(fmt));
    return acc + f.fmt.filter(fmt => validFmts.includes(fmt)).length;
  }, 0);

  // Count clips respecting slate filter — same priority as generation
  let allClips;
  if (state.clipLibrary.length) {
    allClips = state.clipLibrary.filter(c => f.cat.includes(c.category));
  } else if (state.analysedClips.length) {
    allClips = state.analysedClips.filter(c => f.cat.includes(c.category));
  } else {
    allClips = getBuiltinClips().filter(c => f.cat.includes(c.category));
  }
  const filteredClips = f.slate?.length
    ? allClips.filter(c => f.slate.includes(c.slate)).length
    : allClips.length;

  const allSlatesTotalInCat = [...new Set(SCENE_DATA.filter(s => f.cat.includes(s.category)).map(s => s.slate))];
  const totalSlatesInCat = allSlatesTotalInCat.length;
  // Count only slates that belong to selected categories (not leftover from other cats)
  const selectedSlates = f.slate?.length
    ? f.slate.filter(s => allSlatesTotalInCat.includes(s)).length
    : totalSlatesInCat;

  const variants = filteredClips * fmtCounts * f.lang.length;

  document.getElementById('filter-summary').innerHTML = `
    <div>Brands: <b style="color:var(--text)">${f.brand.join(', ') || 'none'}</b></div>
    <div>Languages: <b style="color:var(--blue)">${f.lang.join(', ') || 'none'}</b></div>
    <div>Categories: <b style="color:var(--text)">${f.cat.length} / 6 selected</b></div>
    <div>Slates: <b style="color:var(--accent)">${selectedSlates} / ${totalSlatesInCat} selected</b></div>
    <div>Designs: <b style="color:var(--purple)">${designs.join(', ') || 'none'}</b></div>
    <div>Formats: <b style="color:var(--accent)">${f.fmt.join(', ') || 'none'}</b> (${fmtCounts} total across selected designs)</div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
      Estimated output rows: <b style="color:var(--accent);font-size:14px;">${variants}</b>
      <span style="color:var(--muted)"> (${filteredClips} clips × ${fmtCounts} variants × ${f.lang.length} lang)</span>
    </div>`;

  setEl('nb-3', 'textContent', selectedSlates + ' slates');
}

// ═══════════════════════════════════════════════════════════════
//  COMP NAME FIELDS — dynamic add/remove
// ═══════════════════════════════════════════════════════════════
function renderCompNameFields() {
  migrateCompNames();
  const PREFIX = { Creditstar:'CS', Monefit:'MF' };

  const sections = COMP_BRANDS.map(brand => {
    const activeLang = state.compNameLang[brand] || 'EN';
    const brandComps = (state.compNames[brand] && state.compNames[brand][activeLang]) || {};
    const entries = Object.entries(brandComps);
    const color = brand === 'Creditstar' ? 'var(--orange)' : 'var(--blue)';

    const langTabs = COMP_LANGS.map(lg => {
      const active = lg === activeLang;
      const bg = active ? color : 'transparent';
      const fg = active ? '#0e1117' : 'var(--muted)';
      const bd = active ? color : 'var(--border)';
      return `<button type="button" onclick="setCompNameLang('${esc(brand)}','${lg}')"
        style="background:${bg};border:1px solid ${bd};color:${fg};padding:4px 10px;border-radius:5px;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;cursor:pointer;letter-spacing:.5px;transition:all .15s;">${lg}</button>`;
    }).join('');

    const rows = entries.map(([k, v]) => `
      <div style="display:grid;grid-template-columns:9px 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px;" class="comp-row">
        <div style="width:9px;height:9px;border-radius:2px;background:var(--border2);flex-shrink:0;"></div>
        <input type="text" value="${esc(k)}"
          style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--muted2);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
          onchange="renameCompKey('${esc(brand)}','${esc(k)}',this.value)"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        <input type="text" value="${esc(v)}"
          style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
          oninput="state.compNames['${esc(brand)}']['${activeLang}']['${esc(k)}']=this.value"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        <button onclick="removeCompNameRow('${esc(brand)}','${esc(k)}')"
          style="width:26px;height:26px;border-radius:4px;background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;"
          onmouseover="this.style.borderColor='var(--orange)';this.style.color='var(--orange)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">−</button>
      </div>`).join('');

    const emptyHint = entries.length ? '' : `
      <div style="font-size:10px;color:var(--muted);padding:8px 0;">No comps for ${activeLang} yet — use + Add Comp below.</div>`;

    return `
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};"></div>
          <span style="font-size:10px;font-weight:500;color:${color};text-transform:uppercase;letter-spacing:.8px;">${brand}</span>
          <span style="font-size:9px;color:var(--muted);">— prefix: TEMPLATE_${PREFIX[brand]}_</span>
          <div style="flex:1;"></div>
          <div style="display:flex;gap:4px;">${langTabs}</div>
        </div>
        <div style="display:grid;grid-template-columns:9px 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px;">
          <div></div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);">Key (design_format)</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);">AE Comp Name (${activeLang})</div>
          <div></div>
        </div>
        ${rows}
        ${emptyHint}
        <button type="button" class="btn btn-secondary btn-sm" onclick="addCompNameRow('${esc(brand)}')" style="margin-top:8px;">+ Add ${brand} ${activeLang} comp</button>
      </div>`;
  }).join('<div style="height:1px;background:var(--border);margin:14px 0;"></div>');

  document.getElementById('comp-name-fields').innerHTML = sections;
}

function setCompNameLang(brand, lang) {
  if (!COMP_LANGS.includes(lang)) return;
  state.compNameLang[brand] = lang;
  renderCompNameFields();
}

function addCompNameRow(brand) {
  migrateCompNames();
  // If called without brand (legacy button), add to whichever brand is active in filters (or both)
  const brands = brand ? [brand] : (state.filters.brand.length ? state.filters.brand : ['Creditstar']);
  brands.forEach(b => {
    const lang = state.compNameLang[b] || 'EN';
    if (!state.compNames[b][lang]) state.compNames[b][lang] = {};
    let newKey = null;
    for (const d of state.designs) {
      for (const fmt of state.formats.map(f => f.key)) {
        const k = `${d.key}_${fmt}`;
        if (!state.compNames[b][lang].hasOwnProperty(k)) { newKey = k; break; }
      }
      if (newKey) break;
    }
    if (!newKey) newKey = `custom_${Date.now()}`;
    state.compNames[b][lang][newKey] = '';
  });
  renderCompNameFields();
}

function removeCompNameRow(brand, key) {
  const lang = state.compNameLang[brand] || 'EN';
  if (state.compNames[brand] && state.compNames[brand][lang]) delete state.compNames[brand][lang][key];
  renderCompNameFields();
}

function renameCompKey(brand, oldKey, newKey) {
  newKey = newKey.trim();
  const lang = state.compNameLang[brand] || 'EN';
  const bucket = state.compNames[brand] && state.compNames[brand][lang];
  if (!newKey || newKey === oldKey || !bucket) return;
  if (bucket[newKey] !== undefined) {
    toast('Key already exists for ' + brand + ' ' + lang, true);
    renderCompNameFields();
    return;
  }
  bucket[newKey] = bucket[oldKey];
  delete bucket[oldKey];
  renderCompNameFields();
}

// ═══════════════════════════════════════════════════════════════
//  PATH PREVIEW
// ═══════════════════════════════════════════════════════════════
function updatePathPreview() {
  state.basePath = (document.getElementById('base-path')?.value || '').trim() || state.basePath;
  const exVals = { lang:'EN', brand:'Creditstar', category:'Travel_and_Holiday', slate:'TH1', design:'design1', format:'16x9', actor:'Andrey', copyslug:'Funds_for_fun' };
  const folderPath = (state.folderParts||['lang','brand','category','copyslug','actor','format'])
    .map(p => exVals[p]||p).filter(Boolean).join('/');
  const fileEx = buildOutputFilename('Creditstar','TH1','Andrey','design1','16x9','EN','Travel and Holiday');
  const el = document.getElementById('path-preview');
  if (el) el.textContent = `${state.basePath}/${folderPath}/${fileEx}.mp4`;
}

// Intelligent copy slug — up to 3 words, max 18 chars, filesystem-safe
function slugifyCopy(copy) {
  if (!copy) return '';
  const clean = copy.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/);
  let slug = '';
  let wordCount = 0;
  for (const word of words) {
    if (wordCount >= 3) break;
    const next = slug ? slug + '_' + word : word;
    if (next.length > 18) break;
    slug = next;
    wordCount++;
  }
  return slug || words[0].slice(0, 18);
}

function buildFolderPath(brand, slate, actorClean, design, fmt, lang, category, copy) {
  const catFolder = (category||'').replace(/\s+/g,'_');
  const copySlug  = slugifyCopy(copy);
  const vals = { lang, brand, category:catFolder, slate, design, format:fmt, actor:actorClean, copyslug:copySlug };
  return (state.folderParts||['brand','lang','category','copyslug','actor','design','format'])
    .map(p => (vals[p]||'').replace(/\s+/g,'_')).filter(Boolean).join('/');
}

// Folder builder drag-drop
const FOLDER_PART_LABELS = {
  lang:     { label:'Language',  example:'EN' },
  brand:    { label:'Brand',     example:'Creditstar' },
  category: { label:'Category',  example:'Travel_and_Holiday' },
  copyslug: { label:'Copy Line', example:'Funds_for_fun' },
  actor:    { label:'Actor',     example:'Andrey' },
  format:   { label:'Format',   example:'16x9' },
  slate:    { label:'Slate',     example:'TH1' },
  design:   { label:'Design',   example:'design1' },
};
let folderDragSrc = null;

function renderFolderBuilder() {
  const builder = document.getElementById('folder-builder');
  const pool    = document.getElementById('folder-pool');
  if (!builder) return;
  if (!state.folderParts) state.folderParts = ['brand','category','copyslug','actor','format'];
  const active    = state.folderParts;
  const available = Object.keys(FOLDER_PART_LABELS).filter(k => !active.includes(k));
  builder.innerHTML = active.map((part, i) => {
    const info = FOLDER_PART_LABELS[part] || { label:part };
    return `<div class="fn-part" draggable="true"
        ondragstart="folderDragStart(event,${i})"
        ondragover="folderDragOver(event,${i})"
        ondrop="folderDrop(event,${i})"
        ondragleave="folderDragLeave(event)"
        ondragend="folderDragEnd(event)">
      <span>📁</span><span style="color:var(--accent);">${esc(info.label)}</span>
      <span class="fn-part-remove" onclick="event.stopPropagation();folderRemovePart(${i})">×</span>
    </div>${i < active.length-1 ? '<span class="fn-sep">/</span>' : ''}`;
  }).join('');
  pool.innerHTML = (available.length
    ? '<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;width:100%;">Add folder level:</div>' : '') +
    available.map(part => `<div class="fn-pool-item" onclick="folderAddPart('${part}')">📁 ${esc(FOLDER_PART_LABELS[part]?.label||part)}</div>`).join('');
  updatePathPreview();
}
function folderDragStart(e,i)  { folderDragSrc=i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function folderDragOver(e,i)   { e.preventDefault(); document.querySelectorAll('#folder-builder .fn-part').forEach(el=>el.classList.remove('drag-over')); e.currentTarget.classList.add('drag-over'); }
function folderDragLeave(e)    { e.currentTarget.classList.remove('drag-over'); }
function folderDragEnd(e)      { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('#folder-builder .fn-part').forEach(el=>el.classList.remove('drag-over')); }
function folderDrop(e,targetIdx) {
  e.preventDefault();
  if (folderDragSrc===null||folderDragSrc===targetIdx) return;
  const parts=[...state.folderParts];
  const [moved]=parts.splice(folderDragSrc,1);
  parts.splice(targetIdx,0,moved);
  state.folderParts=parts;
  localStorage.setItem('af_folder_parts',JSON.stringify(parts));autoSaveState();
  folderDragSrc=null;
  renderFolderBuilder();
}
function folderRemovePart(idx) {
  state.folderParts.splice(idx,1);
  localStorage.setItem('af_folder_parts',JSON.stringify(state.folderParts));autoSaveState();
  renderFolderBuilder();
}
function folderAddPart(part) {
  if (!state.folderParts.includes(part)) {
    state.folderParts.push(part);
    localStorage.setItem('af_folder_parts',JSON.stringify(state.folderParts));autoSaveState();
    renderFolderBuilder();
  }
}

// ═══════════════════════════════════════════════════════════════
//  FILENAME CONVENTION BUILDER
// ═══════════════════════════════════════════════════════════════
const FN_PARTS_ALL = [
  { key:'brand',    label:'Brand',    example:'Creditstar' },
  { key:'slate',    label:'Slate',    example:'PU1' },
  { key:'actor',    label:'Actor',    example:'Andrey' },
  { key:'design',   label:'Design',   example:'design1' },
  { key:'format',   label:'Format',   example:'16x9' },
  { key:'lang',     label:'Lang',     example:'EN' },
  { key:'category', label:'Category', example:'ProductUsage' },
];

// Default order — stored in state

function buildOutputFilename(brand, slate, actorClean, design, fmt, lang, category, copy) {
  const catNoSpaces = (category||'').replace(/\s+/g,'_');
  const copySlug    = slugifyCopy(copy);
  const partValues = {
    brand:    brand    || '',
    slate:    slate    || '',
    actor:    actorClean || '',
    design:   design   || '',
    format:   fmt      || '',
    lang:     lang     || '',
    category: catNoSpaces,
    copyslug: copySlug,
  };
  return (state.filenameParts || ['brand','slate','actor','design','format','lang'])
    .map(k => partValues[k] || '').filter(Boolean).join('_');
}

// ═══════════════════════════════════════════════════════════════
//  COPY STATUS SUMMARY (shown in Generate view)
// ═══════════════════════════════════════════════════════════════
function updateCopyStatusSummary() {
  const el = document.getElementById('copy-status-summary');
  if (!el) return;
  const allSlates = [...new Set(state.clipLibrary.map(c => c.slate).filter(Boolean))];
  const withCopy = allSlates.filter(s => state.copyAssignments[s]?.length > 0).length;
  const missing = allSlates.length - withCopy;
  if (missing > 0) {
    el.innerHTML = `<span style="color:var(--green);">${withCopy}</span> slates have copy · <span style="color:var(--orange);">${missing} missing</span> — <a href="#" onclick="event.preventDefault();goView('markets')" style="color:var(--blue);text-decoration:underline;">review in Markets</a>`;
  } else {
    el.innerHTML = `<span style="color:var(--green);">All ${withCopy} slates have copy configured</span>`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  COPY SELECTOR
// ═══════════════════════════════════════════════════════════════
function renderCopySelector() {
  const card = document.getElementById('copy-selector-card');
  const list = document.getElementById('copy-selector-list');
  if (!card || !list) return;
  const multiSlates = Object.entries(state.copyAssignments)
    .filter(([, rows]) => rows.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!multiSlates.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = multiSlates.map(([slate, rows]) => {
    const selIdx = state.copySelection[slate] || 0;
    const scene = SCENE_DATA.find(s => s.slate === slate);
    return `<div class="copy-slot">
      <div class="copy-slot-header">
        <span class="copy-slot-slate">${esc(slate)}</span>
        <span style="font-size:9px;color:var(--muted);flex:1;margin:0 10px;">${esc(scene?.shot || '')}</span>
        <span class="copy-slot-count">${rows.length} options</span>
      </div>
      ${rows.map((row, i) => `
        <div class="copy-option ${i === selIdx ? 'active' : ''}" onclick="selectCopyOption('${esc(slate)}',${i})">
          <div class="copy-option-radio"></div>
          <div class="copy-option-text">
            <div class="copy-option-key">${esc(row.key||'—')}${row.brand ? ' · '+esc(row.brand) : ''}${row.category ? ' · '+esc(row.category) : ''}</div>
            <div><strong style="color:var(--muted);">EN</strong> ${esc(row.en||'—')}</div>
            ${row.et ? `<div><strong style="color:var(--muted);">ET</strong> ${esc(row.et)}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

function selectCopyOption(slate, idx) {
  state.copySelection[slate] = idx;
  localStorage.setItem('af_copy_selection', JSON.stringify(state.copySelection));autoSaveState();
  renderCopySelector();
  renderClipGrid();
  updateLibStats();
  toast(`✓ ${slate} → option ${idx + 1} selected`);
}

// ═══════════════════════════════════════════════════════════════
//  FILENAME BUILDER — drag-drop part ordering
// ═══════════════════════════════════════════════════════════════
const FN_PART_LABELS = {
  brand:    { label:'Brand',     example:'Creditstar' },
  slate:    { label:'Slate',     example:'TH1' },
  actor:    { label:'Actor',     example:'Andrey' },
  design:   { label:'Design',   example:'design1' },
  format:   { label:'Format',   example:'16x9' },
  lang:     { label:'Language',  example:'EN' },
  category: { label:'Category',  example:'Travel_and_Holiday' },
  copyslug: { label:'Copy Line', example:'Funds_for_fun' },
};
let fnDragSrc = null;

function renderFilenameBuilder() {
  const builder = document.getElementById('fn-builder');
  const pool    = document.getElementById('fn-pool');
  const preview = document.getElementById('fn-preview');
  if (!builder) return;
  const active    = state.filenameParts;
  const available = Object.keys(FN_PART_LABELS).filter(k => !active.includes(k));
  builder.innerHTML = active.map((part, i) => {
    const info = FN_PART_LABELS[part] || { label:part };
    return `<div class="fn-part" draggable="true"
        ondragstart="fnDragStart(event,${i})"
        ondragover="fnDragOver(event,${i})"
        ondrop="fnDrop(event,${i})"
        ondragleave="fnDragLeave(event)"
        ondragend="fnDragEnd(event)">
      <span style="color:var(--accent);">${esc(info.label)}</span>
      <span class="fn-part-remove" onclick="event.stopPropagation();fnRemovePart(${i})">×</span>
    </div>${i < active.length-1 ? '<span class="fn-sep">_</span>' : ''}`;
  }).join('');
  pool.innerHTML = (available.length ? '<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;width:100%;">Add part:</div>' : '') +
    available.map(part => `<div class="fn-pool-item" onclick="fnAddPart('${part}')">${esc(FN_PART_LABELS[part]?.label||part)}</div>`).join('');
  if (preview) preview.textContent = active.map(p => FN_PART_LABELS[p]?.example || p).join('_') + '.mp4';
}

function fnDragStart(e, idx) { fnDragSrc=idx; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function fnDragOver(e, idx)  { e.preventDefault(); e.dataTransfer.dropEffect='move'; document.querySelectorAll('.fn-part').forEach(el=>el.classList.remove('drag-over')); e.currentTarget.classList.add('drag-over'); }
function fnDragLeave(e)      { e.currentTarget.classList.remove('drag-over'); }
function fnDragEnd(e)        { e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.fn-part').forEach(el=>el.classList.remove('drag-over')); }
function fnDrop(e, targetIdx) {
  e.preventDefault();
  if (fnDragSrc===null || fnDragSrc===targetIdx) return;
  const parts = [...state.filenameParts];
  const [moved] = parts.splice(fnDragSrc, 1);
  parts.splice(targetIdx, 0, moved);
  state.filenameParts = parts;
  localStorage.setItem('af_filename_parts', JSON.stringify(parts));autoSaveState();
  fnDragSrc = null;
  renderFilenameBuilder();
  updatePathPreview();
}
function fnRemovePart(idx) {
  state.filenameParts.splice(idx, 1);
  localStorage.setItem('af_filename_parts', JSON.stringify(state.filenameParts));autoSaveState();
  renderFilenameBuilder();
  updatePathPreview();
}
function fnAddPart(part) {
  if (!state.filenameParts.includes(part)) {
    state.filenameParts.push(part);
    localStorage.setItem('af_filename_parts', JSON.stringify(state.filenameParts));autoSaveState();
    renderFilenameBuilder();
    updatePathPreview();
  }
}

async function loadFootagePath() {
  // Source of truth: proxy's clips-meta endpoint. Fallback: localStorage.
  let saved = '';
  try {
    const r = await fetch('/api/clips-meta');
    if (r.ok) {
      const meta = await r.json();
      if (meta.base_path) saved = meta.base_path;
    }
  } catch(e) {}
  if (!saved) saved = localStorage.getItem('af_footage_path') || '';
  const el = document.getElementById('footage-base-path');
  if (el && saved) {
    el.value = saved;
    localStorage.setItem('af_footage_path', saved);
  }
}

function saveFootagePath(path) {
  path = (path || '').trim();
  localStorage.setItem('af_footage_path', path);
  fetch('/api/clips', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({base_path: path})
  }).then(() => toast('✓ Footage path saved'))
    .catch(() => toast('Could not save footage path', true));
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════
function applyDesignsFormats() {
  syncFiltersFromDesigns();
  syncCompNames();
  updateFilterChips();
  renderCompNameFields();
  updateFilterSummary();
  localStorage.setItem('af_designs', JSON.stringify(state.designs));
  localStorage.setItem('af_formats', JSON.stringify(state.formats));
  localStorage.setItem('af_comp_names', JSON.stringify(state.compNames));
  // Persist to server
  fetch('/api/config', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      templater_designs: state.designs,
      templater_formats: state.formats,
      templater_comp_names: state.compNames,
    })
  }).then(() => toast('✓ Saved and applied'))
    .catch(() => toast('Applied locally but could not save to server', true));
}

function saveSettings() {
  const pathEl = document.getElementById('default-path-settings');
  const path = pathEl ? pathEl.value.trim() : '';
  if (path) {
    state.basePath = path;
    localStorage.setItem('af_base_path', path);
    const bp = document.getElementById('base-path');
    if (bp) bp.value = path;
  }
  localStorage.setItem('af_designs', JSON.stringify(state.designs));
  localStorage.setItem('af_formats', JSON.stringify(state.formats));
  localStorage.setItem('af_comp_names', JSON.stringify(state.compNames));
  fetch('/api/config', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      templater_designs: state.designs,
      templater_formats: state.formats,
      templater_comp_names: state.compNames,
      base_output_path: path || state.basePath,
    })
  }).then(() => toast('✓ Settings saved'))
    .catch(() => toast('Saved locally but could not save to server', true));
}

// ═══════════════════════════════════════════════════════════════
//  SYNC helpers
// ═══════════════════════════════════════════════════════════════
function syncFiltersFromDesigns() {
  // Select all designs and all formats by default
  state.filters.design = state.designs.map(d => d.key);
  state.filters.fmt    = state.formats.map(f => f.key);
}

function syncCompNames() {
  migrateCompNames();
  const PREFIX = { Creditstar:'CS', Monefit:'MF' };

  // Format key → AE label mapping (must match exactly what's in AE)
  const FMT_LABEL = {
    '16x9':  '16x9',
    '1x1':   '1x1',
    '9x16':  '9x16',
    '4x5v1': '4x5',
    '4x5v2': '4x5',
  };

  const validKeys = new Set(state.designs.flatMap(d => d.fmts.map(f => `${d.key}_${f}`)));

  COMP_BRANDS.forEach(brand => {
    COMP_LANGS.forEach(lang => {
      if (!state.compNames[brand][lang]) state.compNames[brand][lang] = {};
      state.designs.forEach(d => {
        d.fmts.forEach(fmt => {
          const key = `${d.key}_${fmt}`;
          if (state.compNames[brand][lang][key]) return; // preserve user edits
          const shortDesign = d.key.replace('design','d');
          const fmtLabel = FMT_LABEL[fmt] || fmt;
          state.compNames[brand][lang][key] = `TEMPLATE_${PREFIX[brand]}_${fmtLabel} ${shortDesign} ${lang}`;
        });
      });
      // Remove orphaned entries (design/format deleted)
      Object.keys(state.compNames[brand][lang]).forEach(k => {
        if (!validKeys.has(k)) delete state.compNames[brand][lang][k];
      });
    });
  });
}

function updateFilterChips() {
  // Rebuild design chips
  const dc = document.getElementById('filter-design');
  if (dc) dc.innerHTML = state.designs.map(d => {
    const sel = state.filters.design.includes(d.key);
    return `<div class="chip ${sel?'sel':''}" data-val="${esc(d.key)}" onclick="toggleChip(this,'design')">${esc(d.key)}</div>`;
  }).join('');

  // Rebuild format chips
  const fc = document.getElementById('filter-fmt');
  if (fc) fc.innerHTML = state.formats.map(f => {
    const sel = state.filters.fmt.includes(f.key);
    return `<div class="chip ${sel?'sel':''}" data-val="${esc(f.key)}" onclick="toggleChip(this,'fmt')">${esc(f.label)}</div>`;
  }).join('');
}

function clearAll() {
  if (!confirm('Reset all data?')) return;
  localStorage.clear();
  location.reload();
}

// ═══════════════════════════════════════════════════════════════
//  BUILT-IN CLIP DATA (fallback when no sheets loaded)
// ═══════════════════════════════════════════════════════════════
function getBuiltinClips() {
  // Build from SCENE_DATA (all 60 shots across all 6 categories)
  // Expand each scene into one clip per actor
  const clips = [];
  SCENE_DATA.forEach(scene => {
    const actors = scene.actor_options.length ? scene.actor_options : ['Unknown'];
    actors.forEach(actor => {
      const catSlug = CATEGORY_SLUG[scene.category] || 'XX';
      const num = scene.slate.replace(/[^0-9]/g, '');
      clips.push({
        clip_id:         `${scene.slate}_${actor}`,
        slate:           scene.slate,
        category:        scene.category,
        actor,
        filename:        `${scene.category}_${num}_${actor}.mov`,
        shot_description: scene.shot,
        markets:         scene.markets,
        duration:        '',
        trim_in:         '0',
        trim_out:        '',
      });
    });
  });
  return clips;
}


// ═══════════════════════════════════════════════════════════════
//  KEYBOARD & EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════
// Keyboard: Escape closes modal, arrow keys navigate
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft')  modalNav(-1);
  if (e.key === 'ArrowRight') modalNav(1);
});

// Click outside modal to close
const _modalOverlay = document.getElementById('modal-overlay');
if (_modalOverlay) {
  _modalOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

// ── START ──
init();
