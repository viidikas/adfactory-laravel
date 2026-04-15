// ═══════════════════════════════════════════════════════════════
//  MODE B — BROWSE BY CLIPS (clip-first flow)
// ═══════════════════════════════════════════════════════════════

const CAT_SLUG = {'Product Usage':'PU','Travel and Holiday':'TH','Home Renovation':'HR',
  'Lifestyle and Events':'LE','Electronics and Devices':'EG','Financial Relief':'FR'};

async function loadClipsFromServer() {
  const status = document.getElementById('clips-status');
  if (status) status.textContent = 'Loading clips...';
  try {
    const r = await fetch('/api/clips');
    const metas = await r.json();
    if (!metas.length) {
      if (status) status.textContent = 'No clips synced yet — admin needs to scan clips in AD.FACTORY step 2.';
      return;
    }
    clipLibrary = metas.map(m => ({
      id:           m.id || m.nameNoExt || m.name.replace(/\.[^.]+$/, ''),
      name:         m.name,
      nameNoExt:    m.nameNoExt || m.name.replace(/\.[^.]+$/, ''),
      relativePath: m.relativePath,
      category:     m.category || '',
      slate:        m.slate    || '',
      slateNum:     m.slateNum || '',
      actor:        m.actor    || '',
      version:      m.version  || '',
      description:  m.description || '',
      markets:      m.markets  || '',
      copy:         m.copy     || [],
      url:          '/api/video?path=' + encodeURIComponent(m.relativePath)
    })).filter(m => m.slate);

    // Populate copyLines from enriched clips if not already loaded
    if (!copyLines.length) {
      const seen = new Set();
      clipLibrary.forEach(c => {
        (c.copy || []).forEach(row => {
          const k = row.en + '|' + (row.shot || '');
          if (!seen.has(k)) { seen.add(k); copyLines.push(row); copyRows.push(row); }
        });
      });
    }

    clipLibrary.sort((a,b) => a.relativePath.localeCompare(b.relativePath));
    const allActors = [...new Set(clipLibrary.map(c => c.actor))].sort();
    populateActorFilter(allActors);
    if (status) status.textContent = '';
    const filters = document.getElementById('browse-filters');
    if (filters) filters.style.display = 'flex';
    renderGrid();
  } catch(e) {
    if (status) status.textContent = 'Could not load clips';
  }
}

function populateActorFilter(actors) {
  const af = document.getElementById('filter-actor');
  if (!af) return;
  af.innerHTML = '<option value="">All actors</option>' +
    actors.map(a => `<option>${esc(a)}</option>`).join('');
}

function onCatFilterChange() {
  const cat = document.getElementById('filter-cat').value;
  const filtered = cat ? clipLibrary.filter(c => c.category === cat) : clipLibrary;
  const actors = [...new Set(filtered.map(c => c.actor))].sort();
  populateActorFilter(actors);
  renderGrid();
}

