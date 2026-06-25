// ════════════════════════════════════════════════════════════════════════════
//  Templater CSV engine — the row-building logic the After Effects pipeline
//  depends on, lifted VERBATIM from the legacy public/adfactory-js generator
//  (generate.js generateSheet + main.js buildOutputFilename/buildFolderPath/
//  slugifyCopy + clips.js loadSlateData copy derivation + state.js compNames).
//
//  Kept byte-for-byte faithful on purpose: the new design drives the same
//  algorithm rather than re-implementing it, so the exported CSV stays
//  identical to production. Inputs are passed explicitly (no globals) so the
//  function is pure and unit-testable.
// ════════════════════════════════════════════════════════════════════════════

export const DEFAULT_DESIGNS = [
  { key: 'design1', fmts: ['16x9', '1x1', '9x16'] },
  { key: 'design2', fmts: ['16x9', '1x1', '9x16'] },
  { key: 'design5', fmts: ['16x9', '1x1', '9x16', '4x5v1', '4x5v2'] },
  { key: 'design6', fmts: ['16x9', '1x1', '9x16', '4x5v1', '4x5v2'] },
];

export const DEFAULT_FORMATS = [
  { key: '16x9', label: '16:9' },
  { key: '1x1', label: '1:1' },
  { key: '9x16', label: '9:16' },
  { key: '4x5v1', label: '4:5 v1' },
  { key: '4x5v2', label: '4:5 v2' },
];

export const ALL_CATEGORIES = [
  'Product Usage', 'Travel and Holiday', 'Home Renovation',
  'Lifestyle and Events', 'Electronics and Devices', 'Financial Relief',
];

export const ALL_LANGS = ['EN', 'ET', 'DE', 'FR', 'ES'];
export const ALL_BRANDS = ['Creditstar', 'Monefit'];

export function defaultFilters() {
  return {
    brand: ['Creditstar'],
    lang: ['EN'],
    cat: [...ALL_CATEGORIES],
    slate: [],
    design: [],
    fmt: [],
  };
}

// All columns the CSV/preview can show, in canonical order. (generate.js PREVIEW_ALL_COLS)
export const PREVIEW_ALL_COLS = [
  { key: 'line_nr', label: '#' },
  { key: 'target', label: 'Target Comp' },
  { key: 'aef_output_name', label: 'AE Output' },
  { key: 'filename', label: 'Filename' },
  { key: 'output', label: 'Output (Templater)' },
  { key: 'ae_output_path', label: 'Full Path' },
  { key: 'aef_footage', label: 'Footage' },
  { key: 'design', label: 'Design' },
  { key: 'format', label: 'Format' },
  { key: 'lang', label: 'Lang' },
  { key: 'brand', label: 'Brand' },
  { key: 'headline', label: 'Copy' },
  { key: 'aef_duration', label: 'Duration' },
  { key: 'duration_full', label: 'Full Dur' },
  { key: 'trim_in', label: 'Trim In' },
  { key: 'trim_out', label: 'Trim Out' },
  { key: 'disclaimer', label: 'Disclaimer' },
  { key: 'slate', label: 'Slate' },
  { key: 'actor', label: 'Actor' },
  { key: 'category', label: 'Category' },
  { key: 'markets', label: 'Markets' },
  { key: 'status', label: 'Status' },
];

export const DEFAULT_VISIBLE_COLS = ['line_nr', 'target', 'aef_footage', 'design', 'format', 'lang', 'brand', 'headline', 'filename', 'output'];

// The exact Templater CSV columns + order the AE Templater consumes (the proven
// "old that worked" format). CSV/Sheets export uses THIS — not the on-screen
// preview columns (DEFAULT_VISIBLE_COLS) and not every column (PREVIEW_ALL_COLS).
export const TEMPLATER_EXPORT_COLS = ['target', 'output', 'aef_footage', 'headline', 'brand', 'lang', 'design', 'format', 'slate', 'actor', 'filename'];

const COMP_LANGS = ['EN', 'ET', 'DE', 'FR', 'ES'];
const COMP_BRANDS = ['Creditstar', 'Monefit'];

