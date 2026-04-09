// ═══════════════════════════════════════════════════════════════
//  AI SHEET ANALYSIS — proxy fetches CSV, Claude analyses
// ═══════════════════════════════════════════════════════════════
async function analyseSheet(id) {
  const s = state.sheets.find(x => x.id === id);
  if (!s) return;
  if (!s.url) { toast('Paste a Google Sheets URL first', true); return; }
  if (!state.apiKey) { toast('Save your Claude API key first', true); return; }

  s.status = 'loading';
  renderSheetList();
  const btn = document.getElementById(`btn-analyse-${id}`);
  if (btn) { btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }

  // ── Step 1: proxy fetches the CSV server-side (no CORS) ──────
  let csvText = '';
  try {
    const encoded = encodeURIComponent(s.url.trim());
    const resp = await fetch(`/api/sheets?url=${encoded}`);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${resp.status}`);
    csvText = json.csv;
    if (!s.label) {
      const m = s.url.match(/\/d\/([^/]+)/);
      s.label = m ? `Sheet ${m[1].slice(0,8)}…` : 'Sheet';
    }
  } catch(e) {
    s.status = 'error';
    s.analysisText = `<span style="color:var(--orange)">⚠ Could not fetch sheet: ${e.message}</span>`;
    toast('Fetch failed: ' + e.message, true);
    renderSheetList();
    if (btn) { btn.innerHTML = '🔗 Connect'; btn.disabled = false; }
    return;
  }

  // ── Step 2: Claude analyses the CSV ──────────────────────────
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': state.apiKey },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: `You are a data analyst for a video ad production system. Analyse this copy sheet CSV and extract structured data.

Respond ONLY with valid JSON — no preamble, no markdown fences:
{
  "type": "copy",
  "summary": "One sentence description",
  "row_count": 42,
  "copy_rows": [
    {
      "key": "Mins",
      "category": "Product usage",
      "shot": "PU1, PU2, PU7",
      "brand": "Creditstar",
      "en": "Money in minutes",
      "et": "Raha minutitega",
      "fr": "De l'argent en quelques minutes",
      "de": "Geld in Minuten",
      "es": "Dinero en minutos"
    }
  ],
  "notes": "observations"
}

Rules:
- Find the Category column → "category" field
- Find the Shot column → "shot" field (may contain slate codes like "PU1, PU7, PU18" or be blank)
- Find the Brand column → "brand" field
- Find EN, ET, FR, DE, ES language columns → en/et/fr/de/es fields
- The "key" field: use the EN text truncated to 20 chars, or any key/label column if present
- Extract EVERY row that has copy text. Do not skip rows even if Shot or Category is blank.
- Preserve the exact slate codes in the "shot" field exactly as written (e.g. "PU7, PU8, PU10, PU18")`,
        messages: [{ role: 'user', content: `Analyse this copy sheet CSV:\n\n${csvText}` }]
      })
    });

    const data = await response.json();
    if (!data.content) throw new Error(data.error?.message || 'No response from Claude');
    const text = data.content.find(b => b.type === 'text')?.text || '';

    let parsed = null;
    try { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch(e) {}

    if (parsed) {
      s.type = parsed.type || 'unknown';
      s.data = parsed;
      s.csvText = csvText;
      s.status = 'ok';
      s.analysisText = formatAnalysis(parsed);

      if (parsed.type === 'clips' && parsed.clip_data?.length) {
        const existing = new Set(state.analysedClips.map(c => c.filename));
        state.analysedClips = [...state.analysedClips, ...parsed.clip_data.filter(c => !existing.has(c.filename))];
        document.getElementById('nb-1').textContent = state.analysedClips.length + ' clips';
        document.getElementById('nb-1').className = 'nav-badge ok';
      }
      if (parsed.copy_rows?.length) {
        // Store indexed by key for manual lookup
        parsed.copy_rows.forEach(row => {
          if (row.key) state.copySheetData[row.key] = row;
        });
        // Auto-map: match every clip in the library to its copy
        autoMapCopyToClips(parsed.copy_rows);
        // Also populate legacy analysedCopy for fallback
        parsed.copy_rows.forEach(row => {
          const cat = row.category || '';
          if (cat && !state.analysedCopy[cat]) state.analysedCopy[cat] = {};
          if (cat && row.key) state.analysedCopy[cat][row.key] = row;
        });
        // Persist sheet URL to config so Growth Portal can fetch copy
        fetch('/api/config', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({sheet_url: s.url.trim()})
        }).catch(() => {});
        toast(`✓ Copy sheet loaded — ${parsed.copy_rows.length} rows, auto-mapping clips…`);
      }

      document.getElementById('analysis-card').style.display = 'block';
      document.getElementById('analysis-results').innerHTML =
        state.sheets.filter(x => x.analysisText).map(x =>
          `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);">
            ${x.label ? `<div style="font-size:9px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">${esc(x.label)}</div>` : ''}
            ${x.analysisText}
          </div>`
        ).join('');

      toast(`✓ ${s.label || 'Sheet'} — ${parsed.type}, ${parsed.row_count || '?'} rows`);
    } else {
      s.status = 'error';
      s.analysisText = `<span style="color:var(--orange)">Could not parse Claude response — try again.</span>`;
      toast('Could not parse sheet data', true);
    }
  } catch(err) {
    s.status = 'error';
    s.analysisText = `<span style="color:var(--orange)">Error: ${err.message}</span>`;
    toast('Analysis failed: ' + err.message, true);
  }

  renderSheetList();
  if (btn) { btn.innerHTML = s.data ? '↻ Re-fetch' : '🔗 Connect'; btn.disabled = false; }
}

function sheetUrlToCsv(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  // Works for both native Google Sheets AND uploaded .xlsx files
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&id=${id}&gid=${gid}`;
}

