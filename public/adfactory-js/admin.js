// ═══════════════════════════════════════════════════════════════
//  DESIGNS management
// ═══════════════════════════════════════════════════════════════
function renderDesignsList() {
  document.getElementById('designs-list').innerHTML = state.designs.map((d, i) => {
    const fmtCheckboxes = state.formats.map(f => {
      const checked = d.fmts.includes(f.key);
      return `<label style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;border:1px solid ${checked ? 'var(--accent)' : 'var(--border)'};background:${checked ? 'rgba(232,255,71,.08)' : 'var(--s3)'};color:${checked ? 'var(--accent)' : 'var(--muted2)'};transition:all .15s;user-select:none;">
        <input type="checkbox" ${checked ? 'checked' : ''} data-design="${i}" data-fmt="${f.key}"
          onchange="toggleDesignFmt(${i},'${f.key}',this)"
          style="display:none;">
        ${esc(f.label)}
      </label>`;
    }).join('');

    return `<div style="display:grid;grid-template-columns:8px 130px 1fr auto;gap:6px;align-items:start;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);">
      <div style="width:8px;height:8px;border-radius:2px;background:var(--border2);margin-top:8px;"></div>
      <input type="text" value="${esc(d.key)}"
        style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--muted2);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;margin-top:2px;"
        onchange="renameDesignKey(${i}, this.value)"
        onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
      <div style="display:flex;flex-wrap:wrap;gap:5px;padding-top:2px;">
        ${fmtCheckboxes}
      </div>
      <button onclick="removeDesign(${i})"
        style="width:26px;height:26px;border-radius:4px;background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:2px;"
        onmouseover="this.style.borderColor='var(--orange)';this.style.color='var(--orange)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">−</button>
    </div>`;
  }).join('');
}

function addDesign() {
  const n = state.designs.length + 1;
  state.designs.push({ key: `design${n}`, fmts: state.formats.map(f => f.key) });
  syncCompNames();
  renderDesignsList();
  syncFiltersFromDesigns();
  updateFilterChips();
  renderCompNameFields();
  toast(`✓ design${n} added`);
  if (typeof autoSaveState === 'function') autoSaveState();
}

function removeDesign(i) {
  const key = state.designs[i].key;
  state.designs.splice(i, 1);
  // Remove compNames for this design across all brands × languages
  Object.keys(state.compNames).forEach(brand => {
    const brandBucket = state.compNames[brand];
    if (!brandBucket || typeof brandBucket !== 'object') return;
    Object.keys(brandBucket).forEach(lang => {
      const langBucket = brandBucket[lang];
      if (!langBucket || typeof langBucket !== 'object') return;
      Object.keys(langBucket).forEach(k => { if (k.startsWith(key + '_')) delete langBucket[k]; });
    });
  });
  state.filters.design = state.filters.design.filter(d => d !== key);
  syncFiltersFromDesigns();
  renderDesignsList();
  updateFilterChips();
  renderCompNameFields();
  updateFilterSummary();
  if (typeof autoSaveState === 'function') autoSaveState();
}

function renameDesignKey(i, newKey) {
  newKey = newKey.trim();
  const oldKey = state.designs[i].key;
  if (!newKey || newKey === oldKey) return;
  // Rename in compNames across all brands × languages
  Object.keys(state.compNames).forEach(brand => {
    const brandBucket = state.compNames[brand];
    if (!brandBucket || typeof brandBucket !== 'object') return;
    Object.keys(brandBucket).forEach(lang => {
      const langBucket = brandBucket[lang];
      if (!langBucket || typeof langBucket !== 'object') return;
      const renames = {};
      Object.entries(langBucket).forEach(([k, v]) => {
        renames[k.startsWith(oldKey + '_') ? newKey + k.slice(oldKey.length) : k] = v;
      });
      brandBucket[lang] = renames;
    });
  });
  // Rename in filters
  state.filters.design = state.filters.design.map(d => d === oldKey ? newKey : d);
  state.designs[i].key = newKey;
  syncFiltersFromDesigns();
  updateFilterChips();
  renderCompNameFields();
}

function toggleDesignFmt(designIndex, fmtKey, checkbox) {
  const d = state.designs[designIndex];
  // Update label style live
  const label = checkbox.closest('label');
  if (checkbox.checked) {
    if (!d.fmts.includes(fmtKey)) d.fmts.push(fmtKey);
    // Maintain order based on state.formats order
    const order = state.formats.map(f => f.key);
    d.fmts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    label.style.borderColor = 'var(--accent)';
    label.style.background  = 'rgba(232,255,71,.08)';
    label.style.color       = 'var(--accent)';
  } else {
    d.fmts = d.fmts.filter(f => f !== fmtKey);
    label.style.borderColor = 'var(--border)';
    label.style.background  = 'var(--s3)';
    label.style.color       = 'var(--muted2)';
  }
  syncCompNames();
  if (typeof autoSaveState === 'function') autoSaveState();
}

// ═══════════════════════════════════════════════════════════════
//  FORMATS management
// ═══════════════════════════════════════════════════════════════
function renderFormatsList() {
  document.getElementById('formats-list').innerHTML = state.formats.map((f, i) => `
    <div style="display:grid;grid-template-columns:8px 100px 1fr auto;gap:6px;align-items:center;margin-bottom:5px;">
      <div style="width:8px;height:8px;border-radius:2px;background:var(--border2);"></div>
      <input type="text" value="${esc(f.key)}"
        style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--muted2);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
        onchange="renameFormatKey(${i}, this.value)"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
      <input type="text" value="${esc(f.label)}"
        style="background:var(--s2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 10px;font-family:'DM Mono',monospace;font-size:10px;outline:none;"
        oninput="state.formats[${i}].label=this.value; updateFilterChips();"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
      <button onclick="removeFormat(${i})"
        style="width:26px;height:26px;border-radius:4px;background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;"
        onmouseover="this.style.borderColor='var(--orange)';this.style.color='var(--orange)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">−</button>
    </div>`).join('');
}

