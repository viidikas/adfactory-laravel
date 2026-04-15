// ═══════════════════════════════════════════════════════════════
//  PREVIEW TABLE
// ═══════════════════════════════════════════════════════════════

const PREVIEW_ALL_COLS = [
  { key:'line_nr',          label:'#'            },
  { key:'target',     label:'Target Comp'         },
  { key:'aef_output_name',  label:'AE Output'    },
  { key:'filename',         label:'Filename'     },
  { key:'output',           label:'Output (Templater)' },
  { key:'ae_output_path',   label:'Full Path'    },
  { key:'aef_footage',      label:'Footage'      },
  { key:'design',           label:'Design'       },
  { key:'format',     label:'Format'       },
  { key:'lang',             label:'Lang'         },
  { key:'brand',            label:'Brand'        },
  { key:'headline',         label:'Copy'         },
  { key:'aef_duration',     label:'Duration'     },
  { key:'duration_full',    label:'Full Dur'     },
  { key:'trim_in',          label:'Trim In'      },
  { key:'trim_out',         label:'Trim Out'     },
  { key:'disclaimer',       label:'Disclaimer'   },
  { key:'slate',            label:'Slate'        },
  { key:'actor',            label:'Actor'        },
  { key:'category',         label:'Category'     },
  { key:'category_slug',    label:'Cat Slug'     },
  { key:'markets',          label:'Markets'      },
  { key:'status',           label:'Status'       },
];

// Default visible columns
let previewVisibleCols = ['line_nr','target','aef_footage','design','format','lang','brand','headline','filename','output'];
let previewRows = [];
let previewFiltered = [];
let previewPage = 1;
const PREVIEW_PAGE_SIZE = 50;

