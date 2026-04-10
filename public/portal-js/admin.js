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
      <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Market</th>
    </tr></thead>
    <tbody>${growthLeads.map(u => `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:8px 10px;color:var(--text);">${esc(u.name)}</td>
      <td style="padding:8px 10px;color:var(--muted);">${esc(u.email||'—')}</td>
      <td style="padding:8px 10px;color:var(--blue);">${esc(u.market||'—')}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function addUser() {
  const name   = document.getElementById('new-user-name').value.trim();
  const email  = document.getElementById('new-user-email').value.trim();
  const market = document.getElementById('new-user-market').value.trim();
  if (!name) { toast('Enter a name', true); return; }
  if (!email) { toast('Enter an email', true); return; }
  const r = await fetch('/api/users', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, email, market, role:'growth_lead'})});
  if (r.ok) {
    document.getElementById('new-user-name').value  = '';
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-market').value = '';
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
      const rows = [];
      order.items.forEach(item => {
        item.langs.forEach(lang => {
          rows.push({
            target:      '', // to be filled by admin in AD.FACTORY or manually
            output:      `${lang}/${item.category}/${item.slate}/${item.actor}/${item.clipName}`,
            aef_footage: item.clipName + '.mov',
            headline:    item.copyText?.[lang.toLowerCase()] || item.copyText?.en || '',
            lang,
            brand:       'Creditstar',
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
      a.href = url; a.download = `order_${oid}_${order.user_name.replace(/\s+/g,'_')}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast(`✓ Downloaded CSV for order ${oid}`);
    })
    .catch(e => toast('Export failed: '+e.message, true));
}
