// ═══════════════════════════════════════════════════════════════
//  ORDERS — submit, view (growth lead)
// ═══════════════════════════════════════════════════════════════

function openSubmitModal() {
  if (!basket.length) { toast('Add clips to your order first', true); return; }
  document.getElementById('order-market').value = currentUser?.market || '';
  const summary = document.getElementById('order-summary-items');
  summary.innerHTML = basket.map(b => `
    <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;align-items:baseline;gap:10px;">
      <span style="color:var(--blue);font-size:9px;flex-shrink:0;">${esc(b.clip.slate)}</span>
      <span style="font-size:10px;">${esc(b.clip.nameNoExt)}</span>
      <span style="color:var(--muted);font-size:9px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.copyText?.en||b.copyKey||'—')}</span>
      <span style="color:var(--green);font-size:9px;">${b.langs.join(', ')}</span>
      <span style="color:var(--purple);font-size:9px;">${(b.designs||[]).join(', ')||'—'}</span>
    </div>`).join('');
  document.getElementById('submit-modal').classList.remove('hidden');
}

function closeSubmitModal() {
  document.getElementById('submit-modal').classList.add('hidden');
}

async function submitOrder() {
  const market = document.getElementById('order-market').value.trim();
  const note   = document.getElementById('order-note').value.trim();

  const items = basket.map(b => ({
    clipId:    b.clipId,
    clipName:  b.clip.nameNoExt,
    slate:     b.clip.slate,
    category:  b.clip.category,
    actor:     b.clip.actor,
    copyKey:   b.copyKey,
    copyText:  b.copyText,
    langs:     b.langs,
    designs:   b.designs || [],
  }));

  try {
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({user_id:currentUser.id, user_name:currentUser.name, market, note, items})
    });
    if (!r.ok) throw new Error('Server error');
    clearBasket();
    closeSubmitModal();
    toast('Order submitted! You can track it in My Orders');
    showTab('orders');
  } catch(e) {
    toast('Failed to submit order: '+e.message, true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ORDERS — VIEW (Growth Lead)
// ═══════════════════════════════════════════════════════════════

// Cache of orders for modal navigation
let _ordersCache = [];

async function loadOrders() {
  try {
    const r      = await fetch('/api/orders');
    const orders = await r.json();
    const mine   = currentUser?.role === 'admin'
      ? orders
      : orders.filter(o => o.user_id === currentUser?.id);
    _ordersCache = mine.slice().reverse();
    renderOrdersList(_ordersCache);
  } catch(e) {
    document.getElementById('orders-list').innerHTML = '<div style="color:var(--orange);font-size:10px;padding:20px;">Could not load orders</div>';
  }
}

function renderOrdersList(orders) {
  const list  = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  if (!orders.length) { list.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML = orders.map((o, idx) => {
    const date = formatDate(o.created);
    const statusClass = o.status || 'pending';
    const statusLabel = {'pending':'Pending','processing':'Processing','ready':'Ready'}[o.status]||o.status;
    // Auto-expand the most recent order (first in reversed list)
    const expanded = idx === 0;
    return `<div class="order-card" id="oc-${esc(o.id)}">
      <div class="order-header" onclick="toggleOrderDetail('${esc(o.id)}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="order-chevron${expanded?' open':''}" id="ochev-${esc(o.id)}">&#9654;</span>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">${date} ${o.market?'&middot; '+esc(o.market):''}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">${esc(o.id)} &middot; ${o.items.length} clip${o.items.length!==1?'s':''}</div>
          </div>
        </div>
        <span class="order-status-badge ${esc(statusClass)}">${esc(statusLabel)}</span>
      </div>
      <div class="order-detail${expanded?'':' hidden'}" id="od-${esc(o.id)}" data-rendered="${expanded?'1':''}">${expanded ? renderOrderDetail(o) : ''}</div>
    </div>`;
  }).join('');
}

function toggleOrderDetail(orderId) {
  const detail = document.getElementById('od-' + orderId);
  const chev   = document.getElementById('ochev-' + orderId);
  if (!detail) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden');
  if (chev) chev.classList.toggle('open', isHidden);
  // Lazy render on first open
  if (isHidden && !detail.dataset.rendered) {
    const order = _ordersCache.find(o => o.id === orderId);
    if (order) {
      detail.innerHTML = renderOrderDetail(order);
      detail.dataset.rendered = '1';
    }
  }
}

function renderOrderDetail(order) {
  let html = '';
  if (order.note) {
    html += `<div style="font-size:10px;color:var(--muted2);margin-bottom:12px;">Note: ${esc(order.note)}</div>`;
  }
  html += '<div class="order-items-grid">';
  order.items.forEach((item, idx) => {
    const localClip = clipLibrary.find(c => c.id === item.clipId);
    const thumbSrc = localClip ? `/api/thumb?path=${encodeURIComponent(localClip.relativePath)}` : '';
    const rendered = (order.rendered_clips || []).find(rc => rc.item_index === idx || rc.item_id === item.clipId);
    html += `<div class="order-item-card" onclick="openOrderClipModal('${esc(order.id)}', ${idx})">
      ${thumbSrc
        ? `<img class="order-item-thumb" src="${esc(thumbSrc)}" alt="${esc(item.clipName)}">`
        : `<div class="order-item-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:20px;">&#127916;</div>`}
      <div style="padding:8px;">
        <div style="font-size:10px;color:var(--text);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.clipName)}</div>
        <div style="font-size:9px;color:var(--accent);margin-top:2px;">${esc(item.slate)}</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc((item.copyText?.en||item.copyKey||'—').slice(0,40))}</div>
        <div style="font-size:9px;color:var(--blue);margin-top:2px;">${esc(item.langs.join(', '))}</div>
        ${(item.designs||[]).length ? `<div style="font-size:9px;color:var(--purple);margin-top:2px;">${esc(item.designs.join(', '))}</div>` : ''}
        ${rendered ? `<a class="download-btn" href="${esc(rendered.url)}" download="${esc(rendered.filename||'clip')}" onclick="event.stopPropagation();">Download</a>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  ORDER CLIP MODAL
// ═══════════════════════════════════════════════════════════════

let _ocmOrderId = null;
let _ocmItemIdx = 0;

function openOrderClipModal(orderId, itemIdx) {
  _ocmOrderId = orderId;
  _ocmItemIdx = itemIdx;
  const order = _ordersCache.find(o => o.id === orderId);
  if (!order) return;
  const item = order.items[itemIdx];
  if (!item) return;

  // Load video
  const vid = document.getElementById('ocm-video');
  const localClip = clipLibrary.find(c => c.id === item.clipId);
  if (localClip) {
    vid.src = `/api/video?path=${encodeURIComponent(localClip.relativePath)}`;
  } else {
    vid.src = '';
  }

  // Render panel
  document.getElementById('ocm-panel').innerHTML = renderOrderClipPanel(order, item);

  // Nav label
  document.getElementById('ocm-nav-label').textContent = `${itemIdx + 1} / ${order.items.length}`;
  document.getElementById('ocm-prev').disabled = itemIdx === 0;
  document.getElementById('ocm-next').disabled = itemIdx === order.items.length - 1;

  // Downloads
  const dlEl = document.getElementById('ocm-downloads');
  const rendered = (order.rendered_clips || []).find(rc => rc.item_index === itemIdx || rc.item_id === item.clipId);
  if (rendered) {
    dlEl.innerHTML = `<a class="download-btn" href="${esc(rendered.url)}" download="${esc(rendered.filename||'clip')}" style="display:block;text-align:center;">Download Rendered Clip</a>`;
  } else {
    dlEl.innerHTML = '';
  }

  document.getElementById('order-clip-modal').classList.remove('hidden');
}

function renderOrderClipPanel(order, item) {
  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">Clip Info</div>
    <button onclick="closeOrderClipModal()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;padding:4px;">&times;</button>
  </div>`;
  html += `<div class="cm-info-block">
    <div class="cm-row"><span class="cm-label">Slate</span><span class="cm-val">${esc(item.slate)}</span></div>
    <div class="cm-row"><span class="cm-label">Category</span><span class="cm-val">${esc(item.category||'—')}</span></div>
    <div class="cm-row"><span class="cm-label">Actor</span><span class="cm-val">${esc(item.actor||'—')}</span></div>
    <div class="cm-row"><span class="cm-label">Clip</span><span class="cm-val">${esc(item.clipName)}</span></div>
  </div>`;

  // Copy translations
  if (item.copyText && typeof item.copyText === 'object') {
    html += `<div style="margin-top:18px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Copy Translations</div>
      <div style="background:var(--s3);border-radius:6px;padding:12px;">`;
    Object.entries(item.copyText).forEach(([lang, text]) => {
      if (text) {
        html += `<div class="cm-copy-lang-row">
          <span class="cm-copy-lang-code">${esc(lang)}</span>
          <span class="cm-copy-lang-text">${esc(text)}</span>
        </div>`;
      }
    });
    html += '</div></div>';
  }

  // Languages
  html += `<div style="margin-top:18px;">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Languages</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${(item.langs||[]).map(l => `<span class="cm-lang-chip sel">${esc(l)}</span>`).join('')}
    </div>
  </div>`;

  // Designs
  if ((item.designs||[]).length) {
    html += `<div style="margin-top:18px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Designs</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${item.designs.map(d => `<span class="cm-design-tile sel">${esc(d)}</span>`).join('')}
      </div>
    </div>`;
  }

  // Status
  html += `<div style="margin-top:18px;">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Order Status</div>
    <span class="order-status-badge ${esc(order.status||'pending')}">${esc({'pending':'Pending','processing':'Processing','ready':'Ready'}[order.status]||order.status)}</span>
  </div>`;

  return html;
}

function orderClipNav(dir) {
  const order = _ordersCache.find(o => o.id === _ocmOrderId);
  if (!order) return;
  const newIdx = _ocmItemIdx + dir;
  if (newIdx < 0 || newIdx >= order.items.length) return;
  openOrderClipModal(_ocmOrderId, newIdx);
}

function closeOrderClipModal() {
  document.getElementById('order-clip-modal').classList.add('hidden');
  const vid = document.getElementById('ocm-video');
  if (vid) { vid.pause(); vid.src = ''; }
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
}
