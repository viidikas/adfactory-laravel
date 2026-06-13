// ═══════════════════════════════════════════════════════════════
//  MARKETS — staged rollout + per-copy enablement (super-admin only)
//
//  Two panels: the Markets list (view-markets, with the copy-spreadsheet
//  config + Sync all on top), and a per-market copies PAGE (view-market-copies)
//  reached by clicking a market row. The page is deep-linkable via the URL hash
//  (#markets/UK). Google Sheets stays the source of truth: copy text is
//  read-only, only the per-copy `enabled` flag is editable here.
// ═══════════════════════════════════════════════════════════════
let _adminMarkets = [];
let _copiesDetail = null;

async function loadAdminMarkets() {
  // Hydrate the copy-spreadsheet URL field from saved config.
  fetch('/api/config').then(r => r.json()).then(cfg => {
    const el = document.getElementById('sheet-url-input');
    if (el && document.activeElement !== el) el.value = cfg.sheet_url || '';
  }).catch(() => {});

  const el = document.getElementById('admin-markets-list');
  try {
    const r = await fetch('/api/markets');
    _adminMarkets = await r.json();
    renderAdminMarketsList(_adminMarkets);
  } catch (e) {
    if (el) el.innerHTML = '<div style="color:var(--orange);font-size:10px;padding:8px 0;">Could not load markets</div>';
  }
}

function fmtSynced(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
}