function buildPreviewTable() {
  const f = state.filters;
  state.basePath = document.getElementById('base-path')?.value.trim() || state.basePath;

  // Source of truth priority: 1) scanned clip library, 2) AI-analysed clips, 3) built-in
  let clips;
  if (state.clipLibrary.length) {
    // Use actual scanned files — these are the only clips that exist on disk
    clips = state.clipLibrary.filter(c => f.cat.includes(c.category));
  } else if (state.analysedClips.length) {
    clips = state.analysedClips.filter(c => f.cat.includes(c.category));
  } else {
    clips = getBuiltinClips().filter(c => f.cat.includes(c.category));
  }

  // Filter by selected slates
  // Intersect slate filter with active categories (guards against stale cross-category selections)
  if (f.slate?.length) {
    const catSlates = new Set(SCENE_DATA.filter(s => f.cat.includes(s.category)).map(s => s.slate));
    const activeSlates = f.slate.filter(s => catSlates.has(s));
    if (activeSlates.length) clips = clips.filter(c => activeSlates.includes(c.slate));
  }

  const PREFIX = { Creditstar:'CS', Monefit:'MF' };
  const rows = [];
  let lineNr = 1;

  for (const clip of clips) {
    for (const design of f.design) {
      const validFmts = getDesignFmts(design).filter(fmt => f.fmt.includes(fmt));
      for (const fmt of validFmts) {
        for (const lang of f.lang) {
          for (const brand of f.brand) {
            const compKey   = `${design}_${fmt}`;
            const brandComps = state.compNames[brand] || {};
            const shortDesign = design.replace('design','d');
            const fmtLabel  = ({'16x9':'16x9','1x1':'1x1','9x16':'9x16','4x5v1':'4x5','4x5v2':'4x5'}[fmt]||fmt);
            const compName  = brandComps[compKey] || `TEMPLATE_${PREFIX[brand]||'CS'}_${fmtLabel} ${shortDesign}`;
            const copy      = getCopy(clip, brand, lang);
            if (!copy) continue; // omit rows with no copy assigned
            const actorClean = (clip.actor||'').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
            const slate      = clip.slate || '';

            // Filename built from user-configured convention
            const outputFilename = buildOutputFilename(brand, slate, actorClean, design, fmt, lang, clip.category||'', copy);

            // Folder: BasePath / Language / Brand / Category / Design / Format /
            const folderPath = buildFolderPath(brand, slate, actorClean, design, fmt, lang, clip.category||'', copy);
            const aeOutputPath = `${state.basePath}/${folderPath}/${outputFilename}.mp4`;

            rows.push({
              line_nr:        lineNr++,
              target:   compName,
              aef_output_name:`${slate}_${actorClean}_${fmt}_${shortDesign}_${PREFIX[brand]||'CS'}`,
              filename:         outputFilename.replace(/[\.\s]+/g, '_'),
              output:           `${folderPath}/${outputFilename}`.replace(/[\.\s]+/g, '_'),
              ae_output_path:   aeOutputPath,
              aef_footage:     clip.name || clip.filename || '',
              design,
              format:          fmt,
              lang,
              brand,
              headline:        copy,
              aef_duration:    clip.duration || '',
              trim_in:         clip.trim_in  || '0',
              trim_out:        clip.trim_out || clip.duration || '',
              slate,
              actor:           actorClean,
              category:        clip.category,
              markets:         clip.markets || '',
              status:          'pending',
            });
          }
        }
      }
    }
  }

  previewRows = rows;
  previewFiltered = rows;
  previewPage = 1;

  // Populate filter dropdowns
  const designSel = document.getElementById('preview-filter-design');
  const fmtSel    = document.getElementById('preview-filter-fmt');
  if (designSel) {
    designSel.innerHTML = '<option value="">All designs</option>' +
      [...new Set(rows.map(r => r.design))].map(d => `<option value="${d}">${d}</option>`).join('');
  }
  if (fmtSel) {
    fmtSel.innerHTML = '<option value="">All formats</option>' +
      [...new Set(rows.map(r => r.format||r.target))].map(f => `<option value="${f}">${f}</option>`).join('');
  }

  // Column toggles
  renderColToggles();

  const prc = document.getElementById('preview-row-count'); if (prc) prc.textContent = `${rows.length} rows total`;
  const nb5 = document.getElementById('nb-5'); if (nb5) { nb5.textContent = rows.length; nb5.className = 'nav-badge ok'; }

  renderPreviewTablePage();
}

function filterPreviewTable() {
  const search = (document.getElementById('preview-search')?.value || '').toLowerCase();
  const design = document.getElementById('preview-filter-design')?.value || '';
  const fmt    = document.getElementById('preview-filter-fmt')?.value || '';
  const brand  = document.getElementById('preview-filter-brand')?.value || '';
  const status = document.getElementById('preview-filter-status')?.value || '';

  previewFiltered = previewRows.filter(r => {
    if (search && !Object.values(r).some(v => String(v).toLowerCase().includes(search))) return false;
    if (design && r.design !== design) return false;
    if (fmt    && (r.format||r.target) !== fmt) return false;
    if (brand  && r.brand  !== brand)  return false;
    if (status && r.status !== status) return false;
    return true;
  });
  previewPage = 1;
  document.getElementById('preview-row-count').textContent = `${previewFiltered.length} / ${previewRows.length} rows`;
  renderPreviewTablePage();
}

// Column widths — persisted per session
let colWidths = {};
const COL_DEFAULT_WIDTHS = {
  line_nr:        48,
  target:        160,
  aef_output_name:180,
  filename:      200,
  output:        320,
  ae_output_path:360,
  aef_footage:   200,
  design:         80,
  format:         60,
  lang:           50,
  brand:          90,
  headline:      220,
  aef_duration:   70,
  duration_full:  70,
  trim_in:        60,
  trim_out:       60,
  disclaimer:     70,
  slate:          60,
  actor:         100,
  category:      160,
  status:         80,
};

function getColWidth(key) {
  return colWidths[key] || COL_DEFAULT_WIDTHS[key] || 120;
}

