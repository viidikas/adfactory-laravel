// ═══════════════════════════════════════════════════════════════
//  MODE A — BROWSE BY COPY (copy-first flow)
// ═══════════════════════════════════════════════════════════════

const CATEGORIES = ['Product Usage','Travel and Holiday','Home Renovation',
  'Lifestyle and Events','Electronics and Devices','Financial Relief'];

let copyBrowseCatFilter = '';

function initCopyBrowse() {
  showCopyStep(1);
  renderCopyCatChips();
  renderCopyGrid();
}

function showCopyStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('copy-step-'+i);
    if (el) el.classList.toggle('hidden', i !== n);
  });
}

// ── Step 1: Copy card grid ─────────────────────────────────────
function renderCopyCatChips() {
  const el = document.getElementById('copy-cat-chips');
  if (!el) return;
  const cats = ['', ...CATEGORIES];
  el.innerHTML = cats.map(c =>
    `<span class="cat-chip${copyBrowseCatFilter===c?' sel':''}" onclick="setCopyCatFilter('${esc(c)}')">${c || 'All'}</span>`
  ).join('');
  el.style.display = 'flex';
}

function setCopyCatFilter(cat) {
  copyBrowseCatFilter = cat;
  renderCopyCatChips();
  renderCopyGrid();
}