// state.js migrateCompNames — normalize { brand:{key:val} } → { brand:{ EN:{key:val} } }
function migrateCompNames(raw) {
  const compNames = raw && typeof raw === 'object' ? { ...raw } : {};
  COMP_BRANDS.forEach((brand) => {
    const b = compNames[brand];
    if (!b || typeof b !== 'object') { compNames[brand] = {}; return; }
    const keys = Object.keys(b);
    const alreadyNested = keys.length && keys.every((k) => COMP_LANGS.includes(k));
    if (!alreadyNested) compNames[brand] = { EN: { ...b } };
  });
  COMP_BRANDS.forEach((brand) => {
    if (!compNames[brand]) compNames[brand] = {};
    COMP_LANGS.forEach((lang) => { if (!compNames[brand][lang]) compNames[brand][lang] = {}; });
  });
  return compNames;
}

// main.js slugifyCopy — up to 3 words, max 18 chars, filesystem-safe.
function slugifyCopy(copy) {
  if (!copy) return '';
  const clean = copy.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/);
  let slug = '';
  let wordCount = 0;
  for (const word of words) {
    if (wordCount >= 3) break;
    const next = slug ? slug + '_' + word : word;
    if (next.length > 18) break;
    slug = next;
    wordCount++;
  }
  return slug || words[0].slice(0, 18);
}

function getDesignFmts(designs, designKey) {
  const d = (designs || []).find((x) => x.key === designKey);
  return d ? d.fmts : [];
}

function buildFolderPath(folderParts, brand, slate, actorClean, design, fmt, lang, category, copy) {
  const catFolder = (category || '').replace(/\s+/g, '_');
  const copySlug = slugifyCopy(copy);
  const vals = { lang, brand, category: catFolder, slate, design, format: fmt, actor: actorClean, copyslug: copySlug };
  return (folderParts || ['brand', 'lang', 'category', 'copyslug', 'actor', 'design', 'format'])
    .map((p) => (vals[p] || '').replace(/\s+/g, '_')).filter(Boolean).join('/');
}

function buildOutputFilename(filenameParts, brand, slate, actorClean, design, fmt, lang, category, copy) {
  const catNoSpaces = (category || '').replace(/\s+/g, '_');
  const copySlug = slugifyCopy(copy);
  const partValues = {
    brand: brand || '', slate: slate || '', actor: actorClean || '', design: design || '',
    format: fmt || '', lang: lang || '', category: catNoSpaces, copyslug: copySlug,
  };
  return (filenameParts || ['brand', 'slate', 'actor', 'design', 'format', 'lang'])
    .map((k) => partValues[k] || '').filter(Boolean).join('_');
}

// clips.js loadSlateData — derive copyAssignments (slate → copy rows) and
// copyKeys (key → translations) from the clips' enriched copy[].
function deriveCopyMaps(clips) {
  const copyAssignments = {};
  const copyKeys = {};
  (clips || []).forEach((clip) => {
    (clip.copy || []).forEach((row) => {
      if (row && row.key && row.en && !copyKeys[row.key]) {
        copyKeys[row.key] = { en: row.en || '', et: row.et || '', fr: row.fr || '', de: row.de || '', es: row.es || '' };
      }
    });
    if (clip.copy?.length && clip.slate && !copyAssignments[clip.slate]) {
      copyAssignments[clip.slate] = clip.copy;
    }
  });
  return { copyAssignments, copyKeys };
}

// generate.js getCopy — resolve the headline for clip/brand/lang. Empty string
// means the row is OMITTED (never a placeholder).
function getCopy(t, clip, brand, lang) {
  const slate = clip.slate || '';
  // 1. Slate-level copy assignment (from synced sheet, user-selected index)
  if (slate && t.copyAssignments[slate]?.length) {
    const idx = t.copySelection[slate] || 0;
    const row = t.copyAssignments[slate][Math.min(idx, t.copyAssignments[slate].length - 1)];
    const val = row?.[lang.toLowerCase()];
    if (val) return val;
  }
  // 2. Manual key assignment via clip library dropdown (slate_assignments).
  const assignedKey = t.slateAssignments[clip.id] || t.slateAssignments[clip.nameNoExt];
  if (assignedKey && t.copyKeys[assignedKey]) {
    return t.copyKeys[assignedKey][lang.toLowerCase()] || '';
  }
  // 3. Global language override.
  if (t.copyOverride?.[lang]) return t.copyOverride[lang];
  // 4. No copy → omit.
  return '';
}