function addFormat() {
  const n = state.formats.length + 1;
  state.formats.push({ key: `fmt${n}`, label: `Format ${n}` });
  renderFormatsList();
  renderDesignsList();  // re-render so new format checkbox appears in designs
  updateFilterChips();
  toast(`✓ Format added`);
  if (typeof autoSaveState === 'function') autoSaveState();
}

function removeFormat(i) {
  const key = state.formats[i].key;
  state.formats.splice(i, 1);
  // Remove from all designs
  state.designs.forEach(d => { d.fmts = d.fmts.filter(f => f !== key); });
  // Remove from compNames across all brands × languages
  Object.keys(state.compNames).forEach(brand => {
    const brandBucket = state.compNames[brand];
    if (!brandBucket || typeof brandBucket !== 'object') return;
    Object.keys(brandBucket).forEach(lang => {
      const langBucket = brandBucket[lang];
      if (!langBucket || typeof langBucket !== 'object') return;
      Object.keys(langBucket).forEach(k => { if (k.endsWith('_' + key)) delete langBucket[k]; });
    });
  });
  state.filters.fmt = state.filters.fmt.filter(f => f !== key);
  renderFormatsList();
  renderDesignsList();
  updateFilterChips();
  renderCompNameFields();
  if (typeof autoSaveState === 'function') autoSaveState();
}

function renameFormatKey(i, newKey) {
  newKey = newKey.trim();
  const oldKey = state.formats[i].key;
  if (!newKey || newKey === oldKey) return;
  // Rename in designs
  state.designs.forEach(d => { d.fmts = d.fmts.map(f => f === oldKey ? newKey : f); });
  // Rename in compNames across all brands × languages
  Object.keys(state.compNames).forEach(brand => {
    const brandBucket = state.compNames[brand];
    if (!brandBucket || typeof brandBucket !== 'object') return;
    Object.keys(brandBucket).forEach(lang => {
      const langBucket = brandBucket[lang];
      if (!langBucket || typeof langBucket !== 'object') return;
      const renames = {};
      Object.entries(langBucket).forEach(([k, v]) => {
        renames[k.endsWith('_' + oldKey) ? k.slice(0, -(oldKey.length)) + newKey : k] = v;
      });
      brandBucket[lang] = renames;
    });
  });
  state.filters.fmt = state.filters.fmt.map(f => f === oldKey ? newKey : f);
  state.formats[i].key = newKey;
  updateFilterChips();
  renderDesignsList();
  renderCompNameFields();
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN CONFIG (copy sheet URL + rendered path, stored in proxy)
// ═══════════════════════════════════════════════════════════════
let adminDesigns = [];
let activeProjectId = null;

// Lightweight loader for just the active project's designs. Called on init so
// buildOrderRows can filter CSV rows by which ratios actually have an image,
// even if the Settings tab hasn't been opened yet.
async function loadActiveProjectDesigns() {
  try {
    const r = await fetch('/api/projects');
    if (!r.ok) return;
    const projects = await r.json();
    const active = projects.find(p => p.is_active);
    if (active) {
      activeProjectId = active.id;
      adminDesigns = active.designs || [];
    }
  } catch (e) { /* ignore */ }
}

async function loadAdminConfig() {
  try {
    // Load rendered path from config
    const cr = await fetch('/api/config');
    if (cr.ok) {
      const cfg = await cr.json();
      const rp = document.getElementById('admin-rendered-path');
      if (rp && cfg.rendered_path) rp.value = cfg.rendered_path;
    }
    // Load designs from active project
    const pr = await fetch('/api/projects');
    if (!pr.ok) throw new Error();
    const projects = await pr.json();
    const active = projects.find(p => p.is_active);
    if (active) {
      activeProjectId = active.id;
      adminDesigns = active.designs || [];
      renderAdminDesigns(adminDesigns);
    } else {
      renderAdminDesigns([]);
    }
  } catch(e) {
    const st = document.getElementById('admin-path-status');
    if (st) st.textContent = '⚠ Could not load config';
  }
}

async function saveProjectDesigns() {
  if (!activeProjectId) { toast('No active project — activate one first', true); return false; }
  try {
    const r = await fetch(`/api/projects/${activeProjectId}/designs`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ designs: adminDesigns })
    });
    if (!r.ok) {
      const text = await r.text();
      console.error('Save designs failed:', r.status, text);
      toast(`Save failed (${r.status})`, true);
      return false;
    }
    return true;
  } catch(e) {
    console.error('Save designs error:', e);
    return false;
  }
}

function renderAdminDesigns(designs) {
  const el = document.getElementById('admin-designs-list');
  if (!el) return;

  // Group designs by brand, preserving original indices so edits target the right object.
  const groups = { Creditstar: [], Monefit: [] };
  (designs || []).forEach((d, i) => {
    const brand = d.brand || 'Creditstar';
    if (!groups[brand]) groups[brand] = [];
    groups[brand].push({ d, i });
  });

  const openState = (() => {
    try { return JSON.parse(localStorage.getItem('admin_design_accordion') || '{"Creditstar":true,"Monefit":true}'); }
    catch { return { Creditstar: true, Monefit: true }; }
  })();

  el.innerHTML = ['Creditstar', 'Monefit'].map(brand => {
    const items = groups[brand] || [];
    const open = openState[brand] !== false;
    const accent = brand === 'Monefit' ? 'var(--blue)' : 'var(--accent)';
    const badgeStyle = brand === 'Monefit'
      ? 'background:rgba(71,200,255,.15);color:var(--blue);border:1px solid rgba(71,200,255,.35);'
      : 'background:rgba(232,255,71,.15);color:var(--accent);border:1px solid rgba(232,255,71,.35);';
    const body = items.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,360px));gap:12px;">${items.map(({d, i}) => renderAdminDesignCard(d, i)).join('')}</div>`
      : `<div style="font-size:10px;color:var(--muted);padding:6px 0;">No ${brand} designs yet.</div>`;
    return `
      <div style="margin-bottom:10px;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
        <div onclick="toggleAdminDesignAccordion('${brand}')" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--s2);user-select:none;">
          <span style="font-size:10px;color:var(--muted);display:inline-block;transition:transform .2s;transform:rotate(${open?90:0}deg);">&#9654;</span>
          <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:${accent};letter-spacing:.6px;">${brand.toUpperCase()}</span>
          <span style="font-size:9px;padding:2px 7px;border-radius:3px;font-weight:600;${badgeStyle}">${items.length} design${items.length!==1?'s':''}</span>
        </div>
        <div style="display:${open?'block':'none'};padding:12px;background:var(--s1,transparent);">${body}</div>
      </div>`;
  }).join('');
}

