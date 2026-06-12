// ═══════════════════════════════════════════════════════════════
//  ADMIN VIEW — orders management, user management
// ═══════════════════════════════════════════════════════════════

async function loadAdminOrders() {
  try {
    const [ordersR, usersR] = await Promise.all([fetch('/api/orders'), fetch('/api/users')]);
    const orders = await ordersR.json();
    const users  = await usersR.json();
    renderAdminOrders(orders.reverse());
    renderAdminUsers(users);
  } catch(e) {
    document.getElementById('admin-orders-list').innerHTML = '<div style="color:var(--orange);font-size:10px;padding:20px;">Could not load data</div>';
  }
  loadAdminMarkets();
}

// ═══════════════════════════════════════════════════════════════
//  MARKETS MANAGEMENT (admin) — staged rollout controls
// ═══════════════════════════════════════════════════════════════
let _adminMarkets = [];

async function loadAdminMarkets() {
  try {
    const r = await fetch('/api/markets');
    _adminMarkets = await r.json();
    renderAdminMarketsList(_adminMarkets);
  } catch (e) {
    const el = document.getElementById('admin-markets-list');
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

  const head = ['Market','Brand','Tab','Copies','Disclaimer','Confirmed','Last synced','Status','Actions'];
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px;">
    <thead><tr>${head.map(h=>`<th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">${h}</th>`).join('')}</tr></thead>
    <tbody>${markets.map(m => {
      // Inactive markets are visually distinct: dimmed with an "inactive" badge.
      const dim = m.active ? '' : 'opacity:0.55;';
      const badge = m.active
        ? '<span style="color:var(--green);font-size:9px;border:1px solid var(--green);border-radius:4px;padding:1px 6px;">active</span>'
        : '<span style="color:var(--muted2);font-size:9px;border:1px solid var(--border2);border-radius:4px;padding:1px 6px;">inactive</span>';
      const disc = m.has_disclaimer ? '<span style="color:var(--green);">yes</span>' : '<span style="color:var(--orange);">missing</span>';
      const conf = m.confirmed
        ? `<span style="color:var(--green);">&#10003; ${esc(m.confirmed_by||'')}</span>`
        : '<span style="color:var(--muted2);">not confirmed</span>';
      // Enabling requires synced copies + a Disclaimer column + a confirmation.
      const canEnable = m.review_ready && m.confirmed;
      const toggleBtn = m.active
        ? `<button class="btn btn-ghost" style="padding:3px 10px;font-size:9px;" onclick="setMarketActive(${m.id}, false)">Disable</button>`
        : `<button class="btn btn-green" style="padding:3px 10px;font-size:9px;${canEnable ? '' : 'opacity:.6;'}" onclick="setMarketActive(${m.id}, true)" title="${canEnable ? 'Enable' : 'Needs synced copies + a Disclaimer column + confirmation'}">Enable</button>`;
      return `<tr style="border-bottom:1px solid var(--border);${dim}">
        <td style="padding:8px 10px;color:var(--text);"><strong>${esc(m.code)}</strong> · ${esc(m.name)}</td>
        <td style="padding:8px 10px;color:var(--blue);">${esc(m.brand)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(m.sheet_tab)} <button class="btn-edit" style="font-size:9px;" onclick="editMarketTab(${m.id})">edit</button></td>
        <td style="padding:8px 10px;color:var(--muted);">${m.copy_count ?? 0}</td>
        <td style="padding:8px 10px;">${disc}</td>
        <td style="padding:8px 10px;">${conf}</td>
        <td style="padding:8px 10px;color:var(--muted);">${esc(fmtSynced(m.last_synced_at))}</td>
        <td style="padding:8px 10px;">${badge}</td>
        <td style="padding:8px 10px;white-space:nowrap;"><button class="btn btn-ghost" style="padding:3px 10px;font-size:9px;" onclick="openMarketCopies(${m.id})">Copies</button> <button class="btn btn-blue" style="padding:3px 10px;font-size:9px;" onclick="syncMarketNow(${m.id})">&#10227; Sync</button> ${toggleBtn}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ── Markets → Copies: per-market tabs + per-copy enable tickboxes ──
let _copiesDetail = null;

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
    : `<button class="btn btn-green" style="${d.can_enable ? '' : 'opacity:.6;'}" title="${d.can_enable ? 'Enable market' : 'Enable at least one copy first'}" onclick="toggleMarketFromCopies(${d.id}, true)">Enable market</button>`;

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

function renderAdminUsers(users) {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  const growthLeads = users.filter(u => u.role === 'growth_lead');
  if (!growthLeads.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:8px 0;">No growth leads added yet.</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px;">
    <thead><tr>
      <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Name</th>
      <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Email</th>
    </tr></thead>
    <tbody>${growthLeads.map(u => `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:8px 10px;color:var(--text);">${esc(u.name)}</td>
      <td style="padding:8px 10px;color:var(--muted);">${esc(u.email||'—')}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function addUser() {
  const name   = document.getElementById('new-user-name').value.trim();
  const email  = document.getElementById('new-user-email').value.trim();
  if (!name) { toast('Enter a name', true); return; }
  if (!email) { toast('Enter an email', true); return; }
  const r = await fetch('/api/users', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, email, role:'growth_lead'})});
  if (r.ok) {
    document.getElementById('new-user-name').value  = '';
    document.getElementById('new-user-email').value = '';
    toast(`✓ ${name} added as growth lead`);
    loadAdminOrders(); // refreshes both orders and users list
  } else {
    toast('Failed to add user', true);
  }
}

function renderAdminOrders(orders) {
  const list  = document.getElementById('admin-orders-list');
  const empty = document.getElementById('admin-empty');
  if (!orders.length) { list.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  list.innerHTML = orders.map(o => {
    const date = new Date(o.created*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const statusClass = {'pending':'status-pending','processing':'status-processing','ready':'status-ready'}[o.status]||'status-pending';
    const statusLabel = {'pending':'⏳ Pending','processing':'⚙ Processing','ready':'✓ Ready'}[o.status]||o.status;
    return `<div class="admin-order-card">
      <div class="admin-order-header">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;">${esc(o.user_name)}${o.market?' · '+esc(o.market):''}</div>
          <div class="order-id" style="margin-top:3px;">Order ${esc(o.id)} · ${date}</div>
          ${o.note?`<div style="font-size:10px;color:var(--muted2);margin-top:3px;">📝 ${esc(o.note)}</div>`:''}
        </div>
        <div class="order-status ${statusClass}">${statusLabel}</div>
      </div>
      <table class="order-items-table">
        <thead><tr><th>Clip</th><th>Slate</th><th>Actor</th><th>Copy (EN)</th><th>Languages</th></tr></thead>
        <tbody>${o.items.map(item=>`<tr>
          <td style="color:var(--text);">${esc(item.clipName)}</td>
          <td style="color:var(--accent);">${esc(item.slate)}</td>
          <td>${esc(item.actor||'—')}</td>
          <td style="color:var(--text);">${esc((item.copyText?.en||item.copyKey||'—').slice(0,50))}</td>
          <td style="color:var(--blue);">${esc(item.langs.join(', '))}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="admin-actions">
        <button class="btn btn-primary" onclick="exportOrderCSV('${esc(o.id)}')">⬇ Export CSV</button>
        ${o.status==='pending'
          ? `<button class="btn btn-blue" onclick="setOrderStatus('${esc(o.id)}','processing')">▶ Mark Processing</button>`
          : ''}
        ${o.status==='processing'
          ? `<button class="btn btn-green" onclick="setOrderStatus('${esc(o.id)}','ready')">✓ Mark Ready</button>`
          : ''}
        ${o.status==='ready'
          ? `<button class="btn btn-ghost" onclick="setOrderStatus('${esc(o.id)}','processing')">↩ Reopen</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
}

async function setOrderStatus(oid, status) {
  try {
    const r = await fetch('/api/orders/'+oid, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({status})
    });
    if (r.ok) { toast('✓ Order updated to '+status); loadAdminOrders(); }
  } catch(e) { toast('Failed: '+e.message, true); }
}

function exportOrderCSV(oid) {
  fetch('/api/orders/'+oid)
    .then(r => r.json())
    .then(order => {
      const market = order.market || '';        // market code, for AE traceability
      const brand  = order.brand || 'Creditstar'; // derived from the order's market
      const rows = [];
      order.items.forEach(item => {
        item.langs.forEach(lang => {
          rows.push({
            target:      '', // to be filled by admin in AD.FACTORY or manually
            output:      `${market}/${lang}/${item.category}/${item.slate}/${item.actor}/${item.clipName}`,
            aef_footage: item.clipName + '.mov',
            headline:    item.copyText?.[lang.toLowerCase()] || item.copyText?.en || '',
            lang,
            brand,
            market,
            // yes/no flag — After Effects fetches the per-market disclaimer image.
            disclaimer:  item.requiresDisclaimer ? 'yes' : 'no',
            slate:       item.slate,
            actor:       item.actor,
          });
        });
      });
      const headers = Object.keys(rows[0]);
      const e = v => '"' + String(v||'').replace(/"/g,'""') + '"';
      const csv = [headers.join(','), ...rows.map(r => headers.map(h=>e(r[h])).join(','))].join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      // Market code in the filename so rendered batches trace back to a market.
      a.href = url; a.download = `order_${oid}_${(market||'NA')}_${order.user_name.replace(/\s+/g,'_')}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast(`✓ Downloaded CSV for order ${oid}`);
    })
    .catch(e => toast('Export failed: '+e.message, true));
}