// Hydrate the generation context from /api/config + /api/clips, mirroring
// main.js init() + clips.js loadSlateData.
export function buildTemplaterState(config = {}, clips = []) {
  const { copyAssignments, copyKeys } = deriveCopyMaps(clips);
  return {
    designs: config.templater_designs?.length ? config.templater_designs : DEFAULT_DESIGNS,
    formats: config.templater_formats?.length ? config.templater_formats : DEFAULT_FORMATS,
    compNames: migrateCompNames(config.templater_comp_names),
    basePath: config.base_output_path || '',
    filenameParts: config.filename_parts?.length ? config.filename_parts : ['brand', 'slate', 'actor', 'design', 'format', 'lang'],
    folderParts: config.folder_parts?.length ? config.folder_parts : ['brand', 'category', 'copyslug', 'actor', 'format'],
    slateAssignments: config.slate_assignments && typeof config.slate_assignments === 'object' ? config.slate_assignments : {},
    copySelection: config.copy_selection && typeof config.copy_selection === 'object' ? config.copy_selection : {},
    copyOverride: {},
    copyAssignments,
    copyKeys,
  };
}

// Build the slate → category map from the clips themselves (loadSlateData
// replaces the hardcoded SCENE_DATA with clip-derived data).
export function slatesByCategory(clips) {
  const map = {};
  (clips || []).forEach((c) => {
    if (!c.slate) return;
    map[c.slate] = c.category || '';
  });
  return map;
}

const PREFIX = { Creditstar: 'CS', Monefit: 'MF' };
const FMT_LABEL = { '16x9': '16x9', '1x1': '1x1', '9x16': '9x16', '4x5v1': '4x5', '4x5v2': '4x5' };

