// ═══════════════════════════════════════════════════════════════
//  BASKET DRAWER + ORDER SUBMISSION
// ═══════════════════════════════════════════════════════════════

let drawerOpen = false;

function toggleBasketDrawer() {
  drawerOpen = !drawerOpen;
  document.getElementById('basket-drawer').classList.toggle('open', drawerOpen);
  document.getElementById('basket-drawer-overlay').classList.toggle('hidden', !drawerOpen);
  if (drawerOpen) {
    renderBasketDrawer();
    const mkt = document.getElementById('order-market');
    if (mkt && !mkt.value) mkt.value = currentUser?.market || '';
  }
}

function calcItemRenderRows(item) {
  let rows = 0;
  const langs = item.langs?.length || 1;
  (item.designs || []).forEach(dKey => {
    const config = availableDesigns.find(d => (typeof d === 'object' ? d.key : d) === dKey);
    const fmts = (typeof config === 'object' && config?.fmts) ? config.fmts.length : 4;
    rows += fmts * langs;
  });
  return rows || langs;
}

function calcTotalRenderRows() {
  return basket.reduce((sum, item) => sum + calcItemRenderRows(item), 0);
}

function getDesignFormats(dKey) {
  const config = availableDesigns.find(d => (typeof d === 'object' ? d.key : d) === dKey);
  if (typeof config === 'object' && config?.fmts) return config.fmts;
  return ['16x9', '1x1', '9x16', '4x5'];
}

function getDesignLabel(dKey) {
  const config = availableDesigns.find(d => (typeof d === 'object' ? d.key : d) === dKey);
  return (typeof config === 'object' ? config.label : dKey) || dKey;
}

