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
  const row = copyLines.filter(r => !copyBrowseCatFilter || r.category === copyBrowseCatFilter)[idx];
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

  const cat = copy.category;
  const clips = clipLibrary.filter(c => c.category === cat);
  const grid = document.getElementById('copy-clip-grid');
  const empty = document.getElementById('copy-clip-empty');

  if (!clips.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  grid.innerHTML = clips.map(clip => {
    const selected = sharedState.selectedClips.includes(clip.id);
    return `<div class="clip-card${selected?' selected':''}" onclick="toggleCopyClip('${esc(clip.id)}')">
      <div class="clip-check">${selected ? '&#10003;' : ''}</div>
      <div class="clip-thumb">
        <img src="/api/thumb?path=${encodeURIComponent(clip.relativePath)}" loading="lazy" alt="">
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
