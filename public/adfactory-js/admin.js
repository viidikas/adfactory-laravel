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
  toast(`✓ design${n} added — set its formats and comp names in Step 3`);
}

function removeDesign(i) {
  const key = state.designs[i].key;
  state.designs.splice(i, 1);
  // Remove compNames for this design across all brands
  Object.keys(state.compNames).forEach(brand => {
    if (typeof state.compNames[brand] === 'object') {
      Object.keys(state.compNames[brand]).forEach(k => { if (k.startsWith(key + '_')) delete state.compNames[brand][k]; });
    }
  });
  state.filters.design = state.filters.design.filter(d => d !== key);
  syncFiltersFromDesigns();
  renderDesignsList();
  updateFilterChips();
  renderCompNameFields();
  updateFilterSummary();
}

function renameDesignKey(i, newKey) {
  newKey = newKey.trim();
  const oldKey = state.designs[i].key;
  if (!newKey || newKey === oldKey) return;
  // Rename in compNames across all brands
  Object.keys(state.compNames).forEach(brand => {
    if (typeof state.compNames[brand] !== 'object') return;
    const renames = {};
    Object.entries(state.compNames[brand]).forEach(([k, v]) => {
      renames[k.startsWith(oldKey + '_') ? newKey + k.slice(oldKey.length) : k] = v;
    });
    state.compNames[brand] = renames;
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
  toast(`✓ Format added — set the key and label, then assign it to designs`);
}

function removeFormat(i) {
  const key = state.formats[i].key;
  state.formats.splice(i, 1);
  // Remove from all designs
  state.designs.forEach(d => { d.fmts = d.fmts.filter(f => f !== key); });
  // Remove from compNames across all brands
  Object.keys(state.compNames).forEach(brand => {
    if (typeof state.compNames[brand] === 'object') {
      Object.keys(state.compNames[brand]).forEach(k => { if (k.endsWith('_' + key)) delete state.compNames[brand][k]; });
    }
  });
  state.filters.fmt = state.filters.fmt.filter(f => f !== key);
  renderFormatsList();
  renderDesignsList();
  updateFilterChips();
  renderCompNameFields();
}

function renameFormatKey(i, newKey) {
  newKey = newKey.trim();
  const oldKey = state.formats[i].key;
  if (!newKey || newKey === oldKey) return;
  // Rename in designs
  state.designs.forEach(d => { d.fmts = d.fmts.map(f => f === oldKey ? newKey : f); });
  // Rename in compNames across all brands
  Object.keys(state.compNames).forEach(brand => {
    if (typeof state.compNames[brand] !== 'object') return;
    const renames = {};
    Object.entries(state.compNames[brand]).forEach(([k, v]) => {
      renames[k.endsWith('_' + oldKey) ? k.slice(0, -(oldKey.length)) + newKey : k] = v;
    });
    state.compNames[brand] = renames;
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
async function loadAdminConfig() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error();
    const cfg = await r.json();
    const rp = document.getElementById('admin-rendered-path');
    if (rp && cfg.rendered_path) rp.value = cfg.rendered_path;
    renderAdminDesigns(cfg.designs || []);
  } catch(e) {
    const st = document.getElementById('admin-path-status');
    if (st) st.textContent = '⚠ Could not load config';
  }
}

function renderAdminDesigns(designs) {
  const el = document.getElementById('admin-designs-list');
  if (!el) return;
  if (!designs.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:6px 0;">No designs added yet.</div>';
    return;
  }
  const RATIOS = ['16x9','1x1','9x16','4x5'];
  el.innerHTML = designs.map((d, i) => `
    <div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <span style="font-size:12px;color:var(--accent);font-weight:500;">${esc(d.key||d)}</span>
          ${d.label?`<span style="font-size:10px;color:var(--muted2);margin-left:8px;">${esc(d.label)}</span>`:''}
        </div>
        <button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:9px;color:var(--orange);" onclick="removeAdminDesign(${i})">✕ Remove</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        ${RATIOS.map(ratio => {
          const img = d.images?.[ratio];
          return `<div style="text-align:center;">
            <div style="font-size:9px;color:var(--muted);margin-bottom:4px;">${ratio}</div>
            ${img
              ? `<img src="${img}" style="width:100%;border-radius:4px;border:1px solid var(--border);object-fit:cover;aspect-ratio:${ratio.replace('x','/')};cursor:pointer;" title="Click to replace" onclick="replaceDesignImage(${i},'${ratio}')">`
              : `<div style="aspect-ratio:${ratio.replace('x','/')};background:var(--s3);border:1px dashed var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:var(--muted);" onclick="replaceDesignImage(${i},'${ratio}')">+ Add</div>`}
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

async function addAdminDesign() {
  const key   = document.getElementById('new-design-key').value.trim();
  const label = document.getElementById('new-design-label').value.trim();
  const status = document.getElementById('admin-designs-status');
  if (!key) { toast('Enter a design key (e.g. design1)', true); return; }

  // Read images as base64
  const RATIOS = ['16x9','1x1','9x16','4x5'];
  const images = {};
  for (const ratio of RATIOS) {
    const inp = document.getElementById(`new-design-img-${ratio}`);
    if (inp?.files?.[0]) {
      images[ratio] = await fileToBase64(inp.files[0]);
    }
  }

  try {
    const r   = await fetch('/api/config');
    const cfg = await r.json();
    const designs = cfg.designs || [];
    if (designs.find(d => (d.key||d) === key)) { toast('Design key already exists', true); return; }
    designs.push({ key, label, images });
    await fetch('/api/config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...cfg, designs})
    });
    // Clear inputs
    document.getElementById('new-design-key').value = '';
    document.getElementById('new-design-label').value = '';
    RATIOS.forEach(r => {
      const inp = document.getElementById(`new-design-img-${r}`);
      if (inp) inp.value = '';
    });
    toast(`✓ Design "${key}" added`);
    loadAdminConfig();
  } catch(e) { toast('Could not save — server error', true); }
}

async function replaceDesignImage(designIdx, ratio) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files?.[0]) return;
    const b64 = await fileToBase64(input.files[0]);
    const r   = await fetch('/api/config');
    const cfg = await r.json();
    const designs = cfg.designs || [];
    if (!designs[designIdx]) return;
    if (!designs[designIdx].images) designs[designIdx].images = {};
    designs[designIdx].images[ratio] = b64;
    await fetch('/api/config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...cfg, designs})
    });
    toast(`✓ ${ratio} image updated`);
    loadAdminConfig();
  };
  input.click();
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function removeAdminDesign(idx) {
  try {
    const r   = await fetch('/api/config');
    const cfg = await r.json();
    const designs = cfg.designs || [];
    designs.splice(idx, 1);
    await fetch('/api/config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...cfg, designs})
    });
    toast('✓ Design removed');
    loadAdminConfig();
  } catch(e) { toast('Could not save — server error', true); }
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
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Market</th>
      </tr></thead>
      <tbody>${leads.map(u => `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px 10px;color:var(--text);">${esc(u.name)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(u.email||'—')}</td>
        <td style="padding:8px 10px;color:var(--blue);">${esc(u.market||'—')}</td>
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
  const market = document.getElementById('new-user-market').value.trim();
  const status = document.getElementById('users-status');
  if (!name) { toast('Enter a name', true); return; }
  if (!email) { toast('Enter an email', true); return; }
  try {
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, email, market, role:'growth_lead'}),
    });
    if (!r.ok) throw new Error('Server error');
    document.getElementById('new-user-name').value   = '';
    document.getElementById('new-user-email').value  = '';
    document.getElementById('new-user-market').value = '';
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
  if (!orders.length) {
    list.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:10px;">No orders yet. Orders from growth leads will appear here.</div>';
    return;
  }
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
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">${esc(o.user_name)} ${o.market?'&middot; '+esc(o.market):''}</div>
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
  const designs = (typeof state !== 'undefined') ? state.designs : [];
  const formats = (typeof state !== 'undefined') ? state.formats : [];
  const compNames = (typeof state !== 'undefined') ? state.compNames : {};
  const rows = [];
  let lineNr = 1;
  order.items.forEach(item => {
    const langs = item.langs || ['EN'];
    const itemDesigns = (item.designs && item.designs.length) ? item.designs : designs.map(d => d.key);
    langs.forEach(lang => {
      itemDesigns.forEach(designKey => {
        const design = designs.find(d => d.key === designKey);
        const designFmts = design ? design.fmts : formats.map(f => f.key);
        designFmts.forEach(fmtKey => {
          const brand = item.copyText?.brand || 'Creditstar';
          const compKey = `${designKey}_${fmtKey}`;
          const target = (compNames[brand] && compNames[brand][compKey]) || '';
          const headline = item.copyText?.[lang.toLowerCase()] || item.copyText?.en || '';
          const actorClean = (item.actor || '').replace(/\s+/g, '_');
          const catSlug = (item.category || '').replace(/\s+/g, '_');
          const filename = [brand, item.slate, actorClean, designKey, fmtKey, lang].filter(Boolean).join('_');
          const folderPath = [lang, brand, catSlug, actorClean, fmtKey].filter(Boolean).join('/');
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

  const designs = (typeof state !== 'undefined') ? state.designs : [];
  const formats = (typeof state !== 'undefined') ? state.formats : [];
  const compNames = (typeof state !== 'undefined') ? state.compNames : {};

  const rows = [];
  order.items.forEach(item => {
    const langs = item.langs || ['EN'];
    const itemDesigns = (item.designs && item.designs.length) ? item.designs : designs.map(d => d.key);
    langs.forEach(lang => {
      itemDesigns.forEach(designKey => {
        const design = designs.find(d => d.key === designKey);
        const designFmts = design ? design.fmts : formats.map(f => f.key);
        designFmts.forEach(fmtKey => {
          const brand = item.copyText?.brand || 'Creditstar';
          const compKey = `${designKey}_${fmtKey}`;
          const target = (compNames[brand] && compNames[brand][compKey]) || '';
          const headline = item.copyText?.[lang.toLowerCase()] || item.copyText?.en || '';
          const filename = [brand, item.slate, item.actor||'', designKey, fmtKey, lang].filter(Boolean).join('_');
          const output = [lang, item.category, item.slate, item.actor, item.clipName].filter(Boolean).join('/');
          rows.push({
            target,
            output,
            aef_footage: item.clipName + '.mov',
            headline,
            brand,
            lang,
            design: designKey,
            format: fmtKey,
            slate: item.slate,
            actor: item.actor || '',
            filename,
          });
        });
      });
    });
  });

  if (!rows.length) { toast('No rows to export', true); return; }
  const headers = Object.keys(rows[0]);
  const csvEsc = v => '"' + String(v||'').replace(/"/g,'""') + '"';
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEsc(r[h])).join(','))].join('\n');
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
