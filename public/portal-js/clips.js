// ═══════════════════════════════════════════════════════════════
//  CLIP LIBRARY — load from server, grid render, clip modal, basket ops
// ═══════════════════════════════════════════════════════════════

const CAT_SLUG = {'Product Usage':'PU','Travel and Holiday':'TH','Home Renovation':'HR',
  'Lifestyle and Events':'LE','Electronics and Devices':'EG','Financial Relief':'FR'};

async function loadClipsFromServer() {
  const status = document.getElementById('clips-status');
  if (status) status.textContent = 'Loading clips…';
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
      url:          '/api/video?path=' + encodeURIComponent(m.relativePath)
    })).filter(m => m.slate);
    clipLibrary.sort((a,b) => a.relativePath.localeCompare(b.relativePath));
    const allActors = [...new Set(clipLibrary.map(c => c.actor))].sort();
    populateActorFilter(allActors);
    if (status) status.textContent = '';
    document.getElementById('browse-filters').style.display = 'flex';
    renderGrid();
  } catch(e) {
    if (status) status.textContent = 'Could not load clips';
  }
}

function parseClip(name, file, relativePath) {
  const nameNoExt = name.replace(/\.[^.]+$/,'');
  const parts = nameNoExt.split('_');
  let category='', slateNum='', actor='', version='';

  if (parts.length >= 3) {
    const last = parts[parts.length-1];
    // Detect version suffix: pure digit (_2) or v+digit (_v2)
    const hasVer = /^\d+$/.test(last) || /^v\d+$/i.test(last);
    if (hasVer && parts.length >= 4) {
      version = last.replace(/^v/i,'');
      // Walk back from before version to find slate number
      let actorParts = [];
      let i = parts.length - 2; // start before version
      while (i > 0 && !/^\d+$/.test(parts[i])) { actorParts.unshift(parts[i]); i--; }
      slateNum = parts[i];
      actor    = actorParts.join(' ');
      category = parts.slice(0,i).join(' ');
    } else {
      let actorParts = [parts[parts.length-1]];
      let i = parts.length-2;
      while (i > 0 && !/^\d+$/.test(parts[i])) { actorParts.unshift(parts[i]); i--; }
      slateNum = parts[i];
      actor    = actorParts.join(' ');
      category = parts.slice(0,i).join(' ');
    }
  }

  // Prefer subfolder name as category
  const folderParts = relativePath.split('/');
  const subfolder = folderParts.length > 1 ? folderParts[folderParts.length-2] : '';
  const catMap = {'Product Usage':'Product Usage','Travel and Holiday':'Travel and Holiday',
    'Home Renovation':'Home Renovation','Lifestyle and Events':'Lifestyle and Events',
    'Electronics and Devices':'Electronics and Devices','Financial Relief':'Financial Relief'};
  if (catMap[subfolder]) category = subfolder;

  if (!slateNum) return null;
  const slug  = CAT_SLUG[category] || 'XX';
  const slate = `${slug}${slateNum}`;
  const url = file ? URL.createObjectURL(file) : '';

  return { id:nameNoExt, name, nameNoExt, relativePath, category, slate, actor:actor.trim(), version, url };
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

  document.getElementById('grid-count').textContent = `${clips.length} clips`;
  const grid  = document.getElementById('clip-grid');
  const empty = document.getElementById('browse-empty');
  if (!clips.length) { grid.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  grid.innerHTML = clips.map(clip => {
    const variants  = basket.filter(b => b.clipId === clip.id);
    const inBasket  = variants.length > 0;
    const hasCopy   = getCopyForClip(clip).length > 0;
    const badgeText = inBasket
      ? (variants.length > 1 ? `✓ ${variants.length} variants` : '✓ In order')
      : (hasCopy ? 'Click to view & order' : 'No copy loaded');
    return `<div class="clip-card${inBasket?' selected':''}" id="cc-${esc(clip.id.replace(/[^a-zA-Z0-9]/g,'_'))}" onclick="openClipModal('${esc(clip.id)}')">
      <div class="clip-check" onclick="event.stopPropagation();openClipModal('${esc(clip.id)}')">
        ${inBasket ? (variants.length > 1 ? variants.length : '✓') : ''}
      </div>
      <div class="clip-thumb">
        <img src="/api/thumb?path=${encodeURIComponent(clip.relativePath)}" loading="lazy" alt="">
        <div class="clip-play"><div class="clip-play-icon">▶</div></div>
      </div>
      <div class="clip-info">
        <div class="clip-name" title="${esc(clip.relativePath)}">${esc(clip.nameNoExt)}</div>
        <div class="clip-meta">${esc(clip.category)} · ${esc(clip.actor)}${clip.version?' · v'+clip.version:''}</div>
        <div style="font-size:9px;margin-top:4px;color:${inBasket?'var(--green)':hasCopy?'var(--muted)':'var(--orange)'};">
          ${badgeText}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── CLIP MODAL ──────────────────────────────────────────────────
let modalClipId = null;
let modalVisibleClips = [];
let modalCurIdx = 0;
// Per-modal selections (not committed to basket until Add is clicked)
let modalSelCopyKey  = '';
let modalSelLangs    = ['EN'];
let modalSelDesigns  = [];

function openClipModal(clipId) {
  const clip = clipLibrary.find(c => c.id === clipId);
  if (!clip) return;

  // Determine navigable clip list from current grid view
  const catF   = document.getElementById('filter-cat')?.value || '';
  const actorF = document.getElementById('filter-actor')?.value || '';
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  modalVisibleClips = clipLibrary.filter(c => {
    if (catF   && c.category !== catF)   return false;
    if (actorF && c.actor    !== actorF) return false;
    if (search && !c.name.toLowerCase().includes(search)) return false;
    return true;
  });
  modalCurIdx = modalVisibleClips.findIndex(c => c.id === clipId);
  modalClipId = clipId;

  // Reset modal selections to any existing basket item
  const bi = basket.find(b => b.clipId === clipId);
  modalSelCopyKey = bi?.copyKey || '';
  modalSelLangs   = bi?.langs ? [...bi.langs] : ['EN'];
  modalSelDesigns = bi?.designs ? [...bi.designs] : (availableDesigns.length ? [typeof availableDesigns[0]==='object' ? availableDesigns[0].key : availableDesigns[0]] : []);

  renderModalContent(clip);
  document.getElementById('clip-modal-overlay').classList.remove('hidden');
  document.addEventListener('keydown', modalKeyHandler);
}

function closeClipModal() {
  document.getElementById('clip-modal-overlay').classList.add('hidden');
  const vid = document.getElementById('cm-video');
  if (vid) { vid.pause(); vid.src = ''; }
  modalClipId = null;
  document.removeEventListener('keydown', modalKeyHandler);
}

function modalKeyHandler(e) {
  if (e.key === 'Escape') closeClipModal();
  if (e.key === 'ArrowLeft')  clipModalNav(-1);
  if (e.key === 'ArrowRight') clipModalNav(1);
}

function clipModalNav(dir) {
  const newIdx = modalCurIdx + dir;
  if (newIdx < 0 || newIdx >= modalVisibleClips.length) return;
  const vid = document.getElementById('cm-video');
  if (vid) { vid.pause(); vid.src = ''; }
  modalCurIdx = newIdx;
  const clip  = modalVisibleClips[newIdx];
  modalClipId = clip.id;
  // Reset selections for new clip
  const bi = basket.find(b => b.clipId === clip.id);
  modalSelCopyKey = bi?.copyKey || '';
  modalSelLangs   = bi?.langs ? [...bi.langs] : ['EN'];
  modalSelDesigns = bi?.designs ? [...bi.designs] : (availableDesigns.length ? [typeof availableDesigns[0]==='object' ? availableDesigns[0].key : availableDesigns[0]] : []);
  renderModalContent(clip);
}

function renderModalContent(clip) {
  // Video
  const vid = document.getElementById('cm-video');
  vid.src = clip.url;
  vid.load();
  document.getElementById('cm-path').textContent = clip.relativePath;

  // Nav label
  document.getElementById('cm-nav-label').textContent =
    `${modalCurIdx+1} / ${modalVisibleClips.length}  ·  ${clip.category} · ${clip.actor}`;
  document.getElementById('cm-prev').disabled = modalCurIdx === 0;
  document.getElementById('cm-next').disabled = modalCurIdx === modalVisibleClips.length - 1;

  // Info block
  const SCENE_MAP = {};
  if (typeof SCENE_DATA !== 'undefined') SCENE_DATA.forEach(s => { SCENE_MAP[s.slate] = s; });
  const scene = SCENE_MAP[clip.slate] || {};
  document.getElementById('cm-info').innerHTML = `
    <div class="cm-row"><span class="cm-label">Slate</span><span class="cm-val" style="color:var(--accent);">${esc(clip.slate)}</span></div>
    <div class="cm-row"><span class="cm-label">Category</span><span class="cm-val">${esc(clip.category)}</span></div>
    <div class="cm-row"><span class="cm-label">Actor</span><span class="cm-val">${esc(clip.actor)}${clip.version?' · v'+clip.version:''}</span></div>
    ${scene.markets?`<div class="cm-row"><span class="cm-label">Markets</span><span class="cm-val">${esc(scene.markets)}</span></div>`:''}
    ${scene.shot?`<div class="cm-row"><span class="cm-label">Shot</span><span class="cm-val">${esc(scene.shot)}</span></div>`:''}
    <div style="font-size:9px;color:var(--muted);margin-top:6px;">📁 ${esc(clip.relativePath)}</div>`;

  // Copy dropdown
  const copyOpts = getCopyForClip(clip);
  const sel = document.getElementById('cm-copy-select');
  sel.innerHTML = (copyRows.length ? '<option value="">— choose copy —</option>' : '<option value="">No copy sheet configured yet</option>') +
    copyOpts.map(r => `<option value="${esc(r.key)}" ${modalSelCopyKey===r.key?'selected':''}>${esc(r.en.slice(0,50))}</option>`).join('');

  // Render copy translations
  renderModalCopyLangs();

  // Language chips
  renderModalLangChips();

  // Design chips
  renderModalDesignChips();

  // Duplicate warning
  checkModalDuplicate();

  // Show existing variants of this clip in the basket
  renderModalExistingVariants();
}

function onCopySelect() {
  modalSelCopyKey = document.getElementById('cm-copy-select').value;
  renderModalCopyLangs();
  checkModalDuplicate();
}

function renderModalCopyLangs() {
  const el = document.getElementById('cm-copy-langs');
  if (!modalSelCopyKey) { el.style.display='none'; return; }
  const row = copyRows.find(r => r.key === modalSelCopyKey);
  if (!row) { el.style.display='none'; return; }
  el.style.display = 'block';
  el.innerHTML = LANGS
    .filter(l => row[l.toLowerCase()])
    .map(l => `<div class="cm-copy-lang-row">
      <span class="cm-copy-lang-code">${l}</span>
      <span class="cm-copy-lang-text">${esc(row[l.toLowerCase()])}</span>
    </div>`).join('');
}

function renderModalLangChips() {
  document.getElementById('cm-lang-chips').innerHTML = LANGS.map(l =>
    `<div class="cm-lang-chip${modalSelLangs.includes(l)?' sel':''}" onclick="toggleModalLang('${l}')">${l}</div>`
  ).join('');
}

function toggleModalLang(lang) {
  if (modalSelLangs.includes(lang)) {
    if (modalSelLangs.length === 1) return;
    modalSelLangs = modalSelLangs.filter(l => l !== lang);
  } else {
    modalSelLangs.push(lang);
  }
  renderModalLangChips();
  checkModalDuplicate();
}

function renderModalDesignChips() {
  const el = document.getElementById('cm-design-chips');
  if (!availableDesigns.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--muted);">No designs configured — ask admin to add designs in AD.FACTORY</div>';
    return;
  }
  el.innerHTML = availableDesigns.map(d => {
    const key   = typeof d === 'object' ? (d.key   || '') : d;
    const label = typeof d === 'object' ? (d.label || key) : d;
    const img16 = typeof d === 'object' ? (d.images?.['16x9'] || '') : '';
    const sel   = modalSelDesigns.includes(key);
    return `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
      <div class="cm-design-tile${sel?' sel':''}" onclick="toggleModalDesign('${esc(key)}')" style="padding:0;overflow:hidden;min-width:90px;max-width:140px;">
        ${img16
          ? `<img src="${esc(img16)}" style="width:100%;height:56px;object-fit:cover;display:block;">`
          : `<div style="height:56px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:20px;">🎨</div>`}
        <div style="padding:5px 8px;font-size:9px;text-align:center;">${esc(label)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding:0 2px;">
        <input type="checkbox" ${sel?'checked':''} onclick="toggleModalDesign('${esc(key)}')" style="cursor:pointer;margin:0;">
        ${img16 ? `<button onclick="previewDesignImg('${esc(img16)}')" style="background:none;border:none;font-size:9px;color:var(--muted2);cursor:pointer;padding:0;text-decoration:underline;">View</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function toggleModalDesign(key) {
  if (modalSelDesigns.includes(key)) {
    if (modalSelDesigns.length === 1) return;
    modalSelDesigns = modalSelDesigns.filter(k => k !== key);
  } else {
    modalSelDesigns.push(key);
  }
  renderModalDesignChips();
  checkModalDuplicate();
}

function checkModalDuplicate() {
  const warn = document.getElementById('cm-duplicate-warning');
  if (!modalClipId || !modalSelCopyKey || !modalSelDesigns.length) { warn.style.display='none'; return; }
  const isDup = basket.some(b =>
    b.clipId    === modalClipId &&
    b.copyKey   === modalSelCopyKey &&
    (b.designs||[b.design]).join(',') === modalSelDesigns.join(',') &&
    b.langs.length === modalSelLangs.length &&
    b.langs.every(l => modalSelLangs.includes(l))
  );
  warn.style.display = isDup ? 'block' : 'none';
}

function renderModalExistingVariants() {
  const el = document.getElementById('cm-existing-variants');
  if (!el || !modalClipId) { if (el) el.innerHTML = ''; return; }
  const variants = basket.filter(b => b.clipId === modalClipId);
  if (!variants.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="font-size:10px;color:var(--muted);margin-bottom:6px;">${variants.length} variant${variants.length>1?'s':''} already in order:</div>` +
    variants.map((v, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s3);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:10px;">
      <span style="color:var(--muted);width:16px;">${i+1}.</span>
      <span style="color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(v.copyText?.en||v.copyKey||'—')}</span>
      <span style="color:var(--blue);">${v.langs.join(',')}</span>
      <span style="color:var(--purple);">${(v.designs||[]).join(',')}</span>
      <button style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:12px;padding:2px 4px;" onclick="removeVariant(${i});renderModalExistingVariants()" title="Remove">✕</button>
    </div>`).join('');
}

function removeVariant(basketIdx) {
  const variants = basket.filter(b => b.clipId === modalClipId);
  const item = variants[basketIdx];
  if (!item) return;
  const globalIdx = basket.indexOf(item);
  if (globalIdx >= 0) basket.splice(globalIdx, 1);
  saveBasket();
  updateBasketBar();
  renderGrid();
}

function addClipFromModal() {
  if (!modalClipId) return;
  if (!modalSelCopyKey) { toast('Select a copy first', true); return; }
  if (!modalSelDesigns.length && availableDesigns.length) { toast('Select a design first', true); return; }

  // Check for exact duplicate
  const isDup = basket.some(b =>
    b.clipId    === modalClipId &&
    b.copyKey   === modalSelCopyKey &&
    (b.designs||[b.design]).join(',') === modalSelDesigns.join(',') &&
    b.langs.length === modalSelLangs.length &&
    b.langs.every(l => modalSelLangs.includes(l))
  );
  if (isDup) { toast('This exact combination is already in your order', true); return; }

  const clip = clipLibrary.find(c => c.id === modalClipId);
  if (!clip) return;

  basket.push({
    clipId:   modalClipId,
    clip:     {name:clip.name,nameNoExt:clip.nameNoExt,slate:clip.slate,category:clip.category,actor:clip.actor,relativePath:clip.relativePath},
    copyKey:  modalSelCopyKey,
    copyText: buildCopyText(modalSelCopyKey),
    langs:    [...modalSelLangs],
    designs:  [...modalSelDesigns],
  });

  saveBasket();
  updateBasketBar();
  renderGrid();

  // Count how many variants of this clip are now in the basket
  const variantCount = basket.filter(b => b.clipId === modalClipId).length;
  toast(`✓ Added variant ${variantCount} — change copy/design/lang to add another`);

  // Reset selections so user can immediately add another variant
  modalSelCopyKey = '';
  modalSelDesigns = availableDesigns.length ? [typeof availableDesigns[0]==='object' ? availableDesigns[0].key : availableDesigns[0]] : [];
  modalSelLangs = ['EN'];
  // Re-render modal selections (keep modal open)
  const clipStill = clipLibrary.find(c => c.id === modalClipId);
  if (clipStill) renderModalContent(clipStill);
}

function toggleClipSelect(clipId) {
  // Quick-remove if already in basket; otherwise open modal to configure
  const inBasket = basket.some(b => b.clipId === clipId);
  if (inBasket) { removeFromBasket(clipId); renderGrid(); }
  else openClipModal(clipId);
}

function removeFromBasket(clipId) {
  basket = basket.filter(b => b.clipId !== clipId);
  saveBasket();
  updateBasketBar();
  refreshCard(clipId);
}

function clearBasket() {
  basket = [];
  saveBasket();
  updateBasketBar();
  renderGrid();
}

function buildCopyText(key) {
  const row = copyRows.find(r => r.key === key);
  if (!row) return {};
  return {en:row.en||'',et:row.et||'',fr:row.fr||'',de:row.de||'',es:row.es||''};
}

function saveBasket() { localStorage.setItem('gp_basket', JSON.stringify(basket)); }

function updateBasketBar() {
  const bar = document.getElementById('basket-bar');
  const n   = basket.length;
  document.getElementById('basket-count-num').textContent = n;
  bar.classList.toggle('visible', n > 0);
  const allLangs = [...new Set(basket.flatMap(b => b.langs))].sort();
  document.getElementById('basket-langs-summary').textContent = allLangs.length ? '· '+allLangs.join(', ') : '';
}

function refreshCard(clipId) {
  const safe   = clipId.replace(/[^a-zA-Z0-9]/g,'_');
  const card   = document.getElementById('cc-'+safe);
  if (!card) return;
  const clip   = clipLibrary.find(c => c.id === clipId);
  const bi     = basket.find(b => b.clipId === clipId);
  const inBasket = !!bi;
  card.className = 'clip-card' + (inBasket ? ' selected' : '');
  const check  = card.querySelector('.clip-check');
  if (check) check.textContent = inBasket ? '✓' : '';
  const copyOpts = getCopyForClip(clip);
  const cpanel = card.querySelector('.copy-panel');
  if (cpanel && clip) cpanel.outerHTML = copyOpts.length
    ? renderCopyPanel(clip, copyOpts, inBasket)
    : '<div class="copy-panel"><div style="font-size:9px;color:var(--orange);">No copy loaded</div></div>';
}
