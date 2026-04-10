// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

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
function init() {
  if (state.apiKey) {
    document.getElementById('api-key-input').value = state.apiKey;
    document.getElementById('api-key-settings').value = state.apiKey;
    updateApiStatus(true);
  }
  document.getElementById('base-path').value = state.basePath;
  document.getElementById('default-path-settings').value = state.basePath;

  // Initialize filename parts if not set
  if (!state.filenameParts) {
    state.filenameParts = JSON.parse(localStorage.getItem('af_filename_parts') || 'null')
      || ['brand','slate','actor','design','format','lang'];
  }

  syncFiltersFromDesigns();
  syncCompNames();
  addSheetRow();
  renderCopyOverrideFields();
  renderCompNameFields();
  renderDesignsList();
  renderFormatsList();
  updateFilterChips();
  updateFilterSummary();
  updatePathPreview();
  renderFilenameBuilder();

  renderSlateFilter();

  // Auto-restore clip library and footage path from proxy on reload
  loadFootagePath();
  loadClipsFromProxy();
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
function goStep(n) {
  state.currentStep = n;
  document.querySelectorAll('.step-panel').forEach((p,i) => p.classList.toggle('active', i+1===n));
  document.querySelectorAll('.nav-item').forEach((el,i) => el.classList.toggle('active', i===n-1));
  window.scrollTo({ top: 0, behavior: 'instant' });

  const titles = [
    ['Step 1 — Data Sources',    'Link your copy Google Sheet — AI fetches and parses it'],
    ['Step 2 — Clip Library',    'Scan your source folder, preview clips and assign copy per language'],
    ['Step 3 — Filters',         'Choose which slates, designs, formats and languages to include'],
    ['Step 4 — Copy Mapping',    'Review and assign copy to each slate — slates without copy are excluded from export'],
    ['Step 5 — Copy & Settings', 'Global overrides, output path and AE comp names'],
    ['Step 6 — Preview Table',   'Live view of every row that will be generated'],
    ['Step 7 — Generate',        'Generate and export your Templater-ready sheet'],
    ['Orders',                   'Incoming orders from growth leads — review, export CSV, manage status'],
    ['Settings',                 'Configure designs, formats, API key and defaults'],
    ['Admin',                    'Manage users, designs and rendered files path'],
  ];
  document.getElementById('page-title').textContent = titles[n-1]?.[0] || '';
  document.getElementById('page-sub').textContent   = titles[n-1]?.[1] || '';
  document.getElementById('btn-next').style.display = n >= 7 ? 'none' : '';

  if (n === 2) { renderClipGrid(); }
  if (n === 3) { updateFilterChips(); updateFilterSummary(); renderSlateFilter(); renderCopySelector(); }
  if (n === 4) { renderCopyMappingPage(); }
  if (n === 5) { syncCompNames(); renderCopyOverrideFields(); renderCompNameFields(); updatePathPreview(); renderFilenameBuilder(); renderFolderBuilder(); }
  if (n === 6) {
    previewRows = []; previewFiltered = [];
    const wrap = document.getElementById('preview-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="empty" style="padding:48px 20px;"><div class="empty-icon">👁</div><div class="empty-title">No preview yet</div><div class="empty-sub">Click "Refresh Preview" to build the table from your current settings.</div></div>`;
    const pag = document.getElementById('preview-pag'); if (pag) pag.innerHTML = '';
    const cnt = document.getElementById('preview-count'); if (cnt) cnt.textContent = '—';
  }
  if (n === 7) {
    syncCompNames(); updateGenSummary();
    const ps = document.getElementById('preview-section'); if (ps) ps.style.display = 'none';
    const pb = document.getElementById('preview-tbody');   if (pb) pb.innerHTML = '';
    const gp = document.getElementById('gen-progress');    if (gp) gp.style.display = 'none';
    const pf = document.getElementById('pb-fill');         if (pf) pf.style.width = '0%';
    const pv = document.getElementById('pb-val');          if (pv) pv.textContent = '0%';
    const hasRows = state.generatedRows?.length > 0;
    const csvBtn = document.getElementById('btn-export-csv'); if (csvBtn) csvBtn.disabled = !hasRows;
    const gsBtn  = document.getElementById('btn-export-gs');  if (gsBtn)  gsBtn.disabled  = !hasRows;
  }
  if (n === 8) { loadAFOrders(); }
  if (n === 9) { renderDesignsList(); renderFormatsList(); }
  if (n === 2) { loadFootagePath(); if (!state.clipLibrary.length) loadClipsFromProxy(); }
  if (n === 10) { loadAdminConfig(); loadGrowthLeadUsers(); }
}

function nextStep() {
  if (state.currentStep < 7) goStep(state.currentStep + 1);
}

// ═══════════════════════════════════════════════════════════════
//  API KEY
// ═══════════════════════════════════════════════════════════════
function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key.startsWith('sk-ant')) {
    toast('Invalid API key format', true);
    return;
  }
  state.apiKey = key;
  localStorage.setItem('af_api_key', key);
  updateApiStatus(true);
  toast('✓ API key saved');
}

function checkApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  const hint = document.getElementById('api-key-hint');
  if (!key) { hint.textContent = ''; return; }
  if (key.startsWith('sk-ant')) {
    hint.style.color = 'var(--green)';
    hint.textContent = '✓ Valid key format';
  } else {
    hint.style.color = 'var(--orange)';
    hint.textContent = 'Key should start with sk-ant-api…';
  }
}

function updateApiStatus(ok) {
  document.getElementById('api-dot').className = 'api-dot ' + (ok ? 'ok' : 'err');
  document.getElementById('api-status-text').textContent = ok ? 'Claude API ready' : 'Claude API not configured';
}

// ═══════════════════════════════════════════════════════════════
//  SHEET MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function addSheetRow() {
  const id = Date.now();
  state.sheets.push({ id, url:'', label:'', csvText:'', type:'unknown', data:null, analysisText:'', status:'idle' });
  renderSheetList();
  // Focus the new URL input
  setTimeout(() => {
    const inputs = document.querySelectorAll('.sheet-url-input');
    if (inputs.length) inputs[inputs.length-1].focus();
  }, 50);
}

function removeSheet(id) {
  state.sheets = state.sheets.filter(s => s.id !== id);
  renderSheetList();
}

function renderSheetList() {
  const el = document.getElementById('sheet-list');
  if (!state.sheets.length) { el.innerHTML = ''; return; }

  el.innerHTML = state.sheets.map(s => {
    const statusDot = s.status === 'ok'      ? 'sdot-ok'
                    : s.status === 'loading' ? 'sdot-loading'
                    : s.status === 'error'   ? 'sdot-err'
                    : 'sdot-pending';
    const statusText = s.status === 'ok'      ? 'Ready'
                     : s.status === 'loading' ? 'Fetching…'
                     : s.status === 'error'   ? 'Error'
                     : 'Not analysed';
    const typeBadge = s.type !== 'unknown'
      ? `<span class="sheet-type-badge badge-${s.type}">${s.type}</span>`
      : `<span class="sheet-type-badge badge-unknown">Not analysed</span>`;

    return `<div class="sheet-block" id="sb-${s.id}">
      <div class="sheet-block-header">
        <div style="display:flex;align-items:center;gap:8px;">
          ${typeBadge}
          ${s.data?.row_count ? `<span style="font-size:9px;color:var(--muted);">${s.data.row_count} rows</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="sheet-status">
            <div class="sdot ${statusDot}"></div>
            <span style="font-size:10px;color:var(--muted)">${statusText}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="removeSheet(${s.id})" title="Remove">✕</button>
        </div>
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px;">Label (optional)</div>
        <input type="text" placeholder="e.g. Clips — Product Usage" value="${esc(s.label||'')}"
          onchange="state.sheets.find(x=>x.id===${s.id}).label=this.value"
          style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:7px 10px;font-family:'DM Mono',monospace;font-size:11px;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
      </div>

      <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">
        <input type="text" class="sheet-url-input" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(s.url||'')}"
          onchange="state.sheets.find(x=>x.id===${s.id}).url=this.value.trim()"
          onkeydown="if(event.key==='Enter') analyseSheet(${s.id})"
          style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:8px 12px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
          onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
        <button class="btn btn-blue btn-sm" onclick="analyseSheet(${s.id})" id="btn-analyse-${s.id}">
          ${s.data ? '↻ Re-fetch' : '🔗 Connect'}
        </button>
      </div>

      ${s.analysisText ? `<div class="analysis-box" style="margin-top:10px;">${s.analysisText}</div>` : ''}
    </div>`;
  }).join('');
}

function updateSheetLabel(id, val) {
  const s = state.sheets.find(x => x.id === id);
  if (s) s.label = val;
}

function updateSheetUrl(id, url) {
  const s = state.sheets.find(x => x.id === id);
  if (s) s.url = url.trim();
}

async function analyseAllSheets() {
  if (!state.apiKey) { toast('Save your Claude API key first', true); return; }
  const targets = state.sheets.filter(s => s.url);
  if (!targets.length) { toast('Add at least one Sheet URL first', true); return; }
  for (const s of targets) await analyseSheet(s.id);
}

// ═══════════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════════
function toggleChip(el, group) {
  el.classList.toggle('sel');
  const chips = document.querySelectorAll(`#filter-${group} .chip`);
  state.filters[group] = [...chips].filter(c => c.classList.contains('sel')).map(c => c.dataset.val);
  updateFilterSummary();
  if (group === 'brand') { syncCompNames(); renderCompNameFields(); }
  if (group === 'cat') {
    // Reset slate selection to match the new category set
    const newCats = state.filters.cat;
    const scenes = SCENE_DATA.filter(s => newCats.includes(s.category));
    state.filters.slate = [...new Set(scenes.map(s => s.slate))];
    renderSlateFilter();
  }
}

function renderSlateFilter() {
  const el = document.getElementById('filter-slate');
  if (!el) return;

  // Group SCENE_DATA by category, only show selected categories
  const activeCats = state.filters.cat;
  const scenes = SCENE_DATA.filter(s => activeCats.includes(s.category));

  // On first render only (null-ish), default to all slates selected
  if (state.filters._slateInitialised !== true) {
    state.filters.slate = scenes.map(s => s.slate);
    state.filters._slateInitialised = true;
  }

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
        title="${esc(s.shot)}"
        style="${sel ? `background:rgba(0,0,0,.1);border-color:${color};color:${color};` : ''}">
        ${s.slate}${hasCopy ? '' : '<span style="color:var(--orange);margin-left:2px;">·</span>'}
      </div>`;
    }).join('');
    return `<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:6px;width:100%;">
      <span style="font-size:9px;color:${color};text-transform:uppercase;letter-spacing:.8px;width:100%;margin-bottom:2px;">${cat}</span>
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

  document.getElementById('nb-3').textContent = selectedSlates + ' slates';
}

// ═══════════════════════════════════════════════════════════════
//  COPY OVERRIDE FIELDS
// ═══════════════════════════════════════════════════════════════
function renderCopyOverrideFields() {
  document.getElementById('copy-override-fields').innerHTML = LANGS.map(lang => `
    <div class="copy-lang-item">
      <div class="copy-lang-label">${lang}</div>
      <textarea placeholder="Leave blank to use copy from sheet…"
        oninput="state.copyOverride['${lang}']=this.value">${esc(state.copyOverride[lang]||'')}</textarea>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════
//  COMP NAME FIELDS — dynamic add/remove
// ═══════════════════════════════════════════════════════════════
function renderCompNameFields() {
  const activeBrands = state.filters.brand.length ? state.filters.brand : ['Creditstar'];
  const PREFIX = { Creditstar:'CS', Monefit:'MF' };

  // Build tab UI — one section per selected brand
  const sections = activeBrands.map(brand => {
    const brandComps = state.compNames[brand] || {};
    const entries = Object.entries(brandComps);
    const color = brand === 'Creditstar' ? 'var(--orange)' : 'var(--blue)';

    const rows = entries.map(([k, v]) => `
      <div style="display:grid;grid-template-columns:9px 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px;" class="comp-row">
        <div style="width:9px;height:9px;border-radius:2px;background:var(--border2);flex-shrink:0;"></div>
        <input type="text" value="${esc(k)}"
          style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--muted2);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
          onchange="renameCompKey('${esc(brand)}','${esc(k)}',this.value)"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        <input type="text" value="${esc(v)}"
          style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
          oninput="state.compNames['${esc(brand)}']['${esc(k)}']=this.value"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        <button onclick="removeCompNameRow('${esc(brand)}','${esc(k)}')"
          style="width:26px;height:26px;border-radius:4px;background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;"
          onmouseover="this.style.borderColor='var(--orange)';this.style.color='var(--orange)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">−</button>
      </div>`).join('');

    return `
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};"></div>
          <span style="font-size:10px;font-weight:500;color:${color};text-transform:uppercase;letter-spacing:.8px;">${brand}</span>
          <span style="font-size:9px;color:var(--muted);">— prefix: TEMPLATE_${PREFIX[brand]}_</span>
        </div>
        <div style="display:grid;grid-template-columns:9px 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px;">
          <div></div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);">Key (design_format)</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);">AE Comp Name</div>
          <div></div>
        </div>
        ${rows}
      </div>`;
  }).join('<div style="height:1px;background:var(--border);margin:14px 0;"></div>');

  document.getElementById('comp-name-fields').innerHTML = sections;
}

function addCompNameRow() {
  const activeBrands = state.filters.brand.length ? state.filters.brand : ['Creditstar'];
  activeBrands.forEach(brand => {
    if (!state.compNames[brand]) state.compNames[brand] = {};
    let newKey = null;
    for (const d of state.designs) {
      for (const fmt of state.formats.map(f => f.key)) {
        const k = `${d.key}_${fmt}`;
        if (!state.compNames[brand].hasOwnProperty(k)) { newKey = k; break; }
      }
      if (newKey) break;
    }
    if (!newKey) newKey = `custom_${Date.now()}`;
    state.compNames[brand][newKey] = '';
  });
  renderCompNameFields();
}

function removeCompNameRow(brand, key) {
  if (state.compNames[brand]) delete state.compNames[brand][key];
  renderCompNameFields();
}

function renameCompKey(brand, oldKey, newKey) {
  newKey = newKey.trim();
  if (!newKey || newKey === oldKey || !state.compNames[brand]) return;
  if (state.compNames[brand][newKey] !== undefined) {
    toast('Key already exists for ' + brand, true);
    renderCompNameFields();
    return;
  }
  const val = state.compNames[brand][oldKey];
  delete state.compNames[brand][oldKey];
  state.compNames[brand][newKey] = val;
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
  return (state.folderParts||['brand','category','copyslug','actor','format'])
    .map(p => vals[p]||'').filter(Boolean).join('/');
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
  localStorage.setItem('af_folder_parts',JSON.stringify(parts));
  folderDragSrc=null;
  renderFolderBuilder();
}
function folderRemovePart(idx) {
  state.folderParts.splice(idx,1);
  localStorage.setItem('af_folder_parts',JSON.stringify(state.folderParts));
  renderFolderBuilder();
}
function folderAddPart(part) {
  if (!state.folderParts.includes(part)) {
    state.folderParts.push(part);
    localStorage.setItem('af_folder_parts',JSON.stringify(state.folderParts));
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
//  COPY SELECTOR — Step 3
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
  localStorage.setItem('af_copy_selection', JSON.stringify(state.copySelection));
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
  localStorage.setItem('af_filename_parts', JSON.stringify(parts));
  fnDragSrc = null;
  renderFilenameBuilder();
  updatePathPreview();
}
function fnRemovePart(idx) {
  state.filenameParts.splice(idx, 1);
  localStorage.setItem('af_filename_parts', JSON.stringify(state.filenameParts));
  renderFilenameBuilder();
  updatePathPreview();
}
function fnAddPart(part) {
  if (!state.filenameParts.includes(part)) {
    state.filenameParts.push(part);
    localStorage.setItem('af_filename_parts', JSON.stringify(state.filenameParts));
    renderFilenameBuilder();
    updatePathPreview();
  }
}

// ═══════════════════════════════════════════════════════════════
//  COPY MAPPING PAGE — Step 4
// ═══════════════════════════════════════════════════════════════
let copyMappingFilter = 'all'; // 'all' | 'missing'

function copyMappingFilterAll()     { copyMappingFilter = 'all';     renderCopyMappingPage(); }
function copyMappingFilterMissing() { copyMappingFilter = 'missing'; renderCopyMappingPage(); }
function copyMappingFilterCat(cat)  { const el = document.getElementById('copy-mapping-cat-filter'); if (el) { el.value = cat; renderCopyMappingPage(); } }

function renderCopyMappingPage() {
  const list = document.getElementById('copy-mapping-list');
  if (!list) return;

  const catFilter = document.getElementById('copy-mapping-cat-filter')?.value || '';
  const activeCats = state.filters.cat.length ? state.filters.cat
    : ['Product Usage','Travel and Holiday','Home Renovation','Lifestyle and Events','Electronics and Devices','Financial Relief'];

  // Get unique slates from SCENE_DATA filtered by category
  const scenes = SCENE_DATA.filter(s =>
    activeCats.includes(s.category) &&
    (!catFilter || s.category === catFilter)
  );
  // Deduplicate by slate
  const uniqueSlates = [];
  const seen = new Set();
  scenes.forEach(s => { if (!seen.has(s.slate)) { seen.add(s.slate); uniqueSlates.push(s); } });

  // Filter by missing copy if needed
  const filtered = copyMappingFilter === 'missing'
    ? uniqueSlates.filter(s => !hasCopyForSlate(s.slate))
    : uniqueSlates;

  // Update badge
  const missing = uniqueSlates.filter(s => !hasCopyForSlate(s.slate)).length;
  const nb = document.getElementById('nb-4');
  if (nb) {
    nb.textContent = missing ? `${missing} missing` : '✓ all mapped';
    nb.className   = missing ? 'nav-badge' : 'nav-badge ok';
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="empty" style="padding:48px 20px;">
      <div class="empty-icon">${copyMappingFilter === 'missing' ? '✓' : '📋'}</div>
      <div class="empty-title">${copyMappingFilter === 'missing' ? 'All slates have copy!' : 'No slates'}</div>
    </div>`;
    return;
  }

  // Group by category
  const byCat = {};
  filtered.forEach(s => {
    if (!byCat[s.category]) byCat[s.category] = [];
    byCat[s.category].push(s);
  });

  const catColors = {
    'Product Usage':'var(--accent)','Travel and Holiday':'var(--blue)',
    'Home Renovation':'var(--orange)','Lifestyle and Events':'var(--purple)',
    'Electronics and Devices':'var(--green)','Financial Relief':'var(--warn)',
  };

  list.innerHTML = Object.entries(byCat).map(([cat, slates]) => {
    const color = catColors[cat] || 'var(--muted)';
    const rows = slates.map(scene => {
      const slate = scene.slate;
      const assignments = state.copyAssignments[slate] || [];
      const selIdx = state.copySelection[slate] || 0;
      const current = assignments[Math.min(selIdx, assignments.length-1)];
      const manualKey = state.slateAssignments[slate] || '';
      const hasCopy = hasCopyForSlate(slate);

      // Current copy display
      const copyDisplay = current?.en
        ? `<div style="color:var(--green);font-size:10px;margin-top:4px;">
            <strong>EN:</strong> ${esc(current.en)}
            ${current.et ? `<span style="margin-left:8px;color:var(--muted);"><strong>ET:</strong> ${esc(current.et.slice(0,30))}…</span>` : ''}
           </div>`
        : manualKey && COPY_KEYS[manualKey]
          ? `<div style="color:var(--accent);font-size:10px;margin-top:4px;"><strong>Key:</strong> ${esc(manualKey)} — ${esc(COPY_KEYS[manualKey].en)}</div>`
          : `<div style="color:var(--orange);font-size:10px;margin-top:4px;">⚠ No copy — will be omitted from export</div>`;

      // Multiple options selector
      const multiSelect = assignments.length > 1 ? `
        <div style="margin-top:8px;">
          <div style="font-size:9px;color:var(--muted);margin-bottom:4px;">Choose copy option:</div>
          <select onchange="setCopySelection('${esc(slate)}', parseInt(this.value))"
            style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;">
            ${assignments.map((r,i) => `<option value="${i}" ${i===selIdx?'selected':''}>${esc(r.key||r.en.slice(0,40))}</option>`).join('')}
          </select>
        </div>` : '';

      // Manual key override dropdown
      const keyOptions = Object.entries(COPY_KEYS).map(([k,v]) =>
        `<option value="${esc(k)}" ${manualKey===k?'selected':''}>${esc(k)} — ${esc(v.en.slice(0,35))}</option>`
      ).join('');

      return `<div style="background:var(--s2);border:1px solid ${hasCopy ? 'var(--border)' : 'rgba(255,107,71,.3)'};border-radius:8px;padding:14px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:${color};font-weight:500;font-size:12px;">${esc(slate)}</span>
            <span style="font-size:10px;color:var(--muted2);">${esc(scene.shot)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${assignments.length > 1 ? `<span style="font-size:9px;color:var(--warn);background:rgba(251,191,36,.1);padding:2px 6px;border-radius:3px;">${assignments.length} options</span>` : ''}
            ${hasCopy ? '<span style="font-size:9px;color:var(--green);">✓</span>' : '<span style="font-size:9px;color:var(--orange);">✗ missing</span>'}
          </div>
        </div>
        ${copyDisplay}
        ${multiSelect}
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
          <div style="font-size:9px;color:var(--muted);flex-shrink:0;">Manual key override:</div>
          <select onchange="setManualCopyKey('${esc(slate)}', this.value)"
            style="flex:1;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:5px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;">
            <option value="">— use sheet copy —</option>
            ${keyOptions}
          </select>
          ${manualKey ? `<button onclick="setManualCopyKey('${esc(slate)}','')" class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:9px;">✕ clear</button>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);">${esc(cat)}</div>
      ${rows}
    </div>`;
  }).join('');
}

function hasCopyForSlate(slate) {
  // Check copyAssignments (from sheet)
  const assignments = state.copyAssignments[slate];
  if (assignments?.length) {
    const sel = state.copySelection[slate] || 0;
    const row = assignments[Math.min(sel, assignments.length-1)];
    if (row?.en) return true;
  }
  // Check manual key assignment
  const key = state.slateAssignments[slate];
  if (key && COPY_KEYS[key]?.en) return true;
  // Check getBuiltinCopy fallback (only if no sheet loaded)
  if (!Object.keys(state.copyAssignments).length) {
    const builtin = getBuiltinCopy(slate, 'Creditstar');
    if (builtin) return true;
  }
  return false;
}

function setCopySelection(slate, idx) {
  state.copySelection[slate] = idx;
  localStorage.setItem('af_copy_selection', JSON.stringify(state.copySelection));
  renderCopyMappingPage();
  renderClipGrid();
}

function setManualCopyKey(slate, key) {
  if (key) {
    state.slateAssignments[slate] = key;
  } else {
    delete state.slateAssignments[slate];
  }
  localStorage.setItem('af_slate_assignments', JSON.stringify(state.slateAssignments));
  renderCopyMappingPage();
  renderClipGrid();
  updateLibStats();
}

// ─── Omit slates with no copy from export ────────────────────
function clipHasCopy(clip, brand, lang) {
  const copy = getCopy(clip, brand, lang);
  return !!copy;
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
  toast('✓ Applied — filter chips and comp names updated');
}

function saveSettings() {
  const key  = document.getElementById('api-key-settings').value.trim();
  const path = document.getElementById('default-path-settings').value.trim();
  if (key)  { state.apiKey = key; localStorage.setItem('af_api_key', key); updateApiStatus(true); }
  if (path) { state.basePath = path; localStorage.setItem('af_base_path', path); document.getElementById('base-path').value = path; }
  localStorage.setItem('af_designs', JSON.stringify(state.designs));
  localStorage.setItem('af_formats', JSON.stringify(state.formats));
  localStorage.setItem('af_comp_names', JSON.stringify(state.compNames));
  toast('✓ Settings saved');
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
  const BRANDS = ['Creditstar','Monefit'];
  const PREFIX = { Creditstar:'CS', Monefit:'MF' };

  // Format key → AE label mapping (must match exactly what's in AE)
  const FMT_LABEL = {
    '16x9':  '16x9',
    '1x1':   '1x1',
    '9x16':  '9x16',
    '4x5v1': '4x5',
    '4x5v2': '4x5',
  };

  BRANDS.forEach(brand => {
    if (!state.compNames[brand]) state.compNames[brand] = {};
    state.designs.forEach(d => {
      d.fmts.forEach(fmt => {
        const key = `${d.key}_${fmt}`;
        // Always overwrite with correct format — ensures AE names stay accurate
        const shortDesign = d.key.replace('design','d');
        const fmtLabel = FMT_LABEL[fmt] || fmt;
        state.compNames[brand][key] = `TEMPLATE_${PREFIX[brand]}_${fmtLabel} ${shortDesign}`;
      });
    });
    // Remove orphaned entries
    const validKeys = new Set(state.designs.flatMap(d => d.fmts.map(f => `${d.key}_${f}`)));
    Object.keys(state.compNames[brand]).forEach(k => { if (!validKeys.has(k)) delete state.compNames[brand][k]; });
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

function getBuiltinCopy(slate, brand) {
  const map = {
    PU1:  {Creditstar:'Money in minutes',       Monefit:'Small investment, big potential'},
    PU2:  {Creditstar:'Apply today, relax tomorrow', Monefit:''},
    PU3:  {Creditstar:'Loans. Interesting.',    Monefit:''},
    PU4:  {Creditstar:'Loans effort-free',      Monefit:''},
    PU6:  {Creditstar:'Loans on tap',           Monefit:'Investing on tap'},
    PU7:  {Creditstar:'Tap. Apply. Done.',      Monefit:'Tap to invest'},
    PU8:  {Creditstar:'Tap. Apply. Done.',      Monefit:'Tap to invest'},
    PU10: {Creditstar:'Loans on tap',           Monefit:'Investing on tap'},
    PU12: {Creditstar:'Borrow easy',            Monefit:''},
    PU13: {Creditstar:'Borrow easy',            Monefit:''},
  };
  return map[slate]?.[brand] || '';
}

// ═══════════════════════════════════════════════════════════════
//  KEYBOARD & EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════
// Keyboard: Escape closes modal, arrow keys navigate
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft')  modalNav(-1);
  if (e.key === 'ArrowRight') modalNav(1);
});

// Click outside modal to close
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── START ──
init();