function renderGrid() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const catF   = document.getElementById('filter-cat')?.value   || '';
  const actorF = document.getElementById('filter-actor')?.value || '';

  let clips = clipLibrary.filter(c => {
    if (catF   && c.category !== catF)   return false;
    if (actorF && c.actor    !== actorF) return false;
    if (search && !c.name.toLowerCase().includes(search) &&
        !c.category.toLowerCase().includes(search) &&
        !c.actor.toLowerCase().includes(search)) return false;
    return true;
  });

  const countEl = document.getElementById('grid-count');
  if (countEl) countEl.textContent = `${clips.length} clips`;
  const grid  = document.getElementById('clip-grid');
  const empty = document.getElementById('browse-empty');
  if (!grid) return;
  if (!clips.length) { grid.innerHTML=''; if (empty) empty.classList.remove('hidden'); return; }
  if (empty) empty.classList.add('hidden');

  grid.innerHTML = clips.map(clip => {
    const variants = basket.filter(b => b.clipId === clip.id);
    const inBasket = variants.length > 0;
    const hasCopy  = getCopyForClip(clip).length > 0;
    const badgeText = inBasket
      ? (variants.length > 1 ? `${variants.length} variants` : 'In order')
      : (hasCopy ? '' : 'No copy');
    return `<div class="clip-card${inBasket?' selected':''}" onclick="openDetailPanel('${esc(clip.id)}')">
      ${inBasket ? `<div class="clip-check">${variants.length > 1 ? variants.length : '&#10003;'}</div>` : ''}
      <div class="clip-thumb">
        <img src="/api/thumb?path=${encodeURIComponent(clip.relativePath)}" loading="lazy" alt="">
      </div>
      <div class="clip-info">
        <div class="clip-name" title="${esc(clip.relativePath)}">${esc(clip.nameNoExt)}</div>
        <div class="clip-meta">${esc(clip.category)} &middot; ${esc(clip.actor)}</div>
        ${badgeText ? `<div style="font-size:9px;margin-top:3px;color:${inBasket?'var(--green)':'var(--orange)'};">${badgeText}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE-IN DETAIL PANEL (replaces modal for Mode B)
// ═══════════════════════════════════════════════════════════════
let detailClipId = null;
let detailSelCopy = '';
let detailSelLangs = ['EN'];
let detailSelDesigns = [];

function openDetailPanel(clipId) {
  const clip = clipLibrary.find(c => c.id === clipId);
  if (!clip) return;
  detailClipId = clipId;

  // Reset selections
  const bi = basket.find(b => b.clipId === clipId);
  detailSelCopy = bi?.copyKey || '';
  detailSelLangs = bi?.langs ? [...bi.langs] : ['EN'];
  detailSelDesigns = bi?.designs ? [...bi.designs] : (availableDesigns.length ? [typeof availableDesigns[0]==='object' ? availableDesigns[0].key : availableDesigns[0]] : []);

  renderDetailPanel(clip);
  document.getElementById('clip-detail-panel').classList.remove('hidden');
}

function closeDetailPanel() {
  const panel = document.getElementById('clip-detail-panel');
  if (panel) panel.classList.add('hidden');
  detailClipId = null;
}

function renderDetailPanel(clip) {
  const panel = document.getElementById('clip-detail-panel');
  if (!panel) return;

  const copyOpts = getCopyForClip(clip);
  const variants = basket.filter(b => b.clipId === clip.id);

  panel.innerHTML = `
    <div class="detail-panel-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;">Clip Detail</div>
        <button onclick="closeDetailPanel()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;">&times;</button>
      </div>

      <video src="${esc(clip.url)}" controls autoplay muted style="width:100%;border-radius:8px;background:#000;margin-bottom:12px;"></video>

      <div class="cm-info-block" style="margin-bottom:14px;">
        <div class="cm-row"><span class="cm-label">Slate</span><span class="cm-val" style="color:var(--accent);">${esc(clip.slate)}</span></div>
        <div class="cm-row"><span class="cm-label">Category</span><span class="cm-val">${esc(clip.category)}</span></div>
        <div class="cm-row"><span class="cm-label">Actor</span><span class="cm-val">${esc(clip.actor)}${clip.version?' &middot; v'+clip.version:''}</span></div>
        ${clip.description ? `<div class="cm-row"><span class="cm-label">Shot</span><span class="cm-val">${esc(clip.description)}</span></div>` : ''}
        ${clip.markets ? `<div class="cm-row"><span class="cm-label">Markets</span><span class="cm-val">${esc(clip.markets)}</span></div>` : ''}
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:6px;">Copy</div>
        <select id="detail-copy-select" onchange="onDetailCopyChange()" style="width:100%;background:var(--s3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:9px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;">
          ${copyOpts.length ? '<option value="">— choose copy —</option>' : '<option value="">No copy available</option>'}
          ${copyOpts.map(r => `<option value="${esc(r.key)}" ${detailSelCopy===r.key?'selected':''}>${esc(r.en.slice(0,50))}</option>`).join('')}
        </select>
        <div id="detail-copy-langs" style="background:var(--s3);border-radius:6px;padding:10px;margin-top:8px;display:${detailSelCopy?'block':'none'};">
          ${renderCopyLangsHtml(detailSelCopy)}
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:6px;">Languages</div>
        <div id="detail-lang-chips" style="display:flex;gap:6px;flex-wrap:wrap;">
          ${LANGS.map(l => `<div class="cm-lang-chip${detailSelLangs.includes(l)?' sel':''}" onclick="toggleDetailLang('${l}')">${l}</div>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:6px;">Designs</div>
        <div id="detail-design-chips" style="display:flex;gap:8px;flex-wrap:wrap;">
          ${renderDetailDesignsHtml()}
        </div>
      </div>

      ${variants.length ? `<div style="margin-bottom:14px;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;">${variants.length} variant${variants.length>1?'s':''} in order</div>
        ${variants.map((v,i) => `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--s3);border:1px solid var(--border);border-radius:5px;margin-bottom:3px;font-size:9px;">
          <span style="color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(v.copyText?.en||v.copyKey||'—')}</span>
          <span style="color:var(--blue);">${v.langs.join(',')}</span>
          <button style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:11px;" onclick="removeBasketItem(${basket.indexOf(v)})">&#10005;</button>
        </div>`).join('')}
      </div>` : ''}

      <button class="btn btn-primary" style="width:100%;" onclick="addFromDetailPanel()">${window._editingBasketIdx !== undefined ? 'Update item' : '+ Add to order'}</button>
    </div>`;
}

function renderCopyLangsHtml(copyKey) {
  if (!copyKey) return '';
  const row = copyLines.find(r => r.key === copyKey);
  if (!row) return '';
  return LANGS.filter(l => row[l.toLowerCase()])
    .map(l => `<div class="cm-copy-lang-row"><span class="cm-copy-lang-code">${l}</span><span class="cm-copy-lang-text">${esc(row[l.toLowerCase()])}</span></div>`)
    .join('');
}

function renderDetailDesignsHtml() {
  if (!availableDesigns.length) return '<div style="font-size:10px;color:var(--muted);">No designs configured</div>';
  return availableDesigns.map(d => {
    const key = typeof d==='object' ? (d.key||'') : d;
    const label = typeof d==='object' ? (d.label||key) : d;
    const img = typeof d==='object' ? (d.images?.['16x9']||'') : '';
    const sel = detailSelDesigns.includes(key);
    return `<div style="display:flex;flex-direction:column;gap:3px;">
      <div class="cm-design-tile${sel?' sel':''}" onclick="toggleDetailDesign('${esc(key)}')" style="padding:0;overflow:hidden;min-width:80px;max-width:120px;">
        ${img ? `<img src="${esc(img)}" style="width:100%;height:48px;object-fit:cover;display:block;">` : `<div style="height:48px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:16px;">&#127912;</div>`}
        <div style="padding:4px 6px;font-size:8px;text-align:center;">${esc(label)}</div>
      </div>
      ${img ? `<button onclick="event.stopPropagation();previewDesignImg('${esc(img)}')" style="background:none;border:none;font-size:8px;color:var(--blue);cursor:pointer;text-decoration:underline;padding:0;">View</button>` : ''}
    </div>`;
  }).join('');
}

function onDetailCopyChange() {
  detailSelCopy = document.getElementById('detail-copy-select').value;
  const el = document.getElementById('detail-copy-langs');
  if (el) {
    el.style.display = detailSelCopy ? 'block' : 'none';
    el.innerHTML = renderCopyLangsHtml(detailSelCopy);
  }
}

function toggleDetailLang(lang) {
  if (detailSelLangs.includes(lang)) {
    if (detailSelLangs.length === 1) return;
    detailSelLangs = detailSelLangs.filter(l => l !== lang);
  } else {
    detailSelLangs.push(lang);
  }
  document.getElementById('detail-lang-chips').innerHTML =
    LANGS.map(l => `<div class="cm-lang-chip${detailSelLangs.includes(l)?' sel':''}" onclick="toggleDetailLang('${l}')">${l}</div>`).join('');
}

function toggleDetailDesign(key) {
  if (detailSelDesigns.includes(key)) {
    if (detailSelDesigns.length === 1) return;
    detailSelDesigns = detailSelDesigns.filter(k => k !== key);
  } else {
    detailSelDesigns.push(key);
  }
  document.getElementById('detail-design-chips').innerHTML = renderDetailDesignsHtml();
}

function addFromDetailPanel() {
  if (!detailClipId) return;
  if (!detailSelCopy) { toast('Select a copy first', true); return; }
  if (!detailSelDesigns.length && availableDesigns.length) { toast('Select a design', true); return; }

  const clip = clipLibrary.find(c => c.id === detailClipId);
  if (!clip) return;

  const newItem = {
    clipId: detailClipId,
    clip: {name:clip.name,nameNoExt:clip.nameNoExt,slate:clip.slate,category:clip.category,actor:clip.actor,relativePath:clip.relativePath},
    brand: selectedBrand,
    copyKey: detailSelCopy,
    copyText: buildCopyText(detailSelCopy),
    langs: [...detailSelLangs],
    designs: [...detailSelDesigns],
  };

  // Check if editing existing basket item
  const editIdx = window._editingBasketIdx;
  if (editIdx !== undefined && editIdx !== null && basket[editIdx]) {
    basket[editIdx] = newItem;
    window._editingBasketIdx = undefined;
    saveBasket();
    updateBasketBar();
    renderGrid();
    toast('Order item updated');
    renderDetailPanel(clip);
    return;
  }

  // Check for duplicate
  const isDup = basket.some(b =>
    b.clipId === detailClipId &&
    b.copyKey === detailSelCopy &&
    (b.designs||[]).join(',') === detailSelDesigns.join(',') &&
    b.langs.length === detailSelLangs.length &&
    b.langs.every(l => detailSelLangs.includes(l))
  );
  if (isDup) { toast('This combination is already in your order', true); return; }

  basket.push(newItem);
  saveBasket();
  updateBasketBar();
  renderGrid();
  toast('Added to order');
  renderDetailPanel(clip);
}

function removeBasketItem(idx) {
  basket.splice(idx, 1);
  saveBasket();
  updateBasketBar();
  renderGrid();
  if (detailClipId) {
    const clip = clipLibrary.find(c => c.id === detailClipId);
    if (clip) renderDetailPanel(clip);
  }
}

function buildCopyText(key) {
  const row = copyLines.find(r => r.key === key);
  if (!row) return {};
  return {en:row.en||'',et:row.et||'',fr:row.fr||'',de:row.de||'',es:row.es||''};
}

function saveBasket() { localStorage.setItem('gp_basket', JSON.stringify(basket)); }

function updateBasketBar() {
  const bar = document.getElementById('basket-bar');
  const n = basket.length;
  document.getElementById('basket-count-num').textContent = n;
  bar.classList.toggle('visible', n > 0);
  const allLangs = [...new Set(basket.flatMap(b => b.langs))].sort();
  document.getElementById('basket-langs-summary').textContent = allLangs.length ? '· '+allLangs.join(', ') : '';
}

function clearBasket() {
  basket = [];
  saveBasket();
  updateBasketBar();
  renderGrid();
}
