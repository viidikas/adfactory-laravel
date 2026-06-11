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

// ── Markets → [market] → Copies (read-only review + confirmation) ──
let _copiesMarket = null;

async function openMarketCopies(id) {
  try {
    const r = await fetch(`/api/markets/${id}/copies`);
    if (!r.ok) { toast('Could not load copies', true); return; }
    _copiesMarket = await r.json();
    renderMarketCopies(_copiesMarket);
    document.getElementById('market-copies-modal').classList.remove('hidden');
  } catch (e) { toast('Failed: ' + e.message, true); }
}

function closeMarketCopies() {
  document.getElementById('market-copies-modal').classList.add('hidden');
  _copiesMarket = null;
}

function confirmationBadge(c) {
  if (c.confirmed) return `<span class="conf-badge conf-ok">&#10003; Confirmed by ${esc(c.confirmed_by||'—')} · ${esc(fmtSynced(c.confirmed_at))}</span>`;
  if (c.last_action === 'invalidated_by_sync') return `<span class="conf-badge conf-warn">&#9888; Invalidated by sync · ${esc(fmtSynced(c.last_action_at))}</span>`;
  if (c.last_action === 'manually_revoked') return `<span class="conf-badge conf-warn">&#9888; Revoked by ${esc(c.last_action_by||'—')} · ${esc(fmtSynced(c.last_action_at))}</span>`;
  return `<span class="conf-badge conf-none">Not confirmed</span>`;
}

function renderMarketCopies(d) {
  const el = document.getElementById('market-copies-body');
  if (!el) return;
  const c = d.confirmation || {};
  const reqCount = (d.copies || []).filter(x => x.requires_disclaimer).length;
  const langs = ['en','et','de','fr','es'];

  el.innerHTML = `
    <div class="copies-head">
      <div class="copies-title">${esc(d.code)} — ${esc(d.name)} <span class="copies-brand">${esc(d.brand)}</span></div>
      <button class="btn btn-ghost" onclick="closeMarketCopies()">Close</button>
    </div>

    <div class="copies-meta">
      <span>Copies: <strong>${d.copy_count}</strong></span>
      <span>Disclaimer column: <strong>${d.has_disclaimer ? 'present' : 'missing'}</strong> (${reqCount} require it)</span>
      <span>Last synced: <strong>${esc(fmtSynced(d.last_synced_at))}</strong></span>
      <span>Status: <strong>${d.active ? 'active' : 'inactive'}</strong></span>
    </div>

    <div class="confirm-panel">
      <div class="confirm-status">${confirmationBadge(c)}</div>
      <div class="confirm-actions">
        ${c.confirmed
          ? `<button class="btn btn-ghost" onclick="revokeMarket(${d.id})">Revoke confirmation</button>`
          : `<label class="confirm-check"><input type="checkbox" id="confirm-ack"> <span>I confirm the copies and disclaimer for <strong>${esc(d.code)}</strong> match the legally approved sheet.</span></label>
             <button class="btn btn-green" onclick="confirmMarket(${d.id})">Confirm copies</button>`}
      </div>
      <div class="confirm-note">Google Sheets is the single source of truth — copies are read-only here. Confirming records who approved this exact content; any later sync that changes the content resets the confirmation and deactivates the market.</div>
    </div>

    <table class="copies-table">
      <thead><tr><th>Copy key</th><th>Category</th><th>Disclaimer</th><th>Copy (per language)</th></tr></thead>
      <tbody>${(d.copies || []).map(row => {
        const txt = row.copy_text || {};
        const langRows = langs.filter(l => txt[l]).map(l => `<div class="copy-lang"><span class="copy-lang-code">${l.toUpperCase()}</span> ${esc(txt[l])}</div>`).join('');
        return `<tr>
          <td class="mono">${esc(row.copy_key)}</td>
          <td><span class="cat-dot" data-cat="${esc(row.category||'')}"></span>${esc(row.category||'—')}</td>
          <td>${row.requires_disclaimer ? '<span class="disc-yes">yes</span>' : 'no'}</td>
          <td>${langRows || '<span class="muted">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

async function confirmMarket(id) {
  const ack = document.getElementById('confirm-ack');
  if (!ack || !ack.checked) { toast('Tick the confirmation checkbox first', true); return; }
  try {
    const r = await fetch(`/api/markets/${id}/confirm`, { method:'POST', headers:{'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Confirm failed', true); return; }
    toast('Copies confirmed');
    _copiesMarket = data; renderMarketCopies(data);
    loadAdminMarkets();
  } catch (e) { toast('Failed: ' + e.message, true); }
}

async function revokeMarket(id) {
  if (!confirm('Revoke confirmation? This deactivates the market (existing orders are kept).')) return;
  try {
    const r = await fetch(`/api/markets/${id}/revoke`, { method:'POST', headers:{'Content-Type':'application/json'} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast(data.message || 'Revoke failed', true); return; }
    toast('Confirmation revoked — market deactivated');
    _copiesMarket = data; renderMarketCopies(data);
    loadAdminMarkets();
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