function renderCopyGrid() {
  const grid  = document.getElementById('copy-grid');
  const empty = document.getElementById('copy-empty');
  const status = document.getElementById('copy-browse-status');
  if (!grid) return;

  if (!copyLines.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (status) status.textContent = 'Loading copy lines...';
    return;
  }
  if (status) status.textContent = '';
  if (empty) empty.classList.add('hidden');

  let lines = copyLines;
  if (copyBrowseCatFilter) {
    lines = lines.filter(r => r.category === copyBrowseCatFilter);
  }

  if (!lines.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  grid.innerHTML = lines.map((row, i) => {
    const translations = ['et','fr','de','es']
      .filter(l => row[l])
      .map(l => `<span style="color:var(--muted);font-size:9px;">${l.toUpperCase()}: ${esc(row[l].slice(0,40))}</span>`)
      .join(' &middot; ');

    return `<div class="copy-card" onclick="selectCopyLine(${i})">
      <div class="copy-card-cat">${esc(row.category || 'General')}</div>
      <div class="copy-card-en">${esc(row.en)}</div>
      <div class="copy-card-translations">${translations || '<span style="color:var(--muted);font-size:9px;">No translations</span>'}</div>
      ${row.shot ? `<div class="copy-card-shot">${esc(row.shot)}</div>` : ''}
    </div>`;
  }).join('');
}

function selectCopyLine(idx) {
  const filtered = copyLines.filter(r => !copyBrowseCatFilter || r.category === copyBrowseCatFilter);
  const row = filtered[idx];
  if (!row) return;

  sharedState.selectedCopy = row;
  sharedState.selectedCategory = row.category;
  sharedState.selectedClips = [];

  showCopyStep(2);
  renderCopyClipGrid();
}

// ── Step 2: Clip selector (filtered by copy's category) ────────
function renderCopyClipGrid() {
  const copy = sharedState.selectedCopy;
  if (!copy) return;

  const breadcrumb = document.getElementById('copy-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="showCopyStep(1);sharedState.selectedCopy=null;">&#8592; Back to copies</button>
      <span style="font-size:11px;color:var(--accent);margin-left:12px;">${esc(copy.en)}</span>
      <span style="font-size:10px;color:var(--muted);margin-left:8px;">${esc(copy.category)}</span>`;
  }

  // Filter clips: by slate codes if specified, otherwise by category
  const shotCodes = (copy.shot || '').split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  const cat = (copy.category || '').toLowerCase();
  const clips = clipLibrary.filter(c => {
    if (shotCodes.length) {
      return shotCodes.includes((c.slate || '').toUpperCase());
    }
    return (c.category || '').toLowerCase() === cat;
  });
  const grid = document.getElementById('copy-clip-grid');
  const empty = document.getElementById('copy-clip-empty');

  if (!clips.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  // Store filtered clips for modal navigation
  window._copyClipList = clips;

  grid.innerHTML = clips.map(clip => {
    const selected = sharedState.selectedClips.includes(clip.id);
    return `<div class="clip-card${selected?' selected':''}" onclick="openCopyClipModal('${esc(clip.id)}')">
      <div class="clip-check">${selected ? '&#10003;' : ''}</div>
      <div class="clip-thumb">
        <img src="/api/thumb?path=${encodeURIComponent(clip.relativePath)}" loading="lazy" alt="">
        <div class="clip-play"><div class="clip-play-icon">&#9654;</div></div>
      </div>
      <div class="clip-info">
        <div class="clip-name">${esc(clip.nameNoExt)}</div>
        <div class="clip-meta">${esc(clip.slate)} &middot; ${esc(clip.actor)}</div>
      </div>
    </div>`;
  }).join('');

  // Show continue button if clips selected
  const existing = document.getElementById('copy-clip-continue');
  if (existing) existing.remove();
  if (sharedState.selectedClips.length) {
    const btn = document.createElement('div');
    btn.id = 'copy-clip-continue';
    btn.style.cssText = 'position:sticky;bottom:80px;padding:16px 0;text-align:center;';
    btn.innerHTML = `<button class="btn btn-primary" onclick="goToCopyStep3()">${sharedState.selectedClips.length} clip${sharedState.selectedClips.length>1?'s':''} selected — Choose languages &amp; designs &rarr;</button>`;
    grid.parentNode.appendChild(btn);
  }
}

function toggleCopyClip(clipId) {
  const idx = sharedState.selectedClips.indexOf(clipId);
  if (idx >= 0) sharedState.selectedClips.splice(idx, 1);
  else sharedState.selectedClips.push(clipId);
  renderCopyClipGrid();
}

// ── Copy-browse clip preview modal ─────────────────────────────
let _ccmClipIdx = 0;

function openCopyClipModal(clipId) {
  const clips = window._copyClipList || [];
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx < 0) return;
  _ccmClipIdx = idx;
  renderCopyClipModal(clips[idx]);
  document.getElementById('copy-clip-modal').classList.remove('hidden');
  document.addEventListener('keydown', ccmKeyHandler);
}

function closeCopyClipModal() {
  document.getElementById('copy-clip-modal').classList.add('hidden');
  const vid = document.getElementById('ccm-video');
  if (vid) { vid.pause(); vid.src = ''; }
  document.removeEventListener('keydown', ccmKeyHandler);
}

function ccmKeyHandler(e) {
  if (e.key === 'Escape') closeCopyClipModal();
  if (e.key === 'ArrowLeft') copyClipModalNav(-1);
  if (e.key === 'ArrowRight') copyClipModalNav(1);
}

function copyClipModalNav(dir) {
  const clips = window._copyClipList || [];
  const newIdx = _ccmClipIdx + dir;
  if (newIdx < 0 || newIdx >= clips.length) return;
  const vid = document.getElementById('ccm-video');
  if (vid) { vid.pause(); vid.src = ''; }
  _ccmClipIdx = newIdx;
  renderCopyClipModal(clips[newIdx]);
}

function renderCopyClipModal(clip) {
  const clips = window._copyClipList || [];
  const copy = sharedState.selectedCopy;
  const selected = sharedState.selectedClips.includes(clip.id);

  // Video
  const vid = document.getElementById('ccm-video');
  vid.src = clip.url || '/api/video?path=' + encodeURIComponent(clip.relativePath);
  vid.load();

  // Nav
  document.getElementById('ccm-nav-label').textContent =
    `${_ccmClipIdx + 1} / ${clips.length}  ·  ${clip.category} · ${clip.actor}`;
  document.getElementById('ccm-prev').disabled = _ccmClipIdx === 0;
  document.getElementById('ccm-next').disabled = _ccmClipIdx === clips.length - 1;

  // Info panel
  document.getElementById('ccm-panel').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">Clip Info</div>
      <button onclick="closeCopyClipModal()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;">&times;</button>
    </div>
    <div class="cm-info-block">
      <div class="cm-row"><span class="cm-label">Slate</span><span class="cm-val" style="color:var(--accent);">${esc(clip.slate)}</span></div>
      <div class="cm-row"><span class="cm-label">Category</span><span class="cm-val">${esc(clip.category)}</span></div>
      <div class="cm-row"><span class="cm-label">Actor</span><span class="cm-val">${esc(clip.actor)}${clip.version ? ' · v' + clip.version : ''}</span></div>
      ${clip.description ? `<div class="cm-row"><span class="cm-label">Shot</span><span class="cm-val">${esc(clip.description)}</span></div>` : ''}
      ${clip.markets ? `<div class="cm-row"><span class="cm-label">Markets</span><span class="cm-val">${esc(clip.markets)}</span></div>` : ''}
    </div>
    ${copy ? `<div style="margin-top:18px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">Copy</div>
      <div style="background:var(--s3);border-radius:6px;padding:12px;">
        <div style="font-size:11px;color:var(--text);margin-bottom:8px;">${esc(copy.en)}</div>
        ${['et','fr','de','es'].filter(l => copy[l]).map(l =>
          `<div class="cm-copy-lang-row"><span class="cm-copy-lang-code">${l.toUpperCase()}</span><span class="cm-copy-lang-text">${esc(copy[l])}</span></div>`
        ).join('')}
      </div>
    </div>` : ''}
    <div style="margin-top:18px;font-size:10px;color:var(--muted);">
      ${selected
        ? `<span style="color:var(--green);">&#10003; This clip is included in your selection</span>`
        : `<span>Click below to include this clip in your order</span>`}
    </div>`;

  // Actions
  document.getElementById('ccm-actions').innerHTML = `
    <div style="display:flex;gap:8px;">
      ${selected
        ? `<button class="btn btn-ghost" style="flex:1;" onclick="toggleCopyClipFromModal('${esc(clip.id)}')">&#10005; Remove from selection</button>`
        : `<button class="btn btn-primary" style="flex:1;" onclick="toggleCopyClipFromModal('${esc(clip.id)}')">&#10003; Include this clip</button>`}
      <button class="btn btn-ghost" onclick="closeCopyClipModal()">Close</button>
    </div>`;
}

function toggleCopyClipFromModal(clipId) {
  toggleCopyClip(clipId);
  // Re-render modal to update button state
  const clips = window._copyClipList || [];
  const clip = clips[_ccmClipIdx];
  if (clip) renderCopyClipModal(clip);
}

// ── Step 3: Languages + Designs ────────────────────────────────
function goToCopyStep3() {
  if (!sharedState.selectedClips.length) { toast('Select at least one clip', true); return; }
  sharedState.selectedLangs = ['EN'];
  sharedState.selectedDesigns = availableDesigns.length
    ? [typeof availableDesigns[0]==='object' ? availableDesigns[0].key : availableDesigns[0]]
    : [];
  showCopyStep(3);
  renderCopyStep3();
}

function renderCopyStep3() {
  const copy = sharedState.selectedCopy;
  if (!copy) return;

  // Breadcrumb
  const bc = document.getElementById('copy-step3-breadcrumb');
  if (bc) {
    bc.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="showCopyStep(2);renderCopyClipGrid();">&#8592; Back to clips</button>
      <span style="font-size:11px;color:var(--accent);margin-left:12px;">${esc(copy.en)}</span>`;
  }

  // Summary
  const summary = document.getElementById('copy-step3-summary');
  if (summary) {
    const clipNames = sharedState.selectedClips.map(id => {
      const c = clipLibrary.find(cl => cl.id === id);
      return c ? c.nameNoExt : id;
    });
    summary.innerHTML = `
      <div class="card-title">Order Summary</div>
      <div style="font-size:10px;color:var(--muted2);line-height:1.8;">
        <div><strong style="color:var(--text);">Copy:</strong> ${esc(copy.en)}</div>
        <div><strong style="color:var(--text);">Category:</strong> ${esc(copy.category)}</div>
        <div><strong style="color:var(--text);">Clips:</strong> ${clipNames.map(n => esc(n)).join(', ')}</div>
      </div>`;
  }

  // Language chips
  const langEl = document.getElementById('copy-lang-chips');
  if (langEl) {
    langEl.innerHTML = LANGS.map(l => {
      const sel = sharedState.selectedLangs.includes(l);
      const hasTranslation = copy[l.toLowerCase()];
      return `<div class="cm-lang-chip${sel?' sel':''}${!hasTranslation?' disabled':''}" onclick="${hasTranslation ? `toggleCopyLang('${l}')` : ''}" style="${!hasTranslation?'opacity:0.3;cursor:not-allowed;':''}">
        ${l}${hasTranslation ? '' : ' &#215;'}
      </div>`;
    }).join('');
  }

  // Design chips
  const designEl = document.getElementById('copy-design-chips');
  if (designEl) {
    if (!availableDesigns.length) {
      designEl.innerHTML = '<div style="font-size:10px;color:var(--muted);">No designs configured</div>';
    } else {
      designEl.innerHTML = availableDesigns.map(d => {
        const key = typeof d==='object' ? (d.key||'') : d;
        const label = typeof d==='object' ? (d.label||key) : d;
        const img = typeof d==='object' ? (d.images?.['16x9']||'') : '';
        const sel = sharedState.selectedDesigns.includes(key);
        return `<div class="cm-design-tile${sel?' sel':''}" onclick="toggleCopyDesign('${esc(key)}')" style="padding:0;overflow:hidden;min-width:100px;max-width:160px;">
          ${img ? `<img src="${esc(img)}" style="width:100%;height:60px;object-fit:cover;display:block;">` : `<div style="height:60px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:20px;">&#127912;</div>`}
          <div style="padding:6px 8px;font-size:9px;text-align:center;">${esc(label)}</div>
        </div>`;
      }).join('');
    }
  }
}

function toggleCopyLang(lang) {
  const idx = sharedState.selectedLangs.indexOf(lang);
  if (idx >= 0) {
    if (sharedState.selectedLangs.length === 1) return;
    sharedState.selectedLangs.splice(idx, 1);
  } else {
    sharedState.selectedLangs.push(lang);
  }
  renderCopyStep3();
}

function toggleCopyDesign(key) {
  const idx = sharedState.selectedDesigns.indexOf(key);
  if (idx >= 0) {
    if (sharedState.selectedDesigns.length === 1) return;
    sharedState.selectedDesigns.splice(idx, 1);
  } else {
    sharedState.selectedDesigns.push(key);
  }
  renderCopyStep3();
}

function addCopyBrowseToBasket() {
  const copy = sharedState.selectedCopy;
  if (!copy) { toast('No copy selected', true); return; }
  if (!sharedState.selectedClips.length) { toast('No clips selected', true); return; }
  if (!sharedState.selectedDesigns.length && availableDesigns.length) { toast('Select a design', true); return; }

  const copyText = {en:copy.en||'',et:copy.et||'',fr:copy.fr||'',de:copy.de||'',es:copy.es||''};

  let added = 0;
  sharedState.selectedClips.forEach(clipId => {
    const clip = clipLibrary.find(c => c.id === clipId);
    if (!clip) return;

    const isDup = basket.some(b =>
      b.clipId === clipId &&
      b.copyKey === copy.key &&
      (b.designs||[]).join(',') === sharedState.selectedDesigns.join(',') &&
      b.langs.length === sharedState.selectedLangs.length &&
      b.langs.every(l => sharedState.selectedLangs.includes(l))
    );
    if (isDup) return;

    basket.push({
      clipId,
      clip: {name:clip.name,nameNoExt:clip.nameNoExt,slate:clip.slate,category:clip.category,actor:clip.actor,relativePath:clip.relativePath},
      copyKey: copy.key,
      copyText,
      langs: [...sharedState.selectedLangs],
      designs: [...sharedState.selectedDesigns],
    });
    added++;
  });

  saveBasket();
  updateBasketBar();
  toast(added > 0 ? `Added ${added} clip${added>1?'s':''} to order` : 'All clips already in order', added === 0);

  // Reset and go back to step 1
  sharedState.selectedCopy = null;
  sharedState.selectedClips = [];
  showCopyStep(1);
  renderCopyGrid();
}