function renderPreviewTablePage() {
  const wrap = document.getElementById('preview-table-wrap');
  if (!previewFiltered.length) {
    wrap.innerHTML = `<div class="empty" style="padding:40px;"><div class="empty-icon">🔍</div><div class="empty-title">No rows match</div></div>`;
    document.getElementById('preview-pag').innerHTML = '';
    return;
  }

  const pages   = Math.max(1, Math.ceil(previewFiltered.length / PREVIEW_PAGE_SIZE));
  if (previewPage > pages) previewPage = 1;
  const pageRows = previewFiltered.slice((previewPage-1)*PREVIEW_PAGE_SIZE, previewPage*PREVIEW_PAGE_SIZE);
  const cols = PREVIEW_ALL_COLS.filter(c => previewVisibleCols.includes(c.key));

  const brandColor  = { Creditstar:'var(--orange)', Monefit:'var(--blue)' };
  const designColors = ['#e8ff47','#47c8ff','#ff6b47','#34d399','#a78bfa','#fbbf24'];

  const colgroup = `<colgroup>${cols.map(c => `<col data-key="${c.key}" style="width:${getColWidth(c.key)}px;min-width:40px;">`).join('')}</colgroup>`;

  const thead = `<thead><tr>
    ${cols.map(c => `
      <th data-key="${c.key}" style="position:relative;width:${getColWidth(c.key)}px;min-width:40px;">
        ${c.label}
        <div class="col-resize-handle" onmousedown="initColResize(event,'${c.key}')"></div>
      </th>`).join('')}
  </tr></thead>`;

  const tbody = `<tbody>${pageRows.map((r) => {
    const bColor = brandColor[r.brand] || 'var(--text)';
    const dIndex = state.filters.design.indexOf(r.design);
    const dColor = designColors[dIndex % designColors.length] || 'var(--muted)';
    return `<tr onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
      ${cols.map(c => {
        const val = String(r[c.key] ?? '');
        let color = 'var(--muted2)';
        if (c.key === 'target')       color = bColor;
        else if (c.key === 'design')  color = dColor;
        else if (c.key === 'aef_footage') color = 'var(--blue)';
        else if (c.key === 'headline') color = 'var(--text)';
        else if (c.key === 'brand')   color = bColor;
        else if (c.key === 'output' || c.key === 'ae_output_path') color = 'var(--muted)';
        return `<td style="color:${color}${c.key==='output'||c.key==='ae_output_path'?';font-size:9px':''}" title="${val.replace(/"/g,'&quot;')}">${val||'—'}</td>`;
      }).join('')}
    </tr>`;
  }).join('')}</tbody>`;

  wrap.innerHTML = `<table class="preview-table">${colgroup}${thead}${tbody}</table>`;

  // Pagination
  const pEl = document.getElementById('preview-pag');
  if (pages <= 1) { pEl.innerHTML = ''; return; }
  let btns = `<button class="pg" onclick="previewGoPage(${previewPage-1})" ${previewPage===1?'disabled':''}>‹</button>`;
  for (let i=1;i<=pages;i++) {
    if (i===1||i===pages||Math.abs(i-previewPage)<=1)
      btns += `<button class="pg ${i===previewPage?'active':''}" onclick="previewGoPage(${i})">${i}</button>`;
    else if (Math.abs(i-previewPage)===2) btns += `<span style="color:var(--muted);padding:2px 5px">…</span>`;
  }
  btns += `<button class="pg" onclick="previewGoPage(${previewPage+1})" ${previewPage===pages?'disabled':''}>›</button>`;
  pEl.innerHTML = btns;
}

// ── Column resize drag ──────────────────────────────────────────
let _resizeKey = null, _resizeStartX = 0, _resizeStartW = 0;