function formatAnalysis(parsed) {
  const typeColors = { clips:'accent', copy:'blue', lines:'purple', unknown:'muted' };
  const col = typeColors[parsed.type] || 'muted';
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span class="analysis-tag" style="background:rgba(var(--${col}-rgb),.1);color:var(--${col})">${parsed.type}</span>
      <strong>${esc(parsed.summary || '')}</strong>
    </div>
    <div style="color:var(--muted2);font-size:10px;line-height:1.8;">
      ${parsed.row_count ? `Rows: <strong style="color:var(--text)">${parsed.row_count}</strong> · ` : ''}
      ${parsed.categories?.length ? `Categories: <strong style="color:var(--text)">${parsed.categories.join(', ')}</strong>` : ''}
      ${parsed.clip_data?.length ? `<br>Clips extracted: <strong style="color:var(--green)">${parsed.clip_data.length}</strong>` : ''}
      ${parsed.copy_rows?.length ? `<br>Copy keys: <strong style="color:var(--blue)">${parsed.copy_rows.length}</strong>` : parsed.copy_data?.length ? `<br>Copy rows: <strong style="color:var(--blue)">${parsed.copy_data.length}</strong>` : ''}
      ${parsed.notes ? `<br>Note: ${esc(parsed.notes)}` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  AUTO-MAP copy sheet rows → clips
// ═══════════════════════════════════════════════════════════════
function autoMapCopyToClips(copyRows) {
  if (!copyRows?.length) return;

  // Normalise category names from the sheet to match SCENE_DATA
  const CAT_NORM = {
    'product usage':         'Product Usage',
    'travel':                'Travel and Holiday',
    'travel and holiday':    'Travel and Holiday',
    'home reno':             'Home Renovation',
    'home renovation':       'Home Renovation',
    'lifestyle/events':      'Lifestyle and Events',
    'lifestyle and events':  'Lifestyle and Events',
    'tech':                  'Electronics and Devices',
    'electronics and devices':'Electronics and Devices',
    'financial relief':      'Financial Relief',
  };

  function normCat(raw) {
    return CAT_NORM[(raw||'').toLowerCase().trim()] || raw || '';
  }

  // Detect key-only sheet (no category, no shot column at all)
  const hasCategory = copyRows.some(r => r.category && r.category.trim());
  const hasShot     = copyRows.some(r => r.shot && r.shot.trim());

  if (!hasCategory && !hasShot) {
    // Pure key-only sheet — load into COPY_KEYS for manual assignment
    copyRows.forEach(r => {
      if (r.key && r.en) {
        COPY_KEYS[r.key] = { en:r.en||'', et:r.et||'', fr:r.fr||'', de:r.de||'', es:r.es||'' };
      }
    });
    toast(`✓ ${copyRows.length} copy keys loaded — assign to clips via the Clip Library`);
    return;
  }

  // Build per-slate and per-category copy buckets
  // { slate → [copyRow, ...] }  and  { normCategory → [copyRow, ...] }
  const bySlate = {};   // e.g. { 'PU1': [row], 'PU7': [row, row] }
  const byCat   = {};   // e.g. { 'Product Usage': [row, ...] }

  copyRows.forEach(row => {
    const cat   = normCat(row.category);
    const shot  = (row.shot || '').trim();
    const brand = (row.brand || '').toLowerCase();

    // Only include Creditstar or Either/blank rows (skip SmartSaver-only for now)
    const brandOk = !brand || brand === 'either' || brand === 'creditstar' ||
                    brand === 'credistar' || brand === '';
    if (!brandOk) return;

    const rowEntry = {
      key:      row.key || (row.en || '').slice(0,30),
      en:       row.en  || '',
      et:       row.et  || '',
      fr:       row.fr  || '',
      de:       row.de  || '',
      es:       row.es  || '',
      category: cat,
      brand:    row.brand || '',
      shot:     shot,
    };

    if (shot) {
      // Parse slate codes from Shot column: "PU7, PU8, PU10, PU18"
      const slates = shot.split(/[\s,;]+/).map(s => s.trim()).filter(s => /^[A-Z]{2}\d+$/.test(s));
      slates.forEach(slate => {
        if (!bySlate[slate]) bySlate[slate] = [];
        bySlate[slate].push(rowEntry);
      });
      // If no parseable slate codes, fall through to category
      if (!slates.length && cat) {
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(rowEntry);
      }
    } else if (cat) {
      // No shot specified → applies to entire category
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(rowEntry);
    }
  });

  // Now assign to every slate in SCENE_DATA
  let totalMapped = 0;
  const allSlates = [...new Set(SCENE_DATA.map(s => s.slate))];

  allSlates.forEach(slate => {
    const sceneCat = normCat(SCENE_DATA.find(s => s.slate === slate)?.category || '');
    const matches  = [];

    // 1. Slate-specific rows first (highest priority)
    if (bySlate[slate]) matches.push(...bySlate[slate]);

    // 2. Category-wide rows — only add if NO slate-specific rows exist for this slate
    if (!matches.length && byCat[sceneCat]) {
      byCat[sceneCat].forEach(r => {
        if (!matches.find(m => m.en === r.en)) matches.push(r);
      });
    }

    if (!matches.length) return;

    state.copyAssignments[slate] = matches;
    if (state.copySelection[slate] === undefined) state.copySelection[slate] = 0;
    totalMapped++;
  });

  localStorage.setItem('af_copy_assignments', JSON.stringify(state.copyAssignments));
  localStorage.setItem('af_copy_selection',   JSON.stringify(state.copySelection));

  // Update clip library match status
  state.clipLibrary.forEach(clip => {
    const rows = state.copyAssignments[clip.slate];
    if (rows?.length) {
      const row = rows[state.copySelection[clip.slate] || 0];
      clip.matchStatus = row?.en ? 'matched' : 'partial';
    }
  });

  renderClipGrid();
  updateLibStats();
  renderCopySelector();
  toast(`✓ Copy mapped to ${totalMapped} slates — see Step 3 for multi-option slates`);
}

// ─── getCopy: copyAssignments (slate-level) → slateAssignments (key) → fallback ──
function getCopy(clip, brand, lang) {
  const slate = clip.slate || '';

  // 1. Slate-level copy assignment (from auto-mapped sheet, user-selected index)
  if (slate && state.copyAssignments[slate]?.length) {
    const idx = state.copySelection[slate] || 0;
    const row = state.copyAssignments[slate][Math.min(idx, state.copyAssignments[slate].length - 1)];
    const val = row?.[lang.toLowerCase()];
    if (val) return val;
  }

  // 2. Manual key assignment via clip library dropdown
  const clipId = clip.nameNoExt || clip.filename?.replace(/\.[^.]+$/,'') || '';
  const libClip = state.clipLibrary.find(c => c.id === clipId || c.name === (clip.filename||''));
  const assignedKey = libClip ? state.slateAssignments[libClip.id] : state.slateAssignments[clipId];
  if (assignedKey && COPY_KEYS[assignedKey]) {
    return COPY_KEYS[assignedKey][lang.toLowerCase()] || COPY_KEYS[assignedKey]['en'] || '';
  }

  // 3. clipCopyMap (legacy auto-map)
  const mapId = libClip ? libClip.id : clipId;
  if (state.clipCopyMap[mapId]?.[lang]) return state.clipCopyMap[mapId][lang];

  // 4. Global override
  if (state.copyOverride[lang]) return state.copyOverride[lang];

  // 5. Built-in fallback
  return getBuiltinCopy(slate, brand) || '';
}