function renderAdminMarketsList(markets) {
  const el = document.getElementById('admin-markets-list');
  if (!el) return;
  if (!markets.length) { el.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:8px 0;">No markets yet.</div>'; return; }

  const head = ['Market','Brand','Tab','Copies','Enabled','Last synced','Status','Actions'];
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px;">
    <thead><tr>${head.map(h=>`<th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">${h}</th>`).join('')}</tr></thead>
    <tbody>${markets.map(m => {
      // Inactive markets are visually distinct: dimmed with an "inactive" badge.
      const dim = m.active ? '' : 'opacity:0.55;';
      const badge = m.active
        ? '<span style="color:var(--green);font-size:9px;border:1px solid var(--green);border-radius:4px;padding:1px 6px;">active</span>'
        : '<span style="color:var(--muted2);font-size:9px;border:1px solid var(--border2);border-radius:4px;padding:1px 6px;">inactive</span>';
      // A market may be enabled once at least one of its copies is enabled.
      const canEnable = !!m.can_enable;
      const toggleBtn = m.active
        ? `<button class="btn btn-ghost" style="padding:3px 10px;font-size:9px;" onclick="setMarketActive(${m.id}, false)">Disable</button>`
        : `<button class="btn btn-green" style="padding:3px 10px;font-size:9px;${canEnable ? '' : 'opacity:.5;cursor:not-allowed;'}" onclick="setMarketActive(${m.id}, true)" title="${canEnable ? 'Enable' : 'Enable at least one copy first'}">Enable</button>`;
      // The whole row navigates to the market's copies page; action buttons stop propagation.
      return `<tr class="market-row" style="border-bottom:1px solid var(--border);cursor:pointer;${dim}" onclick="openMarketCopiesPage(${m.id}, '${esc(m.code)}')">
        <td style="padding:8px 10px;color:var(--text);"><strong>${esc(m.code)}</strong> · ${esc(m.name)}</td>
        <td style="padding:8px 10px;color:var(--blue);">${esc(m.brand)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(m.sheet_tab)} <button class="btn-edit" style="font-size:9px;background:none;border:none;color:var(--blue);cursor:pointer;" onclick="event.stopPropagation();editMarketTab(${m.id})">edit</button></td>
        <td style="padding:8px 10px;color:var(--muted);">${m.copy_count ?? 0}</td>
        <td style="padding:8px 10px;color:${(m.enabled_count ?? 0) > 0 ? 'var(--green)' : 'var(--muted2)'};">${m.enabled_count ?? 0}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(fmtSynced(m.last_synced_at))}</td>
        <td style="padding:8px 10px;">${badge}</td>
        <td style="padding:8px 10px;white-space:nowrap;" onclick="event.stopPropagation();"><button class="btn btn-ghost" style="padding:3px 10px;font-size:9px;" onclick="openMarketCopiesPage(${m.id}, '${esc(m.code)}')">Copies &rarr;</button> <button class="btn btn-blue" style="padding:3px 10px;font-size:9px;" onclick="syncMarketNow(${m.id})">&#10227; Sync</button> ${toggleBtn}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ── Market copies PAGE (full panel, deep-linkable via #markets/CODE) ──

// Switch to the market copies panel and load one market's copies.
async function openMarketCopiesPage(id, code) {
  ALL_VIEWS.forEach(v => {
    const panel = document.getElementById('view-' + v);
    if (panel) panel.classList.toggle('active', v === 'market-copies');
    const nav = document.getElementById('nav-' + v);
    if (nav) nav.classList.toggle('active', v === 'markets'); // keep Markets lit
  });
  document.getElementById('page-title').textContent = 'Markets';
  document.getElementById('page-sub').textContent = 'Review copies and enable per market';
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (code) history.replaceState(null, '', '#markets/' + encodeURIComponent(code));

  const body = document.getElementById('market-copies-body');
  if (body) body.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:11px;">Loading…</div>';
  try {
    const r = await fetch(`/api/markets/${id}/copies`);
    if (!r.ok) { toast('Could not load copies', true); return; }
    _copiesDetail = await r.json();
    renderMarketCopies(_copiesDetail);
  } catch (e) { toast('Failed: ' + e.message, true); }
}

// Deep-link entry: resolve a market CODE → id, then open its page.
async function openMarketCopiesByCode(code) {
  if (!_adminMarkets || !_adminMarkets.length) {
    try { _adminMarkets = await fetch('/api/markets').then(r => r.json()); } catch (e) { _adminMarkets = []; }
  }
  const m = (_adminMarkets || []).find(x => String(x.code).toLowerCase() === String(code).toLowerCase());
  if (!m) { goView('markets'); return; }
  openMarketCopiesPage(m.id, m.code);
}

function backToMarkets() {
  goView('markets');
}

function renderMarketCopies(d) {
  const el = document.getElementById('market-copies-body');
  if (!el) return;

  // Language columns come from the server (locals first, EN last).
  const langs = Array.isArray(d.languages) && d.languages.length ? d.languages : ['en'];

  const badge = d.active
    ? '<span class="mk-badge mk-badge-on">active</span>'
    : '<span class="mk-badge mk-badge-off">inactive</span>';

  const marketToggle = d.active
    ? `<button class="btn btn-ghost" onclick="toggleMarketFromCopies(${d.id}, false)">Disable market</button>`
    : `<button class="btn btn-green" style="${d.can_enable ? '' : 'opacity:.5;cursor:not-allowed;'}" title="${d.can_enable ? 'Enable market' : 'Enable at least one copy first'}" onclick="toggleMarketFromCopies(${d.id}, true)">Enable market</button>`;

  el.innerHTML = `
    <div class="copies-head">
      <button class="btn btn-ghost" onclick="backToMarkets()">&larr; Markets</button>
      <div class="copies-title">${esc(d.name)} <span style="color:var(--muted2);font-weight:400;">· ${esc(d.code)}</span></div>
    </div>

    <div class="copies-meta">
      <span>${esc(d.brand)}</span>
      <span>${badge}</span>
      <span>Last synced: <strong>${esc(fmtSynced(d.last_synced_at))}</strong></span>
      <span>Copies: <strong>${d.copy_count}</strong></span>
      <span>Enabled: <strong>${d.enabled_count}</strong></span>
      <span style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <button class="btn btn-blue" onclick="syncMarketNow(${d.id})">&#10227; Sync this market</button>
        ${marketToggle}
      </span>
    </div>
    <div class="confirm-note">Tick a copy to enable it — only enabled copies are shown to growth leads and can be ordered. Google Sheets stays the source of truth: copy text is read-only, and a sheet change resets that copy to disabled. Click a long copy cell to expand it.</div>

    <table class="copies-table">
      <thead><tr>
        <th style="width:60px;">Enabled</th>
        <th>Copy key</th>
        ${langs.map(l => `<th>${esc(l.toUpperCase())}</th>`).join('')}
        <th>Category</th>
        <th style="width:120px;">Shot</th>
        <th style="width:70px;">Discl.</th>
      </tr></thead>
      <tbody>${(d.copies || []).map(row => {
        const txt = row.copy_text || {};
        return `<tr class="${row.enabled ? 'copy-on' : ''}">
          <td style="text-align:center;"><input type="checkbox" class="copy-enable" ${row.enabled ? 'checked' : ''} onchange="toggleCopyEnabled(${d.id}, ${row.id}, this.checked)"></td>
          <td class="mono">${esc(row.copy_key)}</td>
          ${langs.map(l => `<td><div class="copy-clamp" onclick="this.classList.toggle('expanded')">${esc(txt[l] || '')}</div></td>`).join('')}
          <td><span class="cat-dot" data-cat="${esc(row.category||'')}"></span>${esc(row.category || '—')}</td>
          <td class="mono">${esc(row.shot || '—')}</td>
          <td>${row.requires_disclaimer ? '<span class="disc-yes">yes</span>' : '<span class="muted">no</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

async function toggleCopyEnabled(marketId, copyId, enabled) {
  try {
    const r = await fetch(`/api/markets/${marketId}/copies/${copyId}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ enabled }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Failed to update copy', true); return; }
    _copiesDetail = data; renderMarketCopies(data);
    // Keep the underlying list counts fresh for when the user goes back.
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); }
}

async function toggleMarketFromCopies(id, makeActive) {
  try {
    const r = await fetch(`/api/markets/${id}/${makeActive ? 'enable' : 'disable'}`, { method: 'PUT', headers: {'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Failed', true); return; }
    toast(makeActive ? 'Market enabled' : 'Market disabled');
    loadAdminMarkets();
    openMarketCopiesPage(id, _copiesDetail && _copiesDetail.code);
  } catch (e) { toast('Failed: ' + e.message, true); }
}

async function setMarketActive(id, makeActive) {
  try {
    const r = await fetch(`/api/markets/${id}/${makeActive ? 'enable' : 'disable'}`, { method: 'PUT', headers: {'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Failed', true); return; }
    toast(makeActive ? 'Market enabled' : 'Market disabled');
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); }
}

async function syncMarketNow(id) {
  toast('Syncing…');
  try {
    const r = await fetch(`/api/markets/${id}/sync`, { method: 'POST', headers: {'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    const issues = (data && data.issues) || [];
    if (!r.ok || data.ok === false) {
      toast(issues.join('; ') || data.message || 'Sync failed', true);
    } else {
      toast(`Synced ${data.copy_count} copies` + (issues.length ? ' · ' + issues.join('; ') : ''), issues.length > 0);
    }
    loadAdminMarkets();
    // If we're on a market's copies page, refresh it.
    if (_copiesDetail && _copiesDetail.id === id) openMarketCopiesPage(id, _copiesDetail.code);
  } catch (e) { toast('Sync failed: ' + e.message, true); }
}

// Persist the copy-spreadsheet URL (shared by market sync and the Generate copy
// lines). Returns true once saved.
async function saveSheetUrl() {
  const input = document.getElementById('sheet-url-input');
  const url = input ? input.value.trim() : '';
  await fetch('/api/config', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sheet_url: url }),
  }).catch(() => {});
  return url;
}

// Sync is market-centric: refresh every market's tab AND the global copy lines
// the Generate flow reads (slate_data), all from the one configured sheet.
async function syncAllMarkets() {
  await saveSheetUrl();
  toast('Syncing all markets…');
  try {
    const r = await fetch('/api/markets/sync-all', { method: 'POST', headers: {'Content-Type':'application/json'} });
    const report = await r.json().catch(() => ({}));
    renderSyncReport(report);
    loadAdminMarkets();
  } catch (e) { toast('Sync failed: ' + e.message, true); }

  // Keep the Generate flow's copy data flowing: rebuild copy lines + slate_data
  // from the same sheet, then refresh in-memory copy assignments.
  try {
    await fetch('/api/copy-lines/sync', { method: 'POST', headers: {'Content-Type':'application/json'} });
    if (typeof loadSlateData === 'function') loadSlateData();
  } catch (e) { /* copy-lines refresh is best-effort */ }
}

function renderSyncReport(report) {
  const el = document.getElementById('admin-markets-report');
  if (!el) return;
  const issues = (report && report.issues) || [];
  if (!issues.length) {
    el.innerHTML = `<div style="font-size:10px;color:var(--green);padding:8px 10px;background:var(--s3);border-radius:6px;margin:10px 0;">&#10003; Synced ${report.synced ?? 0} market(s) — no issues.</div>`;
    return;
  }
  el.innerHTML = `<div style="font-size:10px;color:var(--orange);padding:8px 10px;background:var(--s3);border:1px solid var(--orange);border-radius:6px;margin:10px 0;">
    <div style="font-weight:600;margin-bottom:4px;">Validation report (${issues.length} issue${issues.length>1?'s':''}):</div>
    ${issues.map(i => `<div>• ${esc(i)}</div>`).join('')}
  </div>`;
}

async function createMarket() {
  const code = document.getElementById('new-market-code').value.trim();
  const name = document.getElementById('new-market-name').value.trim();
  const brand = document.getElementById('new-market-brand').value;
  if (!code || !name) { toast('Enter a code and name', true); return; }
  try {
    const r = await fetch('/api/markets', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ code, name, brand }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Failed to add market', true); return; }
    document.getElementById('new-market-code').value = '';
    document.getElementById('new-market-name').value = '';
    toast(`Market ${code} added (inactive)`);
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); }
}

async function editMarketTab(id) {
  const m = _adminMarkets.find(x => x.id === id);
  const tab = prompt('Sheet tab name for this market:', m ? m.sheet_tab : '');
  if (tab === null) return;
  try {
    const r = await fetch(`/api/markets/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sheet_tab: tab.trim() }) });
    if (!r.ok) { toast('Failed to update tab', true); return; }
    toast('Tab updated');
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); }
}
