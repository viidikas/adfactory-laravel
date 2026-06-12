// ═══════════════════════════════════════════════════════════════
//  STATE — globals shared across all portal modules
// ═══════════════════════════════════════════════════════════════
const LANGS = ['EN','ET','DE','FR','ES'];

let currentUser  = null;
let clipLibrary  = [];
let copyLines    = [];   // current market's copies, from /api/copies
let copyRows     = [];   // legacy compat — alias for copyLines
let basket       = JSON.parse(localStorage.getItem('gp_basket') || '[]');

// Market-scoped ordering: the whole basket belongs to ONE active market.
// Brand is derived from the market (markets are brand-scoped), so the existing
// dual-brand design/template logic keeps working via selectedBrand.
let markets       = [];
let currentMarket = JSON.parse(localStorage.getItem('gp_market') || 'null');
let selectedBrand = currentMarket?.brand || 'Creditstar';

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
const ALL_TABS = ['copy-browse','browse','designs','orders'];

function showTab(tab) {
  ALL_TABS.forEach(t => {
    const view = document.getElementById('view-'+t);
    const tabEl = document.getElementById('tab-'+t);
    if (view) view.classList.toggle('hidden', t !== tab);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
  });
  if (tab === 'orders')      loadOrders();
  if (tab === 'copy-browse') initCopyBrowse();
  if (tab === 'browse')      { renderGrid(); closeDetailPanel(); }
  if (tab === 'designs')     renderDesignsFullPage();
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
async function login(user) {
  currentUser = user;
  document.getElementById('topbar-user-name').textContent = user.name;
  // The markets / per-copy admin lives in AD.FACTORY (super-admin only) — the
  // Growth Portal no longer exposes an Admin tab.
  updateBasketBar();

  // Markets gate everything: load them first so we know the active set and which
  // one is selected, then load that market's copies alongside clips and designs.
  await loadMarkets();
  await Promise.all([
    loadDesigns(),
    loadClipsFromServer(),
    loadCopies(),
  ]);

  // Show default tab
  showTab('copy-browse');
}

// ═══════════════════════════════════════════════════════════════
//  MARKETS — active-market selector; brand is derived from the market
// ═══════════════════════════════════════════════════════════════
async function loadMarkets() {
  try {
    const r = await fetch('/api/markets');
    const data = await r.json();
    // Even an admin (who receives every market) may only ORDER for active ones.
    markets = (Array.isArray(data) ? data : []).filter(m => m.active);
  } catch (e) {
    markets = [];
  }

  // Keep the current selection only if it is still an active market. If the
  // market it was built for has gone away, the basket no longer applies.
  if (currentMarket && !markets.some(m => m.id === currentMarket.id)) {
    currentMarket = null;
    if (basket.length) clearBasket();
  }
  if (!currentMarket && markets.length) {
    // users.market is only a DEFAULT preference — it never restricts which
    // markets a lead may order for; any active market is selectable.
    currentMarket = markets.find(m => m.code === currentUser?.market) || markets[0];
  }
  persistMarket();
  selectedBrand = currentMarket?.brand || 'Creditstar';
  renderMarketSelector();
}

function persistMarket() {
  if (currentMarket) localStorage.setItem('gp_market', JSON.stringify(currentMarket));
  else localStorage.removeItem('gp_market');
}

function renderMarketSelector() {
  const sel = document.getElementById('market-select');
  const badge = document.getElementById('market-brand-badge');
  if (sel) {
    if (!markets.length) {
      sel.innerHTML = '<option value="">No markets available</option>';
      sel.disabled = true;
    } else {
      sel.disabled = false;
      sel.innerHTML = markets.map(m =>
        `<option value="${m.id}" ${currentMarket && m.id === currentMarket.id ? 'selected' : ''}>${esc(m.code)} — ${esc(m.name)}</option>`
      ).join('');
    }
  }
  if (badge) badge.textContent = currentMarket ? currentMarket.brand : '';
}

function onMarketChange(marketId) {
  const market = markets.find(m => String(m.id) === String(marketId));
  if (!market || (currentMarket && market.id === currentMarket.id)) return;

  // Switching market with a non-empty basket clears it (copies are per-market).
  if (basket.length && !confirm(`Switching to ${market.code} will clear your current basket (${basket.length} item${basket.length !== 1 ? 's' : ''}). Continue?`)) {
    renderMarketSelector(); // revert the <select> to the current market
    return;
  }

  clearBasket();
  currentMarket = market;
  selectedBrand = market.brand;
  if (typeof detailSelDesigns !== 'undefined') detailSelDesigns = [];
  persistMarket();
  renderMarketSelector();

  loadCopies().then(() => {
    if (typeof initCopyBrowse === 'function') initCopyBrowse();
    if (typeof renderGrid === 'function') renderGrid();
    if (typeof renderDesignsFullPage === 'function') renderDesignsFullPage();
  });
  toast('Switched to ' + market.code + ' · ' + market.brand);
}

// ═══════════════════════════════════════════════════════════════
//  COPIES — market-scoped, from /api/copies?market_id=
// ═══════════════════════════════════════════════════════════════
async function loadCopies() {
  if (!currentMarket) { copyLines = []; copyRows = []; return; }
  try {
    const r = await fetch('/api/copies?market_id=' + encodeURIComponent(currentMarket.id));
    if (r.status === 422) { handleMarketUnavailable(); return; }
    if (!r.ok) throw new Error();
    const data = await r.json();
    copyLines = Array.isArray(data) ? data : (data.lines || []);
    copyRows = copyLines;
  } catch (e) {
    copyLines = [];
    copyRows = [];
  }
}

// Legacy alias — some callers still reference loadCopyLines().
async function loadCopyLines() { return loadCopies(); }

// The selected market was disabled out from under us (422 from copies/orders):
// clear the basket, drop it from the active set, and prompt to pick another.
function handleMarketUnavailable() {
  toast('That market was just disabled — please pick another market.', true);
  clearBasket();
  currentMarket = null;
  persistMarket();
  loadMarkets()
    .then(() => loadCopies())
    .then(() => {
      if (typeof initCopyBrowse === 'function') initCopyBrowse();
      if (typeof renderGrid === 'function') renderGrid();
    });
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