// One Templater row for a (clip, design, format, lang, brand, copy). Shared by
// buildRows (bulk Generate) and buildOrderRows (per-order export) so both emit
// the IDENTICAL Templater format.
function templaterRow({ clip, design, fmt, lang, brand, copy, tstate, lineNr }) {
  const t = tstate;
  const compKey = `${design}_${fmt}`;
  const brandComps = t.compNames[brand] || {};
  const langBucket = (brandComps && typeof brandComps === 'object') ? (brandComps[lang] || brandComps.EN) : null;
  const legacyVal = (brandComps && typeof brandComps[compKey] === 'string') ? brandComps[compKey] : null;
  const shortDesign = design.replace('design', 'd');
  const fmtLabel = FMT_LABEL[fmt] || fmt;
  // Comp name = configured name, else the legacy fallback WITHOUT a lang suffix
  // (the AE comp is named e.g. "TEMPLATE_CS_16x9 d1").
  const compName = (langBucket && langBucket[compKey]) || legacyVal || `TEMPLATE_${PREFIX[brand] || 'CS'}_${fmtLabel} ${shortDesign}`;
  const actorClean = (clip.actor || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const slate = clip.slate || '';
  const outputFilename = buildOutputFilename(t.filenameParts, brand, slate, actorClean, design, fmt, lang, clip.category || '', copy);
  const folderPath = buildFolderPath(t.folderParts, brand, slate, actorClean, design, fmt, lang, clip.category || '', copy);
  const aeOutputPath = `${t.basePath}/${folderPath}/${outputFilename}.mp4`;
  return {
    line_nr: lineNr,
    target: compName,
    aef_output_name: `${slate}_${actorClean}_${fmt}_${shortDesign}_${PREFIX[brand] || 'CS'}`,
    aef_duration: clip.duration || '',
    trim_in: clip.trim_in || '0',
    trim_out: clip.trim_out || clip.duration || '',
    aef_footage: clip.name || clip.filename || '',
    format: fmt,
    headline: copy,
    brand,
    disclaimer: lang.toLowerCase(),
    duration_full: clip.duration || '',
    status: 'pending',
    filename: outputFilename,
    // `output` mirrors the source-footage path the Templater expects:
    // lang / category / slate / actor / clip-name, original spacing kept.
    output: `${lang}/${clip.category || ''}/${slate}/${clip.actor || actorClean}/${clip.nameNoExt || clip.name || ''}`,
    ae_output_path: aeOutputPath,
    design,
    lang,
    slate,
    actor: actorClean,
    category: clip.category,
    markets: clip.markets || '',
  };
}

// generate.js generateSheet — the canonical row builder whose output is
// exported as the Templater CSV. Pure: same inputs → same rows.
export function buildRows({ clips, filters, tstate, copyFilter = null }) {
  const f = filters;
  const t = tstate;

  let list = (clips || []).filter((c) => f.cat.includes(c.category));

  // Filter by selected slates (intersected with active categories).
  if (f.slate?.length) {
    const byCat = slatesByCategory(clips);
    const catSlates = new Set(Object.keys(byCat).filter((s) => f.cat.includes(byCat[s])));
    const activeSlates = f.slate.filter((s) => catSlates.has(s));
    if (activeSlates.length) list = list.filter((c) => activeSlates.includes(c.slate));
  }

  // Optional "Filter by Copy" override.
  if (copyFilter) {
    const cfCat = (copyFilter.category || '').toLowerCase();
    const cfShot = (copyFilter.shot || '').trim();
    if (cfShot) {
      const codes = cfShot.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      list = list.filter((c) => codes.includes((c.slate || '').toUpperCase()));
    } else if (cfCat) {
      list = list.filter((c) => (c.category || '').toLowerCase() === cfCat);
    }
  }

  const rows = [];
  for (const clip of list) {
    for (const design of f.design) {
      const validFmts = getDesignFmts(t.designs, design).filter((fmt) => f.fmt.includes(fmt));
      for (const fmt of validFmts) {
        for (const lang of f.lang) {
          for (const brand of f.brand) {
            let copy;
            if (copyFilter && copyFilter[lang.toLowerCase()]) copy = copyFilter[lang.toLowerCase()];
            else copy = getCopy(t, clip, brand, lang);
            if (!copy) continue; // omit rows with no copy assigned

            rows.push(templaterRow({ clip, design, fmt, lang, brand, copy, tstate: t, lineNr: rows.length + 1 }));
          }
        }
      }
    }
  }
  return rows;
}

// Build the Templater rows for ONE order's items. Each item (a chosen clip +
// copy + langs + designs) expands into design × format × language rows, in the
// same format as buildRows. `brand` is the order's brand; `clipsById` (optional)
// supplies the clip's full filename + nameNoExt for the aef_footage/output paths.
export function buildOrderRows(items, tstate, brand, clipsById = {}) {
  const rows = [];
  for (const item of (items || [])) {
    const ref = clipsById[item.clipId] || {};
    const clip = {
      slate: item.slate || ref.slate || '',
      category: item.category || ref.category || '',
      actor: item.actor || ref.actor || '',
      // aef_footage wants the full filename (with extension); output wants the
      // name without extension. Fall back to the stored clip name if the clip
      // is no longer in the active project.
      name: ref.name || (item.clipName ? `${item.clipName}.mov` : ''),
      nameNoExt: ref.nameNoExt || item.clipName || '',
    };
    for (const design of (item.designs || [])) {
      for (const fmt of getDesignFmts(tstate.designs, design)) {
        for (const lang of (item.langs || [])) {
          const copy = item.copyText?.[lang.toLowerCase()] || item.copyText?.[lang] || '';
          if (!copy) continue; // omit a language with no copy text
          rows.push(templaterRow({ clip, design, fmt, lang, brand, copy, tstate, lineNr: rows.length + 1 }));
        }
      }
    }
  }
  return rows;
}

// Estimated row count without building (for the live summary).
export function estimateRows(clips, filters, tstate) {
  const f = filters;
  let list = (clips || []).filter((c) => f.cat.includes(c.category));
  if (f.slate?.length) {
    const byCat = slatesByCategory(clips);
    const catSlates = new Set(Object.keys(byCat).filter((s) => f.cat.includes(byCat[s])));
    const activeSlates = f.slate.filter((s) => catSlates.has(s));
    if (activeSlates.length) list = list.filter((c) => activeSlates.includes(c.slate));
  }
  let fmtCount = 0;
  for (const d of f.design) fmtCount += getDesignFmts(tstate.designs, d).filter((fmt) => f.fmt.includes(fmt)).length;
  return { clips: list.length, fmtCount, total: list.length * fmtCount * f.lang.length * f.brand.length };
}

// CSV serialization with the visible columns (generate.js exportCSV).
export function rowsToCsv(rows, visibleCols) {
  const cols = visibleCols?.length ? visibleCols : PREVIEW_ALL_COLS.map((c) => c.key);
  const e = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(e).join(','), ...rows.map((r) => cols.map((h) => e(r[h])).join(','))].join('\n');
}
