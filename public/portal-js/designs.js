// ═══════════════════════════════════════════════════════════════
//  DESIGNS — available designs global + page render + preview
// ═══════════════════════════════════════════════════════════════

let availableDesigns = [];

async function loadDesigns() {
  try {
    const pr = await fetch('/api/projects');
    if (!pr.ok) throw new Error();
    const projects = await pr.json();
    const active = projects.find(p => p.is_active);
    availableDesigns = active ? (active.designs || []) : [];
  } catch(e) { availableDesigns = []; }
}

// ── Full-page designs view (Designs tab) ────────────────────
function renderDesignsFullPage() {
  const grid  = document.getElementById('designs-full-grid');
  const empty = document.getElementById('designs-full-empty');
  if (!grid) return;

  if (!availableDesigns.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  const RATIOS = ['16x9', '9x16', '1x1', '4x5'];

  grid.innerHTML = availableDesigns.map(d => {
    const key   = typeof d === 'object' ? (d.key   || '') : d;
    const label = typeof d === 'object' ? (d.label || key) : d;
    const imgs  = typeof d === 'object' ? (d.images || {}) : {};

    const ratioCards = RATIOS.map(r => {
      const img = imgs[r];
      if (!img) return `<div style="flex:1;min-width:0;text-align:center;padding:20px 0;background:var(--s3);border-radius:6px;"><div style="font-size:9px;color:var(--muted);">${r}</div><div style="font-size:8px;color:var(--muted2);margin-top:4px;">No image</div></div>`;
      return `<div style="flex:1;min-width:0;cursor:pointer;" onclick="previewDesignImg('${esc(img)}')">
        <img src="${esc(img)}" style="width:100%;border-radius:6px;object-fit:cover;aspect-ratio:${r.replace('x','/')};display:block;border:1px solid var(--border);">
        <div style="font-size:9px;color:var(--muted);text-align:center;margin-top:4px;">${r}</div>
      </div>`;
    }).join('');

    return `<div style="background:var(--s2);border:1px solid var(--border2);border-radius:10px;padding:20px;">
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px;">${esc(label)}</div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:14px;font-family:'DM Mono',monospace;">${esc(key)}</div>
      <div style="display:flex;gap:10px;">${ratioCards}</div>
    </div>`;
  }).join('');
}

// ── Lightbox preview ────────────────────────────────────────
function previewDesignImg(src) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:2000;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;';
  ov.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);">`;
  ov.onclick = () => document.body.removeChild(ov);
  document.addEventListener('keydown', function closeLightbox(e) {
    if (e.key === 'Escape') { document.body.removeChild(ov); document.removeEventListener('keydown', closeLightbox); }
  });
  document.body.appendChild(ov);
}