function renderAdminDesignCard(d, i) {
  const RATIOS = ['16x9','1x1','9x16','4x5'];
  const brand = d.brand || 'Creditstar';
  const otherBrand = brand === 'Monefit' ? 'Creditstar' : 'Monefit';
  return `
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <input type="text" value="${esc(d.key||'')}" title="Key" placeholder="key"
          onchange="updateAdminDesignKey(${i}, this.value)"
          style="background:var(--s3);border:1px solid var(--border2);border-radius:4px;color:var(--accent);padding:4px 8px;font-family:'DM Mono',monospace;font-size:11px;outline:none;width:110px;">
        <input type="text" value="${esc(d.label||'')}" title="Label" placeholder="label"
          onchange="updateAdminDesignLabel(${i}, this.value)"
          style="background:var(--s3);border:1px solid var(--border2);border-radius:4px;color:var(--text);padding:4px 8px;font-size:10px;outline:none;flex:1;min-width:0;">
        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:9px;color:var(--muted);white-space:nowrap;" title="Move to ${otherBrand}" onclick="setAdminDesignBrand(${i},'${otherBrand}')">&#8644; ${esc(otherBrand)}</button>
        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:11px;color:var(--orange);" title="Remove design" onclick="removeAdminDesign(${i})">&#10005;</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
        ${RATIOS.map(ratio => {
          const img = d.images?.[ratio];
          return `<div style="text-align:center;">
            <div style="font-size:8px;color:var(--muted);margin-bottom:3px;">${ratio}</div>
            ${img
              ? `<img src="${esc(img)}" title="Click to preview" onclick="previewAdminImg('${esc(img)}')"
                    style="width:100%;border-radius:4px;border:1px solid var(--border);object-fit:cover;aspect-ratio:${ratio.replace('x','/')};cursor:zoom-in;display:block;">
                 <button onclick="replaceDesignImage(${i},'${ratio}')" title="Replace image"
                    style="margin-top:4px;width:100%;background:var(--s3);border:1px solid var(--border2);border-radius:3px;color:var(--muted);padding:3px 4px;font-size:8px;cursor:pointer;">&#8593; Replace</button>`
              : `<div onclick="replaceDesignImage(${i},'${ratio}')"
                    style="aspect-ratio:${ratio.replace('x','/')};background:var(--s3);border:1px dashed var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:var(--muted);">+ Add</div>`}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function previewAdminImg(src) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;';
  ov.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);">`;
  const close = () => { if (ov.parentNode) document.body.removeChild(ov); };
  ov.onclick = close;
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
  document.body.appendChild(ov);
}

function toggleAdminDesignAccordion(brand) {
  let s;
  try { s = JSON.parse(localStorage.getItem('admin_design_accordion') || '{}'); }
  catch { s = {}; }
  s[brand] = s[brand] === false ? true : false;
  localStorage.setItem('admin_design_accordion', JSON.stringify(s));
  renderAdminDesigns(adminDesigns);
}

async function setAdminDesignBrand(idx, brand) {
  if (!adminDesigns[idx]) return;
  adminDesigns[idx].brand = brand;
  renderAdminDesigns(adminDesigns);
  toast(`✓ Brand set to ${brand}`);
  if (!await saveProjectDesigns()) toast('Warning: could not save to server', true);
}

async function updateAdminDesignKey(idx, newKey) {
  newKey = (newKey || '').trim();
  if (!adminDesigns[idx]) return;
  if (!newKey) { toast('Key cannot be empty', true); renderAdminDesigns(adminDesigns); return; }
  if (newKey === adminDesigns[idx].key) return;
  if (adminDesigns.some((d, i) => i !== idx && (d.key || d) === newKey)) {
    toast('Design key already exists', true);
    renderAdminDesigns(adminDesigns);
    return;
  }
  adminDesigns[idx].key = newKey;
  toast(`✓ Key updated to "${newKey}"`);
  if (!await saveProjectDesigns()) toast('Warning: could not save to server', true);
}

async function updateAdminDesignLabel(idx, newLabel) {
  if (!adminDesigns[idx]) return;
  const trimmed = (newLabel || '').trim();
  if (trimmed === (adminDesigns[idx].label || '')) return;
  adminDesigns[idx].label = trimmed;
  if (!await saveProjectDesigns()) toast('Warning: could not save to server', true);
}

async function addAdminDesign() {
  const key   = document.getElementById('new-design-key').value.trim();
  const label = document.getElementById('new-design-label').value.trim();
  const brandEl = document.querySelector('input[name="new-design-brand"]:checked');
  const brand = brandEl ? brandEl.value : 'Creditstar';
  if (!key) { toast('Enter a design key (e.g. design1)', true); return; }
  if (adminDesigns.find(d => (d.key||d) === key)) { toast('Design key already exists', true); return; }

  const RATIOS = ['16x9','1x1','9x16','4x5'];
  const images = {};
  for (const ratio of RATIOS) {
    const inp = document.getElementById(`new-design-img-${ratio}`);
    if (inp?.files?.[0]) {
      const url = await uploadDesignImageFile(inp.files[0]);
      if (url) images[ratio] = url;
    }
  }

  adminDesigns.push({ key, label, brand, images });
  renderAdminDesigns(adminDesigns);

  // Clear inputs
  document.getElementById('new-design-key').value = '';
  document.getElementById('new-design-label').value = '';
  const csRadio = document.querySelector('input[name="new-design-brand"][value="Creditstar"]');
  if (csRadio) csRadio.checked = true;
  RATIOS.forEach(r => {
    const inp = document.getElementById(`new-design-img-${r}`);
    if (inp) inp.value = '';
  });

  toast(`✓ Design "${key}" added (${brand})`);
  if (!await saveProjectDesigns()) toast('Warning: could not save to server', true);
}

