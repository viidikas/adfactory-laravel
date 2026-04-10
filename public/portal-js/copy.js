// ═══════════════════════════════════════════════════════════════
//  COPY / SHEET — load copy from config, parse CSV, get copy for clip
// ═══════════════════════════════════════════════════════════════

function getCopyForClip(clip) {
  // 1. Slate-specific matches (shot field contains this clip's slate code)
  const slate = clip.slate || '';
  const slateMatches = slate ? copyRows.filter(r => {
    const shot = (r.shot || '').trim();
    if (!shot) return false;
    const codes = shot.split(/[\s,;]+/).map(s => s.trim());
    return codes.includes(slate);
  }) : [];
  if (slateMatches.length) return slateMatches;

  // 2. Category-wide matches (no shot specified, same category)
  const cat = (clip.category || '').toLowerCase();
  return copyRows.filter(r => {
    const rCat = (r.category || '').toLowerCase();
    const rShot = (r.shot || '').trim();
    if (rShot) return false; // skip slate-specific rows (already checked above)
    if (!rCat) return true;
    return rCat === cat || rCat.replace(/\s+/g,'') === cat.replace(/\s+/g,'');
  });
}

async function loadSheetFromConfig() {
  try {
    const r   = await fetch('/api/config');
    const cfg = await r.json();
    // Load designs (keep full objects — needed for images and labels)
    availableDesigns = cfg.designs || [];

    // Load pre-parsed copy rows from server (saved by admin AI analysis)
    if (cfg.copy_rows?.length) {
      copyRows = cfg.copy_rows;
      toast(`✓ Copy loaded — ${copyRows.length} lines`);
      return;
    }

    // Fallback: fetch and parse sheet CSV directly
    const url = cfg.sheet_url || '';
    if (!url) return;
    const sr   = await fetch('/api/sheets?url=' + encodeURIComponent(url));
    const data = await sr.json();
    if (!data.ok) throw new Error(data.error);
    parseSheetCSV(data.csv);
    toast(`✓ Copy sheet loaded — ${copyRows.length} lines`);
  } catch(e) {
    console.warn('Could not load config:', e.message);
  }
}

function parseCSVLine(line) {
  const cols = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function parseSheetCSV(csv) {
  const lines  = csv.trim().split('\n').map(l => parseCSVLine(l));
  if (lines.length < 2) return;
  const header = lines[0].map(h => h.toLowerCase());
  const catIdx  = header.findIndex(h => h.includes('category') || h.includes('cat'));
  const shotIdx = header.findIndex(h => h.includes('shot'));
  const brandIdx= header.findIndex(h => h.includes('brand'));
  const enIdx   = header.findIndex(h => h === 'en');
  const etIdx   = header.findIndex(h => h === 'et');
  const frIdx   = header.findIndex(h => h === 'fr');
  const deIdx   = header.findIndex(h => h === 'de');
  const esIdx   = header.findIndex(h => h === 'es');

  copyRows = [];
  const CAT_NORM = {'product usage':'Product Usage','travel':'Travel and Holiday',
    'travel and holiday':'Travel and Holiday','home reno':'Home Renovation',
    'home renovation':'Home Renovation','lifestyle/events':'Lifestyle and Events',
    'lifestyle and events':'Lifestyle and Events','tech':'Electronics and Devices',
    'electronics and devices':'Electronics and Devices','financial relief':'Financial Relief'};

  lines.slice(1).forEach((cols, i) => {
    const en = enIdx >= 0 ? (cols[enIdx]||'') : '';
    if (!en) return;
    const rawCat = catIdx >= 0 ? (cols[catIdx]||'') : '';
    const cat    = CAT_NORM[rawCat.toLowerCase()] || rawCat;
    const brand  = brandIdx >= 0 ? (cols[brandIdx]||'') : '';
    // Skip rows with no category and no brand — they're sheet notes, not copy
    if (!rawCat && !brand) return;
    if (brand.toLowerCase() === 'smartsaver') return;
    copyRows.push({
      key:      en.slice(0,30),
      category: cat,
      shot:     shotIdx >= 0 ? (cols[shotIdx]||'') : '',
      brand,
      en, et: etIdx>=0?(cols[etIdx]||''):'',
      fr: frIdx>=0?(cols[frIdx]||''):'',
      de: deIdx>=0?(cols[deIdx]||''):'',
      es: esIdx>=0?(cols[esIdx]||''):'',
    });
  });
}