function initColResize(e, key) {
  e.preventDefault();
  _resizeKey    = key;
  _resizeStartX = e.clientX;
  _resizeStartW = getColWidth(key);
  e.target.classList.add('resizing');

  function onMove(e) {
    const delta = e.clientX - _resizeStartX;
    const newW  = Math.max(40, _resizeStartW + delta);
    colWidths[_resizeKey] = newW;
    // Update col element width live
    const table = document.querySelector('.preview-table');
    if (table) {
      const col = table.querySelector(`col[data-key="${_resizeKey}"]`);
      if (col) col.style.width = newW + 'px';
      const th = table.querySelector(`th[data-key="${_resizeKey}"]`);
      if (th) th.style.width = newW + 'px';
    }
  }

  function onUp(e) {
    document.querySelectorAll('.col-resize-handle').forEach(h => h.classList.remove('resizing'));
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    _resizeKey = null;
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function previewGoPage(p) { previewPage = p; renderPreviewTablePage(); }

function renderColToggles() {
  document.getElementById('col-toggle-chips').innerHTML = PREVIEW_ALL_COLS.map(c => {
    const on = previewVisibleCols.includes(c.key);
    return `<div class="chip ${on?'sel':''}" data-col="${c.key}" onclick="togglePreviewCol(this,'${c.key}')">${c.label}</div>`;
  }).join('');
}

function togglePreviewCol(el, key) {
  el.classList.toggle('sel');
  if (previewVisibleCols.includes(key)) {
    previewVisibleCols = previewVisibleCols.filter(k => k !== key);
  } else {
    // Insert in original order
    const order = PREVIEW_ALL_COLS.map(c => c.key);
    previewVisibleCols = order.filter(k => previewVisibleCols.includes(k) || k === key);
  }
  renderPreviewTablePage();
}

function togglePreviewCols() {
  const el = document.getElementById('preview-col-toggles');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function exportPreviewCSV() {
  const rows = previewFiltered.length ? previewFiltered : previewRows;
  if (!rows.length) { toast('Build preview first', true); return; }
  // Use only currently visible columns — same as what's on screen
  const visibleCols = PREVIEW_ALL_COLS.filter(c => previewVisibleCols.includes(c.key));
  const headers = visibleCols.map(c => c.key);
  const e = v => `"${String(v||'').replace(/"/g,'""')}"`;
  const csv = [headers.map(e).join(','), ...rows.map(r => headers.map(h => e(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `adfactory_preview_${Date.now()}.csv`;
  a.click();
  toast(`⬇ Downloaded ${rows.length} rows (${headers.length} columns)`);
}

function updateGenSummary() {
  const f = state.filters;
  let clips;
  if (state.clipLibrary.length) {
    clips = state.clipLibrary.filter(c => f.cat.includes(c.category));
    // Apply slate filter
    if (f.slate?.length) {
      const catSlates = new Set(SCENE_DATA.filter(s => f.cat.includes(s.category)).map(s => s.slate));
      const activeSlates = f.slate.filter(s => catSlates.has(s));
      if (activeSlates.length) clips = clips.filter(c => activeSlates.includes(c.slate));
    }
  } else if (state.analysedClips.length) {
    clips = state.analysedClips.filter(c => f.cat.includes(c.category));
  } else {
    clips = [];
  }
  const fmtCounts = f.design.reduce((acc, d) => {
    return acc + f.fmt.filter(fmt => getDesignFmts(d).includes(fmt)).length;
  }, 0);
  const total = clips.length * fmtCounts * f.lang.length;
  const source = state.clipLibrary.length ? `${state.clipLibrary.length} clips scanned` : 'built-in list';
  document.getElementById('gen-summary').textContent = clips.length
    ? `${clips.length} clips × ${fmtCounts} variants × ${f.lang.length} lang = ${total} rows  (${source})`
    : `No clips match current filters. ${source} loaded — check Step 3 filters.`;
}

// ═══════════════════════════════════════════════════════════════
//  GENERATE
// ═══════════════════════════════════════════════════════════════
async function generateSheet() {
  const f = state.filters;
  state.basePath = document.getElementById('base-path').value.trim();

  // Use analysed clips or fall back to built-in
  // Source of truth priority: 1) scanned clip library, 2) AI-analysed clips, 3) built-in
  let clips;
  if (state.clipLibrary.length) {
    // Use actual scanned files — these are the only clips that exist on disk
    clips = state.clipLibrary.filter(c => f.cat.includes(c.category));
  } else if (state.analysedClips.length) {
    clips = state.analysedClips.filter(c => f.cat.includes(c.category));
  } else {
    clips = getBuiltinClips().filter(c => f.cat.includes(c.category));
  }

  // Filter by selected slates
  if (f.slate?.length) {
    const catSlates = new Set(SCENE_DATA.filter(s => f.cat.includes(s.category)).map(s => s.slate));
    const activeSlates = f.slate.filter(s => catSlates.has(s));
    if (activeSlates.length) clips = clips.filter(c => activeSlates.includes(c.slate));
  }

  // Apply copy filter if active (from Step 2 "Filter by Copy")
  const copyFilter = (typeof adminActiveCopyFilter !== 'undefined') ? adminActiveCopyFilter : null;
  if (copyFilter) {
    const cfCat = (copyFilter.category || '').toLowerCase();
    const cfShot = (copyFilter.shot || '').trim();
    if (cfShot) {
      const codes = cfShot.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
      clips = clips.filter(c => codes.includes((c.slate || '').toUpperCase()));
    } else if (cfCat) {
      clips = clips.filter(c => (c.category || '').toLowerCase() === cfCat);
    }
  }

  if (!clips.length) { toast('No clips match your filters', true); return; }

  document.getElementById('gen-progress').style.display = 'block';
  document.getElementById('preview-section').style.display = 'none';

  const rows = [];
  const total = clips.length * f.design.length;
  let done = 0;

  for (const clip of clips) {
    for (const design of f.design) {
      const validFmts = getDesignFmts(design).filter(fmt => f.fmt.includes(fmt));
      for (const fmt of validFmts) {
        for (const lang of f.lang) {
          for (const brand of f.brand) {
            const compKey = `${design}_${fmt}`;
            const brandComps = state.compNames[brand] || {};
            const shortDesign = design.replace('design','d');
            const fmtLabel = ({'16x9':'16x9','1x1':'1x1','9x16':'9x16','4x5v1':'4x5','4x5v2':'4x5'}[fmt]||fmt);
            const PREFIX = { Creditstar:'CS', Monefit:'MF' };
            const compName = brandComps[compKey] || `TEMPLATE_${PREFIX[brand]||'CS'}_${fmtLabel} ${shortDesign}`;

            // Get copy: copy filter override > slate assignment > sheet copy > empty
            let copy;
            if (copyFilter && copyFilter[lang.toLowerCase()]) {
              copy = copyFilter[lang.toLowerCase()];
            } else {
              copy = getCopy(clip, brand, lang);
            }
            if (!copy) continue; // omit rows with no copy assigned

            const actorClean = (clip.actor||'').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
            const slate = clip.slate || '';

            // Category folder name (spaces → underscores)
            // Filename and folder built from user-configured convention
            const outputFilename = buildOutputFilename(brand, slate, actorClean, design, fmt, lang, clip.category||'', copy);
            const folderPath = buildFolderPath(brand, slate, actorClean, design, fmt, lang, clip.category||'', copy);
            const aeOutputPath = `${state.basePath}/${folderPath}/${outputFilename}.mp4`;

            rows.push({
              line_nr:          rows.length + 1,
              target:     compName,
              aef_output_name:  `${slate}_${actorClean}_${fmt}_${design.replace('design','d')}_${PREFIX[brand]||'CS'}`,
              aef_duration:     clip.duration || '',
              trim_in:          clip.trim_in || '0',
              trim_out:         clip.trim_out || clip.duration || '',
              aef_footage:      clip.name || clip.filename || '',
              format:           fmt,
              headline:         copy,
              brand,
              disclaimer:       lang.toLowerCase(),
              duration_full:    clip.duration || '',
              status:           'pending',
              filename:         outputFilename.replace(/[\.\s]+/g, '_'),
              output:           `${folderPath}/${outputFilename}`.replace(/[\.\s]+/g, '_'),
              ae_output_path:   aeOutputPath,
              design,
              lang,
              slate,
              actor:            actorClean,
              category:         clip.category,
              shot_description: clip.shot_description || '',
              markets:          clip.markets || '',
            });
          }
        }
      }
      done++;
      const pct = Math.round(done/total*100);
      document.getElementById('pb-fill').style.width = pct + '%';
      document.getElementById('pb-val').textContent = pct + '%';
      if (done % 10 === 0) await sleep(0); // yield to UI
    }
  }

  state.generatedRows = rows;

  // Show preview
  document.getElementById('preview-count').textContent = `${rows.length} rows`;
  document.getElementById('preview-tbody').innerHTML = rows.slice(0,50).map((r,i) => `
    <tr>
      <td>${i+1}</td>
      <td class="td-comp">${esc(r.format||r.target)}</td>
      <td class="td-copy">${esc(r.aef_output_name)}</td>
      <td>${esc(r.aef_duration)}</td>
      <td>${esc(r.trim_in)}</td>
      <td>${esc(r.trim_out)}</td>
      <td class="td-footage">${esc(r.aef_footage)}</td>
      <td>${esc(r.format||r.target)}</td>
      <td class="td-copy">${esc(r.headline||'—')}</td>
      <td>${esc(r.brand)}</td>
      <td>${esc(r.disclaimer)}</td>
      <td>${esc(r.duration_full)}</td>
      <td>${esc(r.status)}</td>
      <td class="td-copy">${esc(r.filename)}</td>
      <td class="td-path">${esc(r.output||r.ae_output_path)}</td>
    </tr>`).join('');

  document.getElementById('gen-progress').style.display = 'none';
  document.getElementById('preview-section').style.display = 'block';
  document.getElementById('btn-export-csv').disabled = false;
  document.getElementById('btn-export-gs').disabled = false;

  const nb6 = document.getElementById('nb-6'); if (nb6) { nb6.textContent = rows.length + ' rows'; nb6.className = 'nav-badge ok'; }
  const nbp = document.getElementById('nb-preview'); if (nbp) { nbp.textContent = rows.length + ' rows'; nbp.className = 'nav-badge ok'; }

  toast(`✓ Generated ${rows.length} rows`);
}

// ═══════════════════════════════════════════════════════════════
//  GENERATION PREVIEW — live summary of what will be exported
// ═══════════════════════════════════════════════════════════════
function updateGenPreview() {
  const el = document.getElementById('gen-preview-content');
  if (!el) return;

  const f = state.filters;
  const cf = (typeof adminActiveCopyFilter !== 'undefined') ? adminActiveCopyFilter : null;

  // Determine clips
  let clips = state.clipLibrary.filter(c => f.cat.includes(c.category));
  if (f.slate?.length) {
    const catSlates = new Set(SCENE_DATA.filter(s => f.cat.includes(s.category)).map(s => s.slate));
    const activeSlates = f.slate.filter(s => catSlates.has(s));
    if (activeSlates.length) clips = clips.filter(c => activeSlates.includes(c.slate));
  }

  // Apply copy filter
  if (cf) {
    const cfCat = (cf.category || '').toLowerCase();
    const cfShot = (cf.shot || '').trim();
    if (cfShot) {
      const codes = cfShot.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
      clips = clips.filter(c => codes.includes((c.slate || '').toUpperCase()));
    } else if (cfCat) {
      clips = clips.filter(c => (c.category || '').toLowerCase() === cfCat);
    }
  }

  // Count valid formats across selected designs
  let fmtCount = 0;
  for (const d of f.design) {
    fmtCount += getDesignFmts(d).filter(fmt => f.fmt.includes(fmt)).length;
  }

  const copyLabel = cf
    ? `<strong style="color:var(--accent);">${esc(cf.en)}</strong> <span style="color:var(--blue);">(${esc(cf.shot || 'Category-wide')})</span>`
    : '<span style="color:var(--muted);">All copies (per-slate assignments)</span>';

  const clipNames = clips.length <= 10
    ? clips.map(c => `${c.slate} ${c.actor}`).join(', ')
    : `${clips.length} clips`;

  const rowEstimate = clips.length * f.lang.length * fmtCount;

  el.innerHTML = `
    <div><span style="color:var(--muted);min-width:70px;display:inline-block;">Copy:</span> ${copyLabel}</div>
    <div><span style="color:var(--muted);min-width:70px;display:inline-block;">Clips:</span> <strong style="color:var(--text);">${clipNames}</strong></div>
    <div><span style="color:var(--muted);min-width:70px;display:inline-block;">Langs:</span> <strong style="color:var(--text);">${f.lang.join(', ')}</strong></div>
    <div><span style="color:var(--muted);min-width:70px;display:inline-block;">Designs:</span> <strong style="color:var(--text);">${f.design.join(', ')}</strong> (${fmtCount} format variants)</div>
    <div><span style="color:var(--muted);min-width:70px;display:inline-block;">Brands:</span> <strong style="color:var(--text);">${f.brand.join(', ')}</strong></div>
    <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">
      <span style="color:var(--muted);">Estimated rows:</span>
      <strong style="color:var(--accent);font-size:12px;">${clips.length} clips × ${f.lang.length} langs × ${fmtCount} fmts × ${f.brand.length} brands = ${rowEstimate * f.brand.length} rows</strong>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════
function getExportFilename() {
  const date = new Date().toISOString().slice(0,10);
  const cf = (typeof adminActiveCopyFilter !== 'undefined') ? adminActiveCopyFilter : null;
  const suffix = cf ? (cf.key || 'filtered') : 'all';
  return `adfactory_${suffix}_${date}.csv`;
}

function exportCSV() {
  if (!state.generatedRows.length) { toast('Generate first', true); return; }
  const cols = previewVisibleCols.length
    ? PREVIEW_ALL_COLS.filter(c => previewVisibleCols.includes(c.key)).map(c => c.key)
    : Object.keys(state.generatedRows[0]);
  const e = v => `"${String(v||'').replace(/"/g,'""')}"`;
  const csv = [cols.map(e).join(','), ...state.generatedRows.map(r => cols.map(h=>e(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = getExportFilename();
  a.click();
  toast(`⬇ Downloaded ${state.generatedRows.length} rows, ${cols.length} columns`);
}

function exportGSheets() {
  if (!state.generatedRows.length) { toast('Generate first', true); return; }

  // Build CSV with visible columns
  const cols = previewVisibleCols.length
    ? PREVIEW_ALL_COLS.filter(c => previewVisibleCols.includes(c.key)).map(c => c.key)
    : Object.keys(state.generatedRows[0]);
  const e = v => `"${String(v||'').replace(/"/g,'""')}"`;
  const csv = [cols.map(e).join(','), ...state.generatedRows.map(r => cols.map(h=>e(r[h])).join(','))].join('\n');

  // Copy to clipboard first
  navigator.clipboard.writeText(csv).then(() => {
    // Open a new blank Google Sheet
    window.open('https://sheets.new', '_blank');
    // Show instruction toast
    setTimeout(() => {
      toast('✓ CSV copied — in the new sheet: click cell A1 then Cmd+V to paste', false);
    }, 800);
  }).catch(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = getExportFilename();
    a.click();
    toast('Clipboard blocked — downloading CSV instead. Import it into Google Sheets manually.');
  });
}
