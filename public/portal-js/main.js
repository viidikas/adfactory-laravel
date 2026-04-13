// ═══════════════════════════════════════════════════════════════
//  STATE — globals shared across all portal modules
// ═══════════════════════════════════════════════════════════════
const LANGS = ['EN','ET','DE','FR','ES'];

let currentUser  = null;
let clipLibrary  = [];
let copyLines    = [];   // from /api/copy-lines
let copyRows     = [];   // legacy compat — alias for copyLines
let basket       = JSON.parse(localStorage.getItem('gp_basket') || '[]');

// Shared filter state between modes
let sharedState = {
  selectedCategory: null,
  selectedCopy:     null,   // full copy row object
  selectedClips:    [],     // clip IDs
  selectedLangs:    ['EN'],
  selectedDesigns:  [],
};

const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function toast(msg, err=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = err ? 'var(--orange)' : 'var(--accent)';
  t.style.color = err ? 'var(--orange)' : 'var(--accent)';
  t.style.opacity = 1; t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.opacity=0; t.style.transform='translateY(8px)'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════
const ALL_TABS = ['copy-browse','browse','orders','admin'];

function showTab(tab) {
  ALL_TABS.forEach(t => {
    const view = document.getElementById('view-'+t);
    const tabEl = document.getElementById('tab-'+t);
    if (view) view.classList.toggle('hidden', t !== tab);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
  });
  if (tab === 'orders')      loadOrders();
  if (tab === 'admin')       loadAdminOrders();
  if (tab === 'copy-browse') initCopyBrowse();
  if (tab === 'browse')      { renderGrid(); closeDetailPanel(); }
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
async function login(user) {
  currentUser = user;
  document.getElementById('topbar-user-name').textContent = user.name;
  if (user.role === 'admin') {
    document.getElementById('tab-admin').classList.remove('hidden');
  }
  updateBasketBar();

  // Load data in parallel
  await Promise.all([
    loadCopyLines(),
    loadDesigns(),
    loadClipsFromServer(),
  ]);

  // Show default tab
  showTab('copy-browse');
}

// ═══════════════════════════════════════════════════════════════
//  COPY LINES — from /api/copy-lines
// ═══════════════════════════════════════════════════════════════
async function loadCopyLines() {
  try {
    const r = await fetch('/api/copy-lines');
    if (!r.ok) throw new Error();
    const data = await r.json();
    copyLines = Array.isArray(data) ? data : (data.lines || []);
    copyRows = copyLines; // legacy compat
  } catch(e) {
    copyLines = [];
    copyRows = [];
  }
}

function getCopyForClip(clip) {
  const slate = (clip.slate || '').toUpperCase();
  // 1. Slate-specific matches
  const slateMatches = slate ? copyLines.filter(r => {
    const shot = (r.shot || '').trim();
    if (!shot) return false;
    return shot.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).includes(slate);
  }) : [];
  if (slateMatches.length) return slateMatches;

  // 2. Category-wide fallback (no shot field = applies to whole category)
  const cat = (clip.category || '').toLowerCase();
  return copyLines.filter(r => {
    const rCat = (r.category || '').toLowerCase();
    const rShot = (r.shot || '').trim();
    if (rShot) return false;
    if (!rCat) return true;
    return rCat === cat;
  });
}

function getCopyForCategory(category) {
  const cat = (category || '').toLowerCase();
  return copyLines.filter(r => {
    const rCat = (r.category || '').toLowerCase();
    return rCat === cat || !rCat;
  });
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
function portalInit() {
  const authUser = window.__portalUser;
  if (authUser) {
    login(authUser);
  }
}
