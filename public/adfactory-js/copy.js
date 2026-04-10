// ═══════════════════════════════════════════════════════════════
//  AI SHEET ANALYSIS — proxy fetches CSV, Claude analyses
// ═══════════════════════════════════════════════════════════════
async function analyseSheet(id) {
  const s = state.sheets.find(x => x.id === id);
  if (!s) return;
  if (!s.url) { toast('Paste a Google Sheets URL first', true); return; }

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: `You are a data analyst for a video ad production system. Analyse this CSV sheet and extract structured data.

The sheet could be one of two types:

TYPE 1 — COPY SHEET (has language columns like EN, ET, FR, DE, ES with advertising headline text):
Respond with:
{
  "type": "copy",
  "summary": "One sentence description",
  "row_count": 42,
  "copy_rows": [
    {
      "key": "Mins",
      "category": "Product Usage",
      "shot": "PU1, PU2, PU7",
      "brand": "Creditstar",
      "en": "Money in minutes",
      "et": "Raha minutitega",
      "fr": "De l'argent en quelques minutes",
      "de": "Geld in Minuten",
      "es": "Dinero en minutos"
    }
  ]
}

TYPE 2 — SHOT DESCRIPTION SHEET (describes what happens in each video shot/slate):
Respond with:
{
  "type": "shots",
  "summary": "One sentence description",
  "row_count": 42,
  "shot_descriptions": [
    {
      "slate": "PU1",
      "category": "Product Usage",
      "description": "Phone passed from one hand to another, smile",
      "actors": "Victoria, Andrey, Kemal",
      "markets": "EEA"
    }
  ]
}

Category slug mapping for slate codes:
- Product Usage → PU (e.g. PU1, PU18)
- Travel and Holiday → TH
- Home Renovation → HR
- Lifestyle and Events → LE
- Electronics and Devices → EG
- Financial Relief → FR

Rules:
- Detect the sheet type from its columns and content
- For copy sheets: extract EVERY row with copy text. Preserve exact slate codes in "shot" field (e.g. "PU7, PU8, PU10, PU18"). Use the EN text truncated to 20 chars as "key".
- For shot sheets: extract every shot/slate. Construct the slate code from category + number (e.g. "Product Usage" shot 18 = "PU18").
- Normalise category names to: Product Usage, Travel and Holiday, Home Renovation, Lifestyle and Events, Electronics and Devices, Financial Relief
- Respond ONLY with valid JSON — no preamble, no markdown fences.`,
        messages: [{ role: 'user', content: `Analyse this sheet CSV:\n\n${csvText}` }]
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

      if (parsed.type === 'shots' && parsed.shot_descriptions?.length) {
        // Store shot descriptions to server and update local SCENE_DATA
        const shots = parsed.shot_descriptions;
        shots.forEach(shot => {
          const existing = typeof SCENE_DATA !== 'undefined' ? SCENE_DATA.findIndex(s => s.slate === shot.slate) : -1;
          const entry = {
            slate: shot.slate,
            category: shot.category || '',
            actor_options: (shot.actors || '').split(/[\s,]+/).map(a => a.trim()).filter(Boolean),
            markets: shot.markets || '',
            shot: shot.description || '',
          };
          if (existing >= 0) {
            SCENE_DATA[existing] = entry;
          } else if (typeof SCENE_DATA !== 'undefined') {
            SCENE_DATA.push(entry);
          }
        });
        // Save to server
        fetch('/api/config', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ shot_descriptions: shots })
        }).catch(() => {});
        toast(`✓ Shot descriptions loaded — ${shots.length} shots`);
        document.getElementById('nb-1').textContent = shots.length + ' shots';
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
        // Save copy data and sheet URL to server
        fetch('/api/config', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ sheet_url: s.url.trim(), copy_rows: parsed.copy_rows })
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
      if (typeof saveSheetsMeta === 'function') saveSheetsMeta();
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
//
//  Matching rules:
//  1. Shot column has slate codes (e.g. "PU1, PU7") → row applies to those slates only
//  2. Shot column blank → row applies to entire category (fallback)
//  3. Brand = "SmartSaver" → excluded entirely
//  4. Multiple rows can match the same slate — store ALL, user picks which to use
// ═══════════════════════════════════════════════════════════════
function slugifyCopy(en) {
  // First 3 words, max 18 chars, strip punctuation, join with _
  const words = (en || '').replace(/[^\w\s]/g, '').trim().split(/\s+/).slice(0, 3);
  let slug = words.join('_');
  if (slug.length > 18) slug = slug.slice(0, 18).replace(/_$/, '');
  return slug;
}

function autoMapCopyToClips(copyRows) {
  if (!copyRows?.length) return;

  const CAT_NORM = {
    'product usage':'Product Usage', 'travel':'Travel and Holiday',
    'travel and holiday':'Travel and Holiday', 'home reno':'Home Renovation',
    'home renovation':'Home Renovation', 'lifestyle/events':'Lifestyle and Events',
    'lifestyle and events':'Lifestyle and Events', 'tech':'Electronics and Devices',
    'electronics and devices':'Electronics and Devices', 'financial relief':'Financial Relief',
  };
  function normCat(raw) { return CAT_NORM[(raw||'').toLowerCase().trim()] || raw || ''; }

  // Build per-slate and per-category copy buckets
  const bySlate = {};   // { 'PU1': [row, ...] }
  const byCat   = {};   // { 'Product Usage': [row, ...] }

  copyRows.forEach(row => {
    const cat   = normCat(row.category);
    const shot  = (row.shot || '').trim();
    const brand = (row.brand || '').toLowerCase();

    // Rule 3: exclude SmartSaver
    if (brand === 'smartsaver') return;

    const rowEntry = {
      key:      slugifyCopy(row.en) || row.key || '',
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
      // Rule 1: parse slate codes from Shot column
      const slates = shot.split(/[\s,;]+/).map(s => s.trim()).filter(s => /^[A-Z]{2}\d+$/.test(s));
      slates.forEach(slate => {
        if (!bySlate[slate]) bySlate[slate] = [];
        bySlate[slate].push(rowEntry);
      });
      if (!slates.length && cat) {
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(rowEntry);
      }
    } else if (cat) {
      // Rule 2: blank shot → category-wide fallback
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(rowEntry);
    }
  });

  // Assign to every slate in the actual clip library
  let totalMapped = 0;
  const allSlates = [...new Set(state.clipLibrary.map(c => c.slate).filter(Boolean))];

  allSlates.forEach(slate => {
    const clipForSlate = state.clipLibrary.find(c => c.slate === slate);
    const slateCat = normCat(clipForSlate?.category || '');
    const matches  = [];

    // Rule 4: collect ALL matching rows — slate-specific first, then category-wide
    if (bySlate[slate]) matches.push(...bySlate[slate]);
    if (byCat[slateCat]) {
      byCat[slateCat].forEach(r => {
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
  toast(`✓ Copy mapped to ${totalMapped}/${allSlates.length} slates`);
}

// ─── getCopy: priority order per spec ──
// 1. copyAssignments[slate][userSelectedIndex] for that language
// 2. Manual override from slateAssignments (user picked a specific key)
// 3. Global language override
// 4. Empty string — row will be OMITTED from CSV (never use placeholder)
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
    return COPY_KEYS[assignedKey][lang.toLowerCase()] || '';
  }

  // 3. Global language override
  if (state.copyOverride[lang]) return state.copyOverride[lang];

  // 4. No copy found — return empty (row will be omitted from CSV)
  return '';
}
