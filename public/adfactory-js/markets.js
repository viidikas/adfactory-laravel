// ═══════════════════════════════════════════════════════════════
//  MARKETS — staged rollout + per-copy enablement (super-admin only)
//  Relocated from the Growth Portal Admin tab into AD.FACTORY.
//  Source of truth is Google Sheets: copy text is read-only, only the
//  per-copy `enabled` flag is editable here.
// ═══════════════════════════════════════════════════════════════
let _adminMarkets = [];
let _copiesDetail = null;

async function loadAdminMarkets() {
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
      return `<tr style="border-bottom:1px solid var(--border);${dim}">
        <td style="padding:8px 10px;color:var(--text);"><strong>${esc(m.code)}</strong> · ${esc(m.name)}</td>
        <td style="padding:8px 10px;color:var(--blue);">${esc(m.brand)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(m.sheet_tab)} <button class="btn-edit" style="font-size:9px;background:none;border:none;color:var(--blue);cursor:pointer;" onclick="editMarketTab(${m.id})">edit</button></td>
        <td style="padding:8px 10px;color:var(--muted);">${m.copy_count ?? 0}</td>
        <td style="padding:8px 10px;color:${(m.enabled_count ?? 0) > 0 ? 'var(--green)' : 'var(--muted2)'};">${m.enabled_count ?? 0}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(fmtSynced(m.last_synced_at))}</td>
        <td style="padding:8px 10px;">${badge}</td>
        <td style="padding:8px 10px;white-space:nowrap;"><button class="btn btn-ghost" style="padding:3px 10px;font-size:9px;" onclick="openMarketCopies(${m.id})">Copies</button> <button class="btn btn-blue" style="padding:3px 10px;font-size:9px;" onclick="syncMarketNow(${m.id})">&#10227; Sync</button> ${toggleBtn}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ── Markets → Copies: per-market tabs + per-copy enable tickboxes ──
async function openMarketCopies(id) {
  try {
    const r = await fetch(`/api/markets/${id}/copies`);
    if (!r.ok) { toast('Could not load copies', true); return; }
    _copiesDetail = await r.json();
    renderMarketCopies(_copiesDetail);
    document.getElementById('market-copies-modal').classList.remove('hidden');
  } catch (e) { toast('Failed: ' + e.message, true); }
}

function closeMarketCopies() {
  document.getElementById('market-copies-modal').classList.add('hidden');
  _copiesDetail = null;
}

function renderMarketCopies(d) {
  const el = document.getElementById('market-copies-body');
  if (!el) return;
  const langs = ['en','et','de','fr','es'];

  // A tab per market (from the loaded admin markets list); click to switch.
  const tabs = (_adminMarkets || []).map(m =>
    `<button class="copies-tab${m.id === d.id ? ' active' : ''}" onclick="openMarketCopies(${m.id})">${esc(m.code)}${m.active ? ' <span class="copies-tab-dot" title="active"></span>' : ''}</button>`
  ).join('');

  const marketToggle = d.active
    ? `<button class="btn btn-ghost" onclick="toggleMarketFromCopies(${d.id}, false)">Disable market</button>`
    : `<button class="btn btn-green" style="${d.can_enable ? '' : 'opacity:.5;cursor:not-allowed;'}" title="${d.can_enable ? 'Enable market' : 'Enable at least one copy first'}" onclick="toggleMarketFromCopies(${d.id}, true)">Enable market</button>`;

  el.innerHTML = `
    <div class="copies-head">
      <div class="copies-title">Copies</div>
      <button class="btn btn-ghost" onclick="closeMarketCopies()">Close</button>
    </div>

    <div class="copies-tabs">${tabs}</div>

    <div class="copies-meta">
      <span><strong>${esc(d.code)}</strong> · ${esc(d.name)} · ${esc(d.brand)}</span>
      <span>Copies: <strong>${d.copy_count}</strong></span>
      <span>Enabled: <strong>${d.enabled_count}</strong></span>
      <span>Last synced: <strong>${esc(fmtSynced(d.last_synced_at))}</strong></span>
      <span>Status: <strong>${d.active ? 'active' : 'inactive'}</strong></span>
      <span style="margin-left:auto;">${marketToggle}</span>
    </div>
    <div class="confirm-note">Tick a copy to enable it — only enabled copies are shown to growth leads and can be ordered. Google Sheets stays the source of truth: copy text is read-only, and a sheet change resets that copy to disabled.</div>

    <table class="copies-table">
      <thead><tr><th style="width:60px;">Enable</th><th>Copy line</th><th style="width:170px;">Shot</th></tr></thead>
      <tbody>${(d.copies || []).map(row => {
        const txt = row.copy_text || {};
        const en = txt.en || row.copy_key;
        const others = langs.filter(l => l !== 'en' && txt[l]).map(l => `<span class="copy-lang-code">${l.toUpperCase()}</span>&nbsp;${esc(txt[l])}`).join('  ·  ');
        return `<tr class="${row.enabled ? 'copy-on' : ''}">
          <td style="text-align:center;"><input type="checkbox" class="copy-enable" ${row.enabled ? 'checked' : ''} onchange="toggleCopyEnabled(${d.id}, ${row.id}, this.checked)"></td>
          <td>
            <div class="copy-en"><span class="cat-dot" data-cat="${esc(row.category||'')}"></span>${esc(en)}${row.requires_disclaimer ? ' <span class="disc-yes" title="requires disclaimer">&#9878;</span>' : ''}</div>
            ${others ? `<div class="copy-others">${others}</div>` : ''}
          </td>
          <td class="mono">${esc(row.shot || '—')}</td>
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
    if (!r.ok) { toast(data.message || 'Failed to update copy', true); openMarketCopies(marketId); return; }
    _copiesDetail = data; renderMarketCopies(data);
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); openMarketCopies(marketId); }
}

async function toggleMarketFromCopies(id, makeActive) {
  try {
    const r = await fetch(`/api/markets/${id}/${makeActive ? 'enable' : 'disable'}`, { method: 'PUT', headers: {'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Failed', true); return; }
    toast(makeActive ? 'Market enabled' : 'Market disabled');
    loadAdminMarkets();
    openMarketCopies(id);
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
  } catch (e) { toast('Sync failed: ' + e.message, true); }
}

async function syncAllMarkets() {
  toast('Syncing all markets…');
  try {
    const r = await fetch('/api/markets/sync-all', { method: 'POST', headers: {'Content-Type':'application/json'} });
    const report = await r.json().catch(() => ({}));
    renderSyncReport(report);
    loadAdminMarkets();
  } catch (e) { toast('Sync failed: ' + e.message, true); }
}

function renderSyncReport(report) {
  const el = document.getElementById('admin-markets-report');
  if (!el) return;
  const issues = (report && report.issues) || [];
  if (!issues.length) {
    el.innerHTML = `<div style="font-size:10px;color:var(--green);padding:8px 10px;background:var(--s3);border-radius:6px;margin-bottom:10px;">&#10003; Synced ${report.synced ?? 0} market(s) — no issues.</div>`;
    return;
  }
  el.innerHTML = `<div style="font-size:10px;color:var(--orange);padding:8px 10px;background:var(--s3);border:1px solid var(--orange);border-radius:6px;margin-bottom:10px;">
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
