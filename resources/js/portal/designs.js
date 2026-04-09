// ═══════════════════════════════════════════════════════════════
//  DESIGNS — available designs global + page render + preview
// ═══════════════════════════════════════════════════════════════

// Available designs (loaded from admin config)
let availableDesigns = [];

async function loadDesigns() {
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();
    availableDesigns = cfg.designs || [];
  } catch(e) { availableDesigns = []; }
}

function renderDesignsPage() {
  const grid  = document.getElementById('designs-grid');
  const empty = document.getElementById('designs-empty');
  if (!availableDesigns.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const RATIOS = ['16x9','9x16','1x1','4x5'];
  grid.innerHTML = availableDesigns.map(d => {
    const key   = typeof d === 'object' ? (d.key   || '') : d;
    const label = typeof d === 'object' ? (d.label || key) : d;
    const imgs  = typeof d === 'object' ? (d.images || {}) : {};
    const thumbs = RATIOS.filter(r => imgs[r]).map(r =>
      `<div style="flex:1;min-width:0;cursor:pointer;" onclick="previewDesignImg('${esc(imgs[r])}')">
        <img src="${esc(imgs[r])}" style="width:100%;border-radius:4px;object-fit:cover;aspect-ratio:${r.replace('x','/')};display:block;">
        <div style="font-size:8px;color:var(--muted);text-align:center;margin-top:3px;">${r}</div>
      </div>`
    ).join('');
    return `<div style="background:var(--s2);border:1px solid var(--border2);border-radius:10px;padding:16px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:4px;">${esc(label)}</div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:12px;font-family:'DM Mono',monospace;">${esc(key)}</div>
      <div style="display:flex;gap:8px;">${thumbs || '<div style="font-size:10px;color:var(--muted);">No preview images</div>'}</div>
    </div>`;
  }).join('');
}

function previewDesignImg(src) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  ov.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);">`;
  ov.onclick = () => document.body.removeChild(ov);
  document.body.appendChild(ov);
}