async function replaceDesignImage(designIdx, ratio) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files?.[0]) return;
    if (!adminDesigns[designIdx]) return;
    const url = await uploadDesignImageFile(input.files[0]);
    if (!url) return;
    const prevUrl = adminDesigns[designIdx].images?.[ratio];
    if (!adminDesigns[designIdx].images) adminDesigns[designIdx].images = {};
    adminDesigns[designIdx].images[ratio] = url;
    renderAdminDesigns(adminDesigns);
    toast(`✓ ${ratio} image updated`);
    if (!await saveProjectDesigns()) toast('Warning: could not save to server', true);
    else if (prevUrl && prevUrl !== url) deleteDesignImage(prevUrl);
  };
  input.click();
}

// Upload a single image file to the active project; returns the public URL or null.
async function uploadDesignImageFile(file) {
  if (!activeProjectId) { toast('No active project', true); return null; }
  const fd = new FormData();
  fd.append('image', file);
  try {
    const r = await fetch(`/api/projects/${activeProjectId}/designs/upload`, { method: 'POST', body: fd });
    if (!r.ok) {
      const text = await r.text();
      console.error('Upload failed:', r.status, text);
      toast(`Upload failed (${r.status})`, true);
      return null;
    }
    const j = await r.json();
    return j.url || null;
  } catch (e) {
    console.error('Upload error:', e);
    toast('Upload error', true);
    return null;
  }
}

// Remove a previously-uploaded file from the server. Best-effort; ignores failures.
async function deleteDesignImage(url) {
  if (!activeProjectId || !url || !url.startsWith('/storage/')) return;
  try {
    await fetch(`/api/projects/${activeProjectId}/designs/image`, {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ url })
    });
  } catch (e) { /* ignore */ }
}

async function removeAdminDesign(idx) {
  const removed = adminDesigns[idx];
  adminDesigns.splice(idx, 1);
  renderAdminDesigns(adminDesigns);
  toast('✓ Design removed');
  if (!await saveProjectDesigns()) {
    toast('Warning: could not save to server', true);
    return;
  }
  // Clean up the files that backed the removed design's images.
  if (removed && removed.images) {
    Object.values(removed.images).forEach(url => deleteDesignImage(url));
  }
}

async function saveAdminConfig() {
  const renderedPath = document.getElementById('admin-rendered-path')?.value.trim() || '';
  try {
    const r   = await fetch('/api/config');
    const existing = r.ok ? await r.json() : {};
    const res = await fetch('/api/config', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({...existing, rendered_path:renderedPath}),
    });
    if (!res.ok) throw new Error();
    const st = document.getElementById('admin-path-status');
    if (st) { st.textContent='✓ Saved'; setTimeout(()=>{if(st)st.textContent='';},3000); }
    toast('✓ Admin config saved');
  } catch(e) { toast('⚠ Could not save — server error', true); }
}

// ═══════════════════════════════════════════════════════════════
//  GROWTH LEAD USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════
async function loadGrowthLeadUsers() {
  const list   = document.getElementById('users-list');
  const status = document.getElementById('users-status');
  if (!list) return;
  try {
    const r     = await fetch('/api/users');
    if (!r.ok) throw new Error('Server error');
    const users = await r.json();
    const leads = users.filter(u => u.role === 'growth_lead');
    if (!leads.length) {
      list.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:8px 0;">No growth leads added yet.</div>';
      return;
    }
    list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead><tr>
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Name</th>
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Email</th>
      </tr></thead>
      <tbody>${leads.map(u => `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px 10px;color:var(--text);">${esc(u.name)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(u.email||'—')}</td>
      </tr>`).join('')}</tbody>
    </table>`;
    if (status) status.textContent = '';
  } catch(e) {
    list.innerHTML = '';
    if (status) status.textContent = '⚠ Could not load users';
  }
}

async function addGrowthLead() {
  const name   = document.getElementById('new-user-name').value.trim();
  const email  = document.getElementById('new-user-email').value.trim();
  const status = document.getElementById('users-status');
  if (!name) { toast('Enter a name', true); return; }
  if (!email) { toast('Enter an email', true); return; }
  try {
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, email, role:'growth_lead'}),
    });
    if (!r.ok) throw new Error('Server error');
    document.getElementById('new-user-name').value  = '';
    document.getElementById('new-user-email').value = '';
    toast(`✓ ${name} added — they can now log into the Growth Portal`);
    loadGrowthLeadUsers();
  } catch(e) {
    if (status) status.textContent = '⚠ Could not add user';
    toast('Failed to add user', true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GROWTH PORTAL ORDERS — AD.FACTORY step 9
// ═══════════════════════════════════════════════════════════════

let _afOrdersCache = [];

async function loadAFOrders() {
  const list = document.getElementById('af-orders-list');
  const count = document.getElementById('af-orders-count');
  if (!list) return;
  try {
    const r = await fetch('/api/orders');
    if (!r.ok) throw new Error('Server error');
    const orders = await r.json();
    _afOrdersCache = orders.slice().reverse();
    if (count) count.textContent = `${orders.length} order${orders.length!==1?'s':''}`;
    renderAFOrders(_afOrdersCache);
  } catch(e) {
    list.innerHTML = '<div style="font-size:10px;color:var(--orange);padding:10px;">Could not load orders — server error</div>';
  }
}

function renderAFOrders(orders) {
  const list = document.getElementById('af-orders-list');
  const empty = document.getElementById('af-orders-empty');

  // Apply status filter if set
  const sf = (typeof adminOrderStatusFilter !== 'undefined') ? adminOrderStatusFilter : 'all';
  if (sf && sf !== 'all') orders = orders.filter(o => o.status === sf);

  if (!orders.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = orders.map(o => {
    const date = new Date(o.created*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const statusColors = {'pending':'var(--warn)','processing':'var(--blue)','ready':'var(--green)'};
    const statusLabel = {'pending':'Pending','processing':'Processing','ready':'Ready'}[o.status]||o.status;
    const sColor = statusColors[o.status] || 'var(--muted)';
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden;" id="afo-${esc(o.id)}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;transition:background .15s;" onclick="toggleAFOrder('${esc(o.id)}')"
        onmouseover="this.style.background='rgba(255,255,255,.02)'" onmouseout="this.style.background='transparent'">
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="afchev-${esc(o.id)}" style="transition:transform .2s;display:inline-block;font-size:12px;color:var(--muted);">&#9654;</span>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">
              <span style="font-size:9px;padding:2px 6px;border-radius:3px;margin-right:6px;${o.brand==='Monefit'?'background:rgba(71,200,255,.15);color:var(--blue);':'background:rgba(232,255,71,.15);color:var(--accent);'}">${o.brand==='Monefit'?'MF':'CS'}</span>
              ${esc(o.user_name)} ${o.market?'&middot; '+esc(o.market):''}
            </div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">${esc(o.id)} &middot; ${date} &middot; ${o.items.length} clip${o.items.length!==1?'s':''}</div>
            ${o.note ? `<div style="font-size:10px;color:var(--muted2);margin-top:3px;">${esc(o.note)}</div>` : ''}
          </div>
        </div>
        <span style="font-size:9px;padding:3px 8px;border-radius:4px;font-weight:500;text-transform:uppercase;letter-spacing:.5px;color:${sColor};background:${sColor}1e;">${esc(statusLabel)}</span>
      </div>
      <div class="hidden" id="afod-${esc(o.id)}" style="padding:0 18px 18px;border-top:1px solid var(--border);"></div>
    </div>`;
  }).join('');
}