function renderBasketDrawer() {
  const itemsEl = document.getElementById('drawer-items');
  const countEl = document.getElementById('drawer-item-count');
  const totalEl = document.getElementById('drawer-total');
  if (!itemsEl) return;

  if (countEl) countEl.textContent = `${basket.length} item${basket.length !== 1 ? 's' : ''}`;

  if (!basket.length) {
    itemsEl.innerHTML = '<div style="padding:40px 0;text-align:center;font-size:11px;color:var(--muted);">No items yet. Browse clips to add to your order.</div>';
    if (totalEl) totalEl.textContent = '';
    return;
  }

  itemsEl.innerHTML = basket.map((b, i) => {
    const clip = clipLibrary.find(c => c.id === b.clipId) || b.clip;
    const thumbSrc = clip?.relativePath ? `/api/thumb?path=${encodeURIComponent(clip.relativePath)}` : '';
    const rows = calcItemRenderRows(b);
    const totalFmts = (b.designs || []).reduce((sum, dk) => sum + getDesignFormats(dk).length, 0);

    const designRows = (b.designs || []).map(dk => {
      const fmts = getDesignFormats(dk);
      const label = getDesignLabel(dk);
      return `<div class="basket-item-design-row">
        <span class="basket-item-design-label">${esc(label)}</span>
        <div class="basket-item-tags">${fmts.map(f => `<span class="basket-item-tag">${esc(f)}</span>`).join('')}</div>
      </div>`;
    }).join('');

    return `<div class="basket-item-card" id="basket-card-${i}">
      <div class="basket-item-header">
        ${thumbSrc ? `<img class="basket-item-thumb" src="${esc(thumbSrc)}" alt="">` : '<div class="basket-item-thumb"></div>'}
        <div class="basket-item-meta">
          <div><span style="color:var(--accent);font-weight:500;">${esc(b.clip.slate)}</span> <span style="color:var(--text);">${esc(b.clip.actor)}</span>${b.clip.version ? ` <span style="color:var(--muted);">v${esc(b.clip.version)}</span>` : ''}</div>
          <div style="font-size:10px;color:var(--muted2);">${esc(b.clip.category)}</div>
        </div>
      </div>
      <div class="basket-item-copy">${esc(b.copyText?.en || b.copyKey || '—')}</div>
      <div class="basket-item-section">
        <div class="basket-item-section-label">Languages</div>
        <div class="basket-item-tags">${(b.langs || []).map(l => `<span class="basket-item-tag lang">${esc(l)}</span>`).join('')}</div>
      </div>
      <div class="basket-item-section">
        <div class="basket-item-section-label">Designs + Formats</div>
        ${designRows}
      </div>
      <div class="basket-item-actions">
        <span class="basket-item-rows">&rarr; ${rows} render rows <span style="color:var(--muted);">(${b.langs.length} langs &times; ${totalFmts} format slots)</span></span>
        <div class="basket-item-btns">
          <button class="btn-edit" onclick="editBasketItem(${i})">Edit</button>
          <button class="btn-remove" onclick="removeBasketItemConfirm(${i})">&times; Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const totalRows = calcTotalRenderRows();
  if (totalEl) totalEl.textContent = `${basket.length} clip${basket.length !== 1 ? 's' : ''} · ${totalRows} render rows total`;
}

function updateBasketBar() {
  const bar = document.getElementById('basket-bar');
  const n = basket.length;
  bar.classList.toggle('visible', n > 0);

  const clipsEl = document.getElementById('basket-bar-clips');
  const rowsEl = document.getElementById('basket-bar-rows');
  if (clipsEl) {
    const labels = basket.map(b => `${b.clip.slate} ${b.clip.actor}`);
    clipsEl.textContent = labels.length <= 3
      ? labels.join(', ')
      : labels.slice(0, 3).join(', ') + ` +${labels.length - 3} more`;
  }
  if (rowsEl) rowsEl.textContent = `${calcTotalRenderRows()} rows`;

  // Also update drawer if open
  if (drawerOpen) renderBasketDrawer();
}

function removeBasketItemConfirm(idx) {
  const item = basket[idx];
  if (!item) return;
  const needsConfirm = (item.langs?.length >= 3) || (item.designs?.length >= 2);
  if (needsConfirm && !confirm('Remove this item from your order?')) return;
  basket.splice(idx, 1);
  saveBasket();
  updateBasketBar();
  if (typeof renderGrid === 'function') renderGrid();
}

function editBasketItem(idx) {
  const item = basket[idx];
  if (!item) return;
  // Store editing state
  window._editingBasketIdx = idx;
  // Switch to browse by clips tab and open the detail panel
  showTab('browse');
  setTimeout(() => {
    if (typeof openDetailPanel === 'function') {
      // Pre-set selections from the basket item
      detailSelCopy = item.copyKey || '';
      detailSelLangs = item.langs ? [...item.langs] : ['EN'];
      detailSelDesigns = item.designs ? [...item.designs] : [];
      openDetailPanel(item.clipId);
    }
  }, 100);
}

function confirmSubmitOrder() {
  if (!basket.length) { toast('Add clips to your order first', true); return; }
  const totalRows = calcTotalRenderRows();
  const market = document.getElementById('order-market')?.value.trim() || '—';
  const body = document.getElementById('submit-confirm-body');
  if (body) body.innerHTML = `${basket.length} clip${basket.length !== 1 ? 's' : ''} &middot; ${totalRows} render rows &middot; Market: <strong>${esc(market)}</strong>`;
  document.getElementById('submit-confirm-modal').classList.remove('hidden');
}

async function submitOrder() {
  const market = document.getElementById('order-market')?.value.trim() || '';
  const note = document.getElementById('order-note')?.value.trim() || '';

  const items = basket.map(b => ({
    clipId: b.clipId,
    clipName: b.clip.nameNoExt,
    slate: b.clip.slate,
    category: b.clip.category,
    actor: b.clip.actor,
    copyKey: b.copyKey,
    copyText: b.copyText,
    langs: b.langs,
    designs: b.designs || [],
  }));

  try {
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, brand: selectedBrand, market, note, items })
    });
    if (!r.ok) throw new Error('Server error');
    clearBasket();
    document.getElementById('submit-confirm-modal').classList.add('hidden');
    if (drawerOpen) toggleBasketDrawer();
    toast('Order submitted — you\'ll be notified when clips are ready');
    showTab('orders');
  } catch (e) {
    toast('Failed to submit order: ' + e.message, true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ORDERS — VIEW (Growth Lead)
// ═══════════════════════════════════════════════════════════════

let _ordersCache = [];

async function loadOrders() {
  try {
    const r = await fetch('/api/orders');
    const orders = await r.json();
    const mine = currentUser?.role === 'admin'
      ? orders
      : orders.filter(o => o.user_id === currentUser?.id);
    _ordersCache = mine.slice().reverse();
    renderOrdersList(_ordersCache);
  } catch (e) {
    document.getElementById('orders-list').innerHTML = '<div style="color:var(--orange);font-size:10px;padding:20px;">Could not load orders</div>';
  }
}

function renderOrdersList(orders) {
  const list = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  if (!orders.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML = orders.map((o, idx) => {
    const date = formatDate(o.created);
    const statusClass = o.status || 'pending';
    const statusLabel = { 'pending': 'Pending', 'processing': 'Processing', 'ready': 'Ready' }[o.status] || o.status;
    const expanded = idx === 0;
    return `<div class="order-card" id="oc-${esc(o.id)}">
      <div class="order-header" onclick="toggleOrderDetail('${esc(o.id)}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="order-chevron${expanded ? ' open' : ''}" id="ochev-${esc(o.id)}">&#9654;</span>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;">${date} ${o.market ? '&middot; ' + esc(o.market) : ''}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">${esc(o.id)} &middot; ${o.items.length} clip${o.items.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <span class="order-status-badge ${esc(statusClass)}">${esc(statusLabel)}</span>
      </div>
      <div class="order-detail${expanded ? '' : ' hidden'}" id="od-${esc(o.id)}" data-rendered="${expanded ? '1' : ''}">${expanded ? renderOrderDetail(o) : ''}</div>
    </div>`;
  }).join('');
}

function toggleOrderDetail(orderId) {
  const detail = document.getElementById('od-' + orderId);
  const chev = document.getElementById('ochev-' + orderId);
  if (!detail) return;
  const isHidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden');
  if (chev) chev.classList.toggle('open', isHidden);
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
      ${thumbSrc ? `<img class="order-item-thumb" src="${esc(thumbSrc)}" alt="${esc(item.clipName)}">` : `<div class="order-item-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:20px;">&#127916;</div>`}
      <div style="padding:8px;">
        <div style="font-size:10px;color:var(--text);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.clipName)}</div>
        <div style="font-size:9px;color:var(--accent);margin-top:2px;">${esc(item.slate)}</div>
        <div style="font-size:9px;color:var(--muted2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc((item.copyText?.en || item.copyKey || '—').slice(0, 40))}</div>
        <div style="font-size:9px;color:var(--blue);margin-top:2px;">${esc(item.langs.join(', '))}</div>
        ${(item.designs || []).length ? `<div style="font-size:9px;color:var(--purple);margin-top:2px;">${esc(item.designs.join(', '))}</div>` : ''}
        ${rendered ? `<a class="download-btn" href="${esc(rendered.url)}" download="${esc(rendered.filename || 'clip')}" onclick="event.stopPropagation();">Download</a>` : ''}
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

  const vid = document.getElementById('ocm-video');
  const localClip = clipLibrary.find(c => c.id === item.clipId);
  if (localClip) vid.src = `/api/video?path=${encodeURIComponent(localClip.relativePath)}`;
  else vid.src = '';

  document.getElementById('ocm-panel').innerHTML = renderOrderClipPanel(order, item);
  document.getElementById('ocm-nav-label').textContent = `${itemIdx + 1} / ${order.items.length}`;
  document.getElementById('ocm-prev').disabled = itemIdx === 0;
  document.getElementById('ocm-next').disabled = itemIdx === order.items.length - 1;

  const dlEl = document.getElementById('ocm-downloads');
  const rendered = (order.rendered_clips || []).find(rc => rc.item_index === itemIdx || rc.item_id === item.clipId);
  dlEl.innerHTML = rendered ? `<a class="download-btn" href="${esc(rendered.url)}" download="${esc(rendered.filename || 'clip')}" style="display:block;text-align:center;">Download Rendered Clip</a>` : '';

  document.getElementById('order-clip-modal').classList.remove('hidden');
}

function renderOrderClipPanel(order, item) {
  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">Clip Info</div>
    <button onclick="closeOrderClipModal()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;padding:4px;">&times;</button>
  </div>`;
  html += `<div class="cm-info-block">
    <div class="cm-row"><span class="cm-label">Slate</span><span class="cm-val">${esc(item.slate)}</span></div>
    <div class="cm-row"><span class="cm-label">Category</span><span class="cm-val">${esc(item.category || '—')}</span></div>
    <div class="cm-row"><span class="cm-label">Actor</span><span class="cm-val">${esc(item.actor || '—')}</span></div>
    <div class="cm-row"><span class="cm-label">Clip</span><span class="cm-val">${esc(item.clipName)}</span></div>
  </div>`;
  if (item.copyText && typeof item.copyText === 'object') {
    html += `<div style="margin-top:18px;"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Copy</div><div style="background:var(--s3);border-radius:6px;padding:12px;">`;
    Object.entries(item.copyText).forEach(([lang, text]) => {
      if (text) html += `<div class="cm-copy-lang-row"><span class="cm-copy-lang-code">${esc(lang)}</span><span class="cm-copy-lang-text">${esc(text)}</span></div>`;
    });
    html += '</div></div>';
  }
  html += `<div style="margin-top:18px;"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Languages</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${(item.langs || []).map(l => `<span class="cm-lang-chip sel">${esc(l)}</span>`).join('')}</div></div>`;
  if ((item.designs || []).length) {
    html += `<div style="margin-top:18px;"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Designs</div><div style="display:flex;gap:8px;flex-wrap:wrap;">${item.designs.map(d => `<span class="cm-design-tile sel">${esc(d)}</span>`).join('')}</div></div>`;
  }
  html += `<div style="margin-top:18px;"><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Status</div><span class="order-status-badge ${esc(order.status || 'pending')}">${esc({ 'pending': 'Pending', 'processing': 'Processing', 'ready': 'Ready' }[order.status] || order.status)}</span></div>`;
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
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