function toggleAFOrder(oid) {
  const detail = document.getElementById('afod-' + oid);
  const chev   = document.getElementById('afchev-' + oid);
  if (!detail) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden');
  if (chev) chev.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
  if (isHidden && !detail.dataset.rendered) {
    const order = _afOrdersCache.find(o => o.id === oid);
    if (order) {
      detail.innerHTML = renderAFOrderDetail(order);
      detail.dataset.rendered = '1';
    }
  }
}

// ── Order preview table — same concept as step 6 preview table ──

const ORDER_COLS = [
  { key:'line_nr',     label:'#',           w:40  },
  { key:'target',      label:'Target Comp', w:160 },
  { key:'output',      label:'Output Path', w:300 },
  { key:'aef_footage', label:'Footage',     w:200 },
  { key:'design',      label:'Design',      w:80  },
  { key:'format',      label:'Format',      w:60  },
  { key:'lang',        label:'Lang',        w:50  },
  { key:'brand',       label:'Brand',       w:90  },
  { key:'headline',    label:'Copy',        w:220 },
  { key:'slate',       label:'Slate',       w:60  },
  { key:'actor',       label:'Actor',       w:100 },
  { key:'category',    label:'Category',    w:130 },
  { key:'filename',    label:'Filename',    w:200 },
];

// Per-order visible columns (default)
let _orderVisCols = ['line_nr','target','aef_footage','design','format','lang','brand','headline','slate','actor'];
let _orderColWidths = {};

function buildOrderRows(order) {
  const designs = (typeof state !== 'undefined' && state.designs?.length) ? state.designs : [];
  const formats = (typeof state !== 'undefined' && state.formats?.length) ? state.formats : [];
  const compNames = (typeof state !== 'undefined') ? state.compNames : {};
  // Warn if settings not loaded
  if (!state.folderParts?.length || !state.filenameParts?.length) {
    console.warn('buildOrderRows: folder_parts or filename_parts not loaded from settings — using defaults');
  }
  const rows = [];
  let lineNr = 1;
  // Helper: fmt keys like "4x5v1"/"4x5v2" both map to the "4x5" image slot.
  const fmtToRatio = fmt => (typeof fmt === 'string' && fmt.startsWith('4x5')) ? '4x5' : fmt;

  order.items.forEach(item => {
    const langs = item.langs || ['EN'];
    const itemDesigns = (item.designs && item.designs.length) ? item.designs : designs.map(d => d.key);
    langs.forEach(lang => {
      itemDesigns.forEach(designKey => {
        const design = designs.find(d => d.key === designKey);
        const designFmts = design ? design.fmts : formats.map(f => f.key);
        // If the active project has this design with an images map, restrict emission
        // to ratios that actually have an uploaded image. Prevents CSV rows for
        // compositions that don't exist in After Effects.
        const adminDesign = (typeof adminDesigns !== 'undefined') ? adminDesigns.find(d => d.key === designKey) : null;
        const uploadedRatios = (adminDesign && adminDesign.images)
          ? new Set(Object.keys(adminDesign.images).filter(k => !!adminDesign.images[k]))
          : null;
        designFmts.forEach(fmtKey => {
          if (uploadedRatios && !uploadedRatios.has(fmtToRatio(fmtKey))) return;
          const brand = order.brand || 'Creditstar';
          const compKey = `${designKey}_${fmtKey}`;
          const PREFIX = { Creditstar:'CS', Monefit:'MF' };
          const shortDesign = designKey.replace('design','d');
          const fmtLabel = ({'16x9':'16x9','1x1':'1x1','9x16':'9x16','4x5v1':'4x5','4x5v2':'4x5'}[fmtKey]||fmtKey);
          const brandBucket = compNames[brand];
          const langBucket  = (brandBucket && typeof brandBucket === 'object') ? (brandBucket[lang] || brandBucket.EN) : null;
          const legacyVal   = (brandBucket && typeof brandBucket[compKey] === 'string') ? brandBucket[compKey] : null; // pre-migration shape
          const target = (langBucket && langBucket[compKey]) || legacyVal || `${PREFIX[brand]||'CS'}_TEMPLATE_${fmtLabel} ${shortDesign} ${lang}`;
          const headline = item.copyText?.[lang.toLowerCase()] || item.copyText?.en || '';
          const actorClean = (item.actor || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          const catSlug = (item.category || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          const copySlug = (typeof slugifyCopy === 'function') ? slugifyCopy(headline) : headline.replace(/[^\w\s]/g,'').replace(/\s+/g, '_').slice(0, 18);
          // Use persisted filename/folder convention from settings
          const fnParts = (state.filenameParts?.length) ? state.filenameParts : ['slate','actor','lang','design','format'];
          const fdParts = (state.folderParts?.length) ? state.folderParts : ['brand','lang','category','copyslug','actor','design','format'];
          const partMap = { brand, slate: item.slate, actor: actorClean, design: designKey, format: fmtKey, lang, category: catSlug, copyslug: copySlug };
          const filename = fnParts.map(p => partMap[p] || '').filter(Boolean).join('_').replace(/[\.\s]+/g, '_');
          const folderPath = fdParts.map(p => partMap[p] || '').filter(Boolean).join('/').replace(/[\.\s]+/g, '_');
          rows.push({
            line_nr: lineNr++,
            target,
            output: `${folderPath}/${filename}`,
            aef_footage: item.clipName + '.mov',
            design: designKey,
            format: fmtKey,
            lang,
            brand,
            headline,
            slate: item.slate,
            actor: item.actor || '',
            category: item.category || '',
            filename,
          });
        });
      });
    });
  });
  return rows;
}

function getOrderColW(key) {
  return _orderColWidths[key] || (ORDER_COLS.find(c => c.key === key)?.w) || 120;
}

function renderAFOrderDetail(order) {
  const rows = buildOrderRows(order);
  const oid = order.id;

  // Column toggle chips
  let html = `<div style="margin-top:12px;margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <button class="btn btn-secondary btn-sm" style="padding:3px 10px;font-size:9px;" onclick="toggleOrderColPanel('${esc(oid)}')">⊞ Columns</button>
    <button class="btn btn-primary btn-sm" style="padding:3px 10px;font-size:9px;" onclick="generateOrderCSV('${esc(oid)}')">⬇ Export CSV</button>
    <span style="font-size:10px;color:var(--muted);">${rows.length} rows</span>
  </div>`;

  html += `<div id="afo-col-toggles-${esc(oid)}" style="display:none;background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">Visible columns</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${ORDER_COLS.map(c => {
        const sel = _orderVisCols.includes(c.key);
        return `<div class="chip ${sel?'sel':''}" data-val="${c.key}" onclick="toggleOrderCol(this,'${c.key}','${esc(oid)}')">${c.label}</div>`;
      }).join('')}
    </div>
  </div>`;

  // Filter search
  html += `<div style="margin-bottom:8px;">
    <input type="text" id="afo-search-${esc(oid)}" placeholder="Search rows…" oninput="filterOrderTable('${esc(oid)}')"
      style="background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 12px;font-family:'DM Mono',monospace;font-size:10px;outline:none;width:220px;">
  </div>`;

  // Table
  html += `<div id="afo-table-wrap-${esc(oid)}" class="preview-wrap" style="max-height:400px;overflow:auto;">${renderOrderTable(oid, rows, '')}</div>`;

  // Action buttons
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">`;
  if (order.status !== 'ready') {
    html += `<button class="btn btn-secondary btn-sm" onclick="editAFOrder('${esc(oid)}')">&#9998; Edit Order</button>`;
  }
  if (order.status === 'pending') {
    html += `<button class="btn btn-blue btn-sm" onclick="setAFOrderStatus('${esc(oid)}','processing')">&#9654; Mark Processing</button>`;
  }
  if (order.status === 'processing') {
    html += `<button class="btn btn-green btn-sm" onclick="markAFOrderReady('${esc(oid)}')">&#10003; Mark Ready</button>`;
  }
  if (order.status === 'ready') {
    html += `<button class="btn btn-ghost btn-sm" onclick="setAFOrderStatus('${esc(oid)}','processing')">&#8617; Reopen</button>`;
  }
  html += '</div>';

  // Edit order panel (hidden by default)
  html += `<div id="afo-edit-${esc(oid)}" style="display:none;"></div>`;

  // Stash rows for filtering/export
  if (!window._orderRowsCache) window._orderRowsCache = {};
  window._orderRowsCache[oid] = rows;

  return html;
}

function renderOrderTable(oid, rows, search) {
  const vis = ORDER_COLS.filter(c => _orderVisCols.includes(c.key));
  let filtered = rows;
  if (search) {
    const s = search.toLowerCase();
    filtered = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)));
  }
  if (!filtered.length) return '<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">No matching rows</div>';

  const th = vis.map(c =>
    `<th style="position:relative;width:${getOrderColW(c.key)}px;min-width:40px;background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;" data-key="${c.key}">
      ${c.label}
      <div class="col-resize-handle" onmousedown="initOrderColResize(event,'${c.key}','${esc(oid)}')"></div>
    </th>`).join('');

  const tbody = filtered.map(r => {
    const tds = vis.map(c => {
      let val = r[c.key] ?? '';
      let style = 'padding:5px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0;';
      if (c.key === 'line_nr')     style += 'color:var(--muted);';
      else if (c.key === 'slate')  style += 'color:var(--accent);';
      else if (c.key === 'lang')   style += 'color:var(--blue);';
      else if (c.key === 'design') style += 'color:var(--purple);';
      else if (c.key === 'brand')  style += `color:${val==='Creditstar'?'var(--orange)':'var(--blue)'};`;
      return `<td style="${style}">${esc(val)}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--border);transition:background .1s;" onmouseover="this.style.background='rgba(255,255,255,.02)'" onmouseout="this.style.background='transparent'">${tds}</tr>`;
  }).join('');

  const colgroup = vis.map(c => `<col data-key="${c.key}" style="width:${getOrderColW(c.key)}px;min-width:40px;">`).join('');

  return `<table class="preview-table" style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;">
    <colgroup>${colgroup}</colgroup>
    <thead><tr>${th}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>`;
}

function toggleOrderColPanel(oid) {
  const el = document.getElementById('afo-col-toggles-' + oid);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function toggleOrderCol(chip, key, oid) {
  chip.classList.toggle('sel');
  _orderVisCols = ORDER_COLS.filter(c => {
    const el = chip.parentElement.querySelector(`[data-val="${c.key}"]`);
    return el && el.classList.contains('sel');
  }).map(c => c.key);
  // Re-render table
  const rows = window._orderRowsCache?.[oid] || [];
  const search = document.getElementById('afo-search-' + oid)?.value || '';
  const wrap = document.getElementById('afo-table-wrap-' + oid);
  if (wrap) wrap.innerHTML = renderOrderTable(oid, rows, search);
}

function filterOrderTable(oid) {
  const search = document.getElementById('afo-search-' + oid)?.value || '';
  const rows = window._orderRowsCache?.[oid] || [];
  const wrap = document.getElementById('afo-table-wrap-' + oid);
  if (wrap) wrap.innerHTML = renderOrderTable(oid, rows, search);
}

// Column resize for order tables
let _orderResizeKey = null, _orderResizeOid = null, _orderResizeX = 0, _orderResizeW = 0;

function initOrderColResize(e, key, oid) {
  e.preventDefault(); e.stopPropagation();
  _orderResizeKey = key; _orderResizeOid = oid;
  _orderResizeX = e.clientX;
  _orderResizeW = getOrderColW(key);
  document.addEventListener('mousemove', _orderResizeMove);
  document.addEventListener('mouseup', _orderResizeEnd);
}
function _orderResizeMove(e) {
  const w = Math.max(40, _orderResizeW + (e.clientX - _orderResizeX));
  _orderColWidths[_orderResizeKey] = w;
  const wrap = document.getElementById('afo-table-wrap-' + _orderResizeOid);
  if (!wrap) return;
  wrap.querySelectorAll(`col[data-key="${_orderResizeKey}"]`).forEach(c => c.style.width = w + 'px');
  wrap.querySelectorAll(`th[data-key="${_orderResizeKey}"]`).forEach(c => c.style.width = w + 'px');
}
function _orderResizeEnd() {
  document.removeEventListener('mousemove', _orderResizeMove);
  document.removeEventListener('mouseup', _orderResizeEnd);
}

function generateOrderCSV(orderId) {
  const order = _afOrdersCache.find(o => o.id === orderId);
  if (!order) { toast('Order not found', true); return; }

  // Use the same buildOrderRows function that renders the preview table
  const rows = buildOrderRows(order);

  if (!rows.length) { toast('No rows to export', true); return; }
  // Export columns that Templater needs
  const exportCols = ['target','output','aef_footage','headline','brand','lang','design','format','slate','actor','filename'];
  const csvEsc = v => '"' + String(v||'').replace(/"/g,'""') + '"';
  const csv = [exportCols.join(','), ...rows.map(r => exportCols.map(h => csvEsc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `order_${orderId}_templater.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast(`Downloaded Templater CSV for order ${orderId} (${rows.length} rows)`);
}

async function setAFOrderStatus(oid, status) {
  try {
    const r = await fetch('/api/orders/' + oid, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({status})
    });
    if (!r.ok) throw new Error('Server error');
    toast('Order ' + oid + ' updated to ' + status);
    // Re-render
    const detail = document.getElementById('afod-' + oid);
    if (detail) detail.dataset.rendered = '';
    loadAFOrders();
  } catch(e) { toast('Failed to update order: ' + e.message, true); }
}

function markAFOrderReady(oid) {
  const order = _afOrdersCache.find(o => o.id === oid);
  if (!order) return;
  const detail = document.getElementById('afod-' + oid);
  if (!detail) return;
  // Show inline textarea for rendered clip paths
  const existing = detail.querySelector('.af-ready-form');
  if (existing) { existing.remove(); return; }
  const form = document.createElement('div');
  form.className = 'af-ready-form';
  form.style.cssText = 'margin-top:12px;padding:12px;background:var(--s3);border:1px solid var(--border2);border-radius:8px;';
  form.innerHTML = `<div style="font-size:10px;color:var(--muted2);margin-bottom:8px;">Enter rendered clip paths (one per line, relative to rendered_path):</div>
    <textarea id="af-ready-paths-${esc(oid)}" style="width:100%;min-height:80px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:9px 12px;font-family:'DM Mono',monospace;font-size:10px;outline:none;resize:vertical;" placeholder="e.g. EN/ProductUsage/CS001/clip1.mp4&#10;ET/ProductUsage/CS001/clip1.mp4"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-green btn-sm" onclick="submitAFOrderReady('${esc(oid)}')">&#10003; Confirm Ready</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.af-ready-form').remove()">Cancel</button>
    </div>`;
  detail.appendChild(form);
}

async function submitAFOrderReady(oid) {
  const textarea = document.getElementById('af-ready-paths-' + oid);
  const paths = textarea ? textarea.value.trim().split('\n').filter(Boolean) : [];
  const rendered_clips = paths.map((p, i) => ({
    item_index: i,
    path: p.trim(),
    url: '/api/rendered-video?path=' + encodeURIComponent(p.trim()),
    filename: p.trim().split('/').pop(),
  }));
  try {
    const r = await fetch('/api/orders/' + oid, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({status: 'ready', rendered_clips})
    });
    if (!r.ok) throw new Error('Server error');
    toast('Order ' + oid + ' marked as ready');
    const detail = document.getElementById('afod-' + oid);
    if (detail) detail.dataset.rendered = '';
    loadAFOrders();
  } catch(e) { toast('Failed: ' + e.message, true); }
}

// ═══════════════════════════════════════════════════════════════
//  EDIT ORDER — inline editing of order items
// ═══════════════════════════════════════════════════════════════
let _editingOrder = null;
let _editingItems = [];

function editAFOrder(oid) {
  const order = _afOrdersCache.find(o => o.id === oid);
  if (!order) return;
  _editingOrder = order;
  _editingItems = JSON.parse(JSON.stringify(order.items)); // deep clone

  const el = document.getElementById('afo-edit-' + oid);
  if (!el) return;
  el.style.display = 'block';
  renderEditOrderPanel(oid);
}

function cancelEditOrder(oid) {
  _editingOrder = null;
  _editingItems = [];
  const el = document.getElementById('afo-edit-' + oid);
  if (el) el.style.display = 'none';
}

function renderEditOrderPanel(oid) {
  const el = document.getElementById('afo-edit-' + oid);
  if (!el) return;

  const LANGS = ['EN','ET','DE','FR','ES'];
  const designs = (typeof state !== 'undefined') ? state.designs : [];

  // Calculate render rows
  let totalRows = 0;
  _editingItems.forEach(item => {
    const itemDesigns = item.designs || [];
    let fmtSlots = 0;
    itemDesigns.forEach(dk => {
      const d = designs.find(x => x.key === dk);
      fmtSlots += d ? d.fmts.length : 4;
    });
    totalRows += fmtSlots * (item.langs || []).length;
  });

  let html = `<div style="margin-top:16px;padding:16px;background:var(--s2);border:1px solid var(--accent);border-radius:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;">Edit Order Items</div>
      <span style="font-size:10px;color:var(--muted2);">${_editingItems.length} items · ${totalRows} render rows</span>
    </div>`;

  _editingItems.forEach((item, i) => {
    html += `<div style="background:var(--s3);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div><span style="color:var(--accent);font-weight:500;">${esc(item.slate)}</span> <span style="color:var(--text);">${esc(item.clipName)}</span> <span style="color:var(--muted);">· ${esc(item.actor||'')}</span></div>
        <button style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:11px;" onclick="removeEditItem(${i},'${esc(oid)}')">&#10005; Remove</button>
      </div>
      <div style="font-size:10px;color:var(--muted2);margin-bottom:6px;">${esc(item.copyText?.en || item.copyKey || '—')}</div>
      <div style="margin-bottom:6px;">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Languages</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${LANGS.map(l => {
            const checked = (item.langs||[]).includes(l);
            return `<label style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:3px;border:1px solid ${checked?'var(--blue)':'var(--border)'};background:${checked?'rgba(71,200,255,.1)':'var(--s2)'};color:${checked?'var(--blue)':'var(--muted2)'};font-size:9px;cursor:pointer;">
              <input type="checkbox" ${checked?'checked':''} onchange="toggleEditLang(${i},'${l}','${esc(oid)}')" style="display:none;">
              ${l}
            </label>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Designs</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${designs.map(d => {
            const checked = (item.designs||[]).includes(d.key);
            return `<label style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:3px;border:1px solid ${checked?'var(--accent)':'var(--border)'};background:${checked?'rgba(232,255,71,.08)':'var(--s2)'};color:${checked?'var(--accent)':'var(--muted2)'};font-size:9px;cursor:pointer;">
              <input type="checkbox" ${checked?'checked':''} onchange="toggleEditDesign(${i},'${esc(d.key)}','${esc(oid)}')" style="display:none;">
              ${esc(d.key)}
            </label>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  });

  html += `<div style="display:flex;gap:8px;margin-top:12px;">
    <button class="btn btn-primary btn-sm" onclick="saveEditOrder('${esc(oid)}')">Save Changes</button>
    <button class="btn btn-ghost btn-sm" onclick="cancelEditOrder('${esc(oid)}')">Cancel</button>
  </div></div>`;

  el.innerHTML = html;
}

function toggleEditLang(itemIdx, lang, oid) {
  const item = _editingItems[itemIdx];
  if (!item) return;
  const idx = (item.langs||[]).indexOf(lang);
  if (idx >= 0) {
    if (item.langs.length <= 1) { toast('At least one language required', true); return; }
    item.langs.splice(idx, 1);
  } else {
    if (!item.langs) item.langs = [];
    item.langs.push(lang);
  }
  renderEditOrderPanel(oid);
}

function toggleEditDesign(itemIdx, designKey, oid) {
  const item = _editingItems[itemIdx];
  if (!item) return;
  if (!item.designs) item.designs = [];
  const idx = item.designs.indexOf(designKey);
  if (idx >= 0) {
    item.designs.splice(idx, 1);
  } else {
    item.designs.push(designKey);
  }
  renderEditOrderPanel(oid);
}

function removeEditItem(itemIdx, oid) {
  if (_editingItems.length <= 1) { toast('Order must have at least one item', true); return; }
  _editingItems.splice(itemIdx, 1);
  renderEditOrderPanel(oid);
}

async function saveEditOrder(oid) {
  const order = _afOrdersCache.find(o => o.id === oid);
  if (!order) return;

  try {
    const r = await fetch('/api/orders/' + oid, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ items: _editingItems })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'Server error');
    }
    toast('Order updated');
    cancelEditOrder(oid);
    const detail = document.getElementById('afod-' + oid);
    if (detail) detail.dataset.rendered = '';
    loadAFOrders();
  } catch(e) {
    toast('Failed to save: ' + e.message, true);
  }
}
