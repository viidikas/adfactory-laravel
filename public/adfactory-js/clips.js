// ═══════════════════════════════════════════════════════════════
//  PROJECTS — server-side folder management
// ═══════════════════════════════════════════════════════════════

async function loadProjects() {
  const list = document.getElementById('project-list');
  if (!list) return;
  try {
    const r = await fetch('/api/projects');
    if (!r.ok) throw new Error();
    const projects = await r.json();
    if (!projects.length) {
      list.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:8px 0;">No projects yet. Create one below.</div>';
      return;
    }
    list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead><tr>
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Project</th>
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Folder</th>
        <th style="background:var(--s3);padding:7px 10px;text-align:left;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Clips</th>
        <th style="background:var(--s3);padding:7px 10px;text-align:right;font-size:9px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.8px;">Actions</th>
      </tr></thead>
      <tbody>${projects.map(p => `<tr style="border-bottom:1px solid var(--border);${p.is_active?'background:rgba(232,255,71,.05);':''}">
        <td style="padding:8px 10px;color:var(--text);">
          ${esc(p.name)}
          ${p.is_active ? '<span style="font-size:8px;color:var(--accent);margin-left:6px;text-transform:uppercase;letter-spacing:1px;">Active</span>' : ''}
        </td>
        <td style="padding:8px 10px;color:var(--muted);font-size:9px;">${esc(p.path)}</td>
        <td style="padding:8px 10px;color:var(--muted);">${p.clips_count}${p.scanned_at ? '' : ' <span style="color:var(--orange);">not scanned</span>'}</td>
        <td style="padding:8px 10px;text-align:right;white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:9px;" onclick="scanProject(${p.id})">Scan</button>
          ${p.is_active ? '' : `<button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:9px;" onclick="activateProject(${p.id})">Activate</button>`}
          <button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:9px;color:var(--orange);" onclick="deleteProject(${p.id},'${esc(p.name)}')">Delete</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch(e) {
    list.innerHTML = '<div style="font-size:10px;color:var(--orange);padding:8px 0;">Could not load projects</div>';
  }
}

async function createProject() {
  const name = document.getElementById('new-project-name').value.trim();
  const path = document.getElementById('new-project-path').value.trim();
  const status = document.getElementById('project-status');
  if (!name || !path) { toast('Enter both name and folder name', true); return; }
  try {
    const r = await fetch('/api/projects', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name, path})
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.message || 'Server error');
    }
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-path').value = '';
    if (status) status.textContent = '';
    toast(`Project "${name}" created`);
    loadProjects();
  } catch(e) {
    if (status) status.textContent = e.message;
    toast(e.message, true);
  }
}

async function scanProject(id) {
  toast('Scanning folder...');
  try {
    const r = await fetch(`/api/projects/${id}/scan`, {method:'POST'});
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.message || 'Scan failed');
    }
    const data = await r.json();
    toast(`Scanned ${data.count} clips`);
    loadProjects();
    loadClipsFromProxy();
  } catch(e) {
    toast(e.message, true);
  }
}

async function activateProject(id) {
  try {
    const r = await fetch(`/api/projects/${id}/activate`, {method:'PUT'});
    if (!r.ok) throw new Error();
    toast('Project activated');
    loadProjects();
    loadClipsFromProxy();
  } catch(e) {
    toast('Could not activate project', true);
  }
}

async function deleteProject(id, name) {
  if (!confirm(`Delete project "${name}" and all its clips?`)) return;
  try {
    const r = await fetch(`/api/projects/${id}`, {method:'DELETE'});
    if (!r.ok) throw new Error();
    toast('Project deleted');
    loadProjects();
  } catch(e) {
    toast('Could not delete project', true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  CLIP LIBRARY — folder scan, match, player, copy assignment
// ═══════════════════════════════════════════════════════════════

const VIDEO_EXTS = new Set(['mov','mp4','m4v','avi','mxf','mkv','webm']);

async function scanFolder() {
  if (!window.showDirectoryPicker) {
    toast('Your browser does not support folder scanning. Please use Chrome or Edge.', true);
    return;
  }
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    const clips = [];

    // Show scanning indicator
    document.getElementById('nb-2').textContent = 'scanning…';
    document.getElementById('nb-2').className = 'nav-badge';

    // Recursive walk — collects all video files under any depth of subdirectory
    async function walk(dirH, pathPrefix) {
      for await (const [name, handle] of dirH.entries()) {
        if (handle.kind === 'directory') {
          await walk(handle, pathPrefix ? `${pathPrefix}/${name}` : name);
        } else if (handle.kind === 'file') {
          const ext = name.split('.').pop().toLowerCase();
          if (!VIDEO_EXTS.has(ext)) continue;
          const file = await handle.getFile();
          const relativePath = pathPrefix ? `${pathPrefix}/${name}` : name;
          const clip = buildClipEntry(name, file, handle, relativePath);
          clips.push(clip);
          // Live counter update every 10 files so user sees progress
          if (clips.length % 10 === 0) {
            document.getElementById('nb-2').textContent = `${clips.length} found…`;
            await new Promise(r => setTimeout(r, 0)); // yield to UI
          }
        }
      }
    }

    await walk(dirHandle, '');
    clips.sort((a,b) => a.relativePath.localeCompare(b.relativePath));

    state.clipLibrary = clips;
    matchClipsToSheetData();
    renderClipGrid();
    updateLibStats();
    document.getElementById('btn-clear-lib').style.display = '';
    document.getElementById('lib-toolbar').style.display = '';
    document.getElementById('lib-stats-bar').style.display = '';
    document.getElementById('nb-2').textContent = clips.length + ' clips';
    document.getElementById('nb-2').className = 'nav-badge ok';
    toast(`✓ Scanned ${clips.length} clips across folder tree`);

    // Sync clip metadata to proxy so Growth Portal can load them without scanning
    // Use the path from the input; if empty, preserve whatever the proxy already has
    let basePath = document.getElementById('footage-base-path')?.value.trim() || '';
    if (!basePath) {
      try { const m = await fetch('/api/clips-meta'); if (m.ok) { basePath = (await m.json()).base_path || ''; } } catch(e) {}
    }
    if (basePath) localStorage.setItem('af_footage_path', basePath);
    const clipMeta = clips.map(c => ({
      id: c.id, name: c.name, nameNoExt: c.nameNoExt,
      relativePath: c.relativePath, category: c.category,
      slate: c.slate, slateNum: c.slateNum, actor: c.actor, version: c.version
    }));
    fetch('/api/clips', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ clips: clipMeta, base_path: basePath })
    }).then(() => {
      // Pre-generate thumbnails in the background (batch 5 at a time)
      (async () => {
        const batch = 5;
        for (let i = 0; i < clips.length; i += batch) {
          const chunk = clips.slice(i, i + batch);
          await Promise.allSettled(chunk.map(c =>
            fetch('/api/thumb?path=' + encodeURIComponent(c.relativePath))
          ));
        }
      })();
    }).catch(() => {});
  } catch(e) {
    if (e.name !== 'AbortError') toast('Folder scan failed: ' + e.message, true);
    document.getElementById('nb-2').textContent = '—';
  }
}

function buildClipEntry(name, file, handle, relativePath) {
  const nameNoExt = name.replace(/\.[^.]+$/, '');
  const parts = nameNoExt.split('_');

  // Filename pattern: Category_Number_Actor_Version.mov
  // e.g. "Travel and Holiday_1_Andrey.mov"      → cat="Travel and Holiday", num=1, actor="Andrey"
  //      "Electronics and Devices_1_Lauri_2.mov" → cat="Electronics and Devices", num=1, actor="Lauri", ver=2
  //      "Travel and Holiday_3_Viktoria_Lauri.mov"→ cat="Travel and Holiday", num=3, actor="Viktoria Lauri"

  let category = '', slateNum = '', actor = '', version = '';

  if (parts.length >= 3) {
    // Check if last part is a pure number (version suffix like _1, _2)
    const lastPart = parts[parts.length - 1];
    const hasVersionSuffix = /^\d+$/.test(lastPart);

    if (hasVersionSuffix && parts.length >= 4) {
      // Last part is version number: Category_Num_Actor_Version
      version = lastPart;
      slateNum = parts[parts.length - 3];
      // Actor could be multiple words joined by _ (e.g. Viktoria_Lauri)
      // Everything between slateNum and version is actor
      const slateNumIdx = parts.length - 3;
      actor = parts.slice(slateNumIdx + 1, parts.length - 1).join(' ');
      category = parts.slice(0, slateNumIdx).join(' ');
    } else {
      // No version: Category_Num_Actor (actor may be multi-word: Viktoria_Lauri)
      slateNum = parts[parts.length - 2];
      // Check if slateNum is actually a number
      if (/^\d+$/.test(slateNum)) {
        actor = parts.slice(parts.length - 1).join(' ');
        // But actor might span multiple parts before the last _ if it has spaces
        // For "Travel and Holiday_3_Viktoria_Lauri" → slateNum=3, actor="Viktoria Lauri"
        // Detect: if second-to-last is NOT a number, actor spans backwards
        let actorParts = [parts[parts.length - 1]];
        let i = parts.length - 2;
        // Walk back while not hitting the slate number
        while (i > 0 && !/^\d+$/.test(parts[i])) {
          actorParts.unshift(parts[i]);
          i--;
        }
        slateNum = parts[i];
        actor = actorParts.join(' ');
        category = parts.slice(0, i).join(' ');
      } else {
        actor = parts[parts.length - 1];
        category = parts.slice(0, parts.length - 2).join(' ');
      }
    }
  } else if (parts.length === 2) {
    slateNum = parts[0]; actor = parts[1];
  } else {
    actor = nameNoExt;
  }

  // Also try matching from the subfolder name (more reliable)
  const relPath = relativePath || name;
  const folderParts = relPath.split('/');
  const subfolderName = folderParts.length > 1 ? folderParts[folderParts.length - 2] : '';
  const catFromFolder = CAT_SLUG_MAP[subfolderName] ? subfolderName.replace(/_/g,' ') : '';
  if (catFromFolder) category = catFromFolder;

  const catSlug = CAT_SLUG_MAP[category] || CAT_SLUG_MAP[category.replace(/\s+/g,'_')] || category.replace(/\s+/g,'').slice(0,2).toUpperCase();
  const slate = slateNum ? `${catSlug}${slateNum}` : '';

  // Match status
  let matchStatus = 'unmatched';
  const sheetClip = state.analysedClips.find(c =>
    c.filename && c.filename.toLowerCase() === name.toLowerCase()
  );
  if (sheetClip) matchStatus = 'matched';

  const id = nameNoExt;
  const existingCopy = state.clipCopyMap[id] || {};
  const copyLangs = Object.values(existingCopy).filter(Boolean).length;
  if (matchStatus === 'matched' && copyLangs === 0) matchStatus = 'partial';

  const relFolder = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';

  return {
    id,
    name,
    nameNoExt,
    relativePath: relPath,
    relFolder,
    file,
    fileHandle: handle,
    url: URL.createObjectURL(file),
    category,
    catSlug,
    slateNum,
    slate,
    version,
    actor: actor.trim(),
    matchStatus,
    sheetClip: sheetClip || null,
    size: file.size,
  };
}

function matchClipsToSheetData() {
  for (const clip of state.clipLibrary) {
    // Match against SCENE_DATA by slate or category+actor
    const scene = SCENE_DATA.find(s =>
      s.slate === clip.slate ||
      (s.category === clip.category && s.actor_options.includes(clip.actor))
    );
    clip.sheetClip = scene || null;

    // Status: matched = has copy key assigned, partial = scene found but no key, unmatched = no scene
    const hasKey = !!state.slateAssignments[clip.id];
    if (hasKey) clip.matchStatus = 'matched';
    else if (scene) clip.matchStatus = 'partial';
    else clip.matchStatus = 'unmatched';
  }
}

function updateLibStats() {
  const matched  = state.clipLibrary.filter(c => c.matchStatus === 'matched').length;
  const partial  = state.clipLibrary.filter(c => c.matchStatus === 'partial').length;
  const unmatched= state.clipLibrary.filter(c => c.matchStatus === 'unmatched').length;
  document.getElementById('stat-matched').textContent   = `${matched} matched`;
  document.getElementById('stat-partial').textContent   = `${partial} partial copy`;
  document.getElementById('stat-unmatched').textContent = `${unmatched} unmatched`;
  document.getElementById('stat-total').textContent     = `${state.clipLibrary.length} clips total`;
}

function renderClipGrid() {
  const search = (document.getElementById('lib-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('lib-filter-status')?.value || '';
  const catFilter = document.getElementById('lib-filter-cat')?.value || '';
  const grid = document.getElementById('clip-grid');
  const empty = document.getElementById('lib-empty');

  if (!state.clipLibrary.length) {
    grid.innerHTML = '';
    empty.style.display = 'none';
    return;
  }

  let clips = state.clipLibrary.filter(c => {
    if (search && !c.name.toLowerCase().includes(search) && !c.actor.toLowerCase().includes(search) && !c.category.toLowerCase().includes(search)) return false;
    if (statusFilter && c.matchStatus !== statusFilter) return false;
    if (catFilter && c.category !== catFilter) return false;
    return true;
  });

  document.getElementById('lib-grid-count').textContent = `${clips.length} / ${state.clipLibrary.length} clips`;

  if (!clips.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = clips.map(clip => {
    // Copy preview: show from copyAssignments (slate-level) if available
    const slate = clip.slate || '';
    const assignments = state.copyAssignments[slate] || [];
    const selIdx = state.copySelection[slate] || 0;
    const selRow = assignments[Math.min(selIdx, assignments.length - 1)];
    const manualKey = state.slateAssignments[clip.id] || '';

    let copyPreviewHtml = '';
    if (manualKey && COPY_KEYS[manualKey]) {
      copyPreviewHtml = `<span style="color:var(--accent);font-size:9px;">${esc(manualKey)}</span> <span style="color:var(--muted2);font-size:9px;">${esc((COPY_KEYS[manualKey].en||'').slice(0,30))}…</span>`;
    } else if (selRow?.en) {
      const multiLabel = assignments.length > 1 ? `<span style="color:var(--warn);font-size:8px;margin-left:4px;">${assignments.length} options</span>` : '';
      copyPreviewHtml = `<span style="color:var(--green);font-size:9px;">${esc(selRow.en.slice(0,30))}${selRow.en.length>30?'…':''}</span>${multiLabel}`;
    } else if (assignments.length > 0) {
      copyPreviewHtml = `<span style="color:var(--warn);font-size:9px;">~ partial (${assignments.length} row${assignments.length>1?'s':''})</span>`;
    } else {
      copyPreviewHtml = `<span style="color:var(--orange);font-size:9px;">no copy</span>`;
    }

    const badgeClass = clip.matchStatus === 'matched' ? 'cmb-matched' : clip.matchStatus === 'partial' ? 'cmb-partial' : 'cmb-unmatched';
    const badgeText  = clip.matchStatus === 'matched' ? '✓ copy' : clip.matchStatus === 'partial' ? '~ partial' : '✗ no copy';

    // Scene description from manifest
    const scene = SCENE_DATA.find(s => s.slate === slate);
    const shotDesc = scene ? `<div style="font-size:8px;color:var(--muted);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(scene.shot)}">${esc(scene.shot)}</div>` : '';

    return `<div class="clip-card ${clip.matchStatus}" id="cc-${clip.id.replace(/[^a-zA-Z0-9]/g,'_')}" onclick="openClipModal('${esc(clip.id)}')">
      <div class="clip-thumb">
        <img src="/api/thumb?path=${encodeURIComponent(clip.relativePath)}" loading="lazy" alt="">
        <div class="clip-play-btn"><div class="clip-play-icon">▶</div></div>
      </div>
      <div class="clip-info">
        <div class="clip-name" title="${esc(clip.relativePath)}">${slate ? `<span style="color:var(--accent)">${esc(slate)}</span> ` : ''}${esc(clip.actor)}</div>
        ${clip.relFolder ? `<div style="font-size:8px;color:var(--muted);margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📁 ${esc(clip.relFolder)}</div>` : ''}
        ${shotDesc}
        <div class="clip-copy-status">
          <span class="clip-match-badge ${badgeClass}">${badgeText}</span>
          <span style="margin-left:4px;">${copyPreviewHtml}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function loadClipsFromProxy() {
  try {
    const r = await fetch('/api/clips');
    if (!r.ok) return;
    const metas = await r.json();
    if (!Array.isArray(metas) || !metas.length) return;

    state.clipLibrary = metas.map(m => ({
      id:           m.id || m.nameNoExt || m.name.replace(/\.[^.]+$/, ''),
      name:         m.name,
      nameNoExt:    m.nameNoExt || m.name.replace(/\.[^.]+$/, ''),
      relativePath: m.relativePath || m.name,
      relFolder:    m.relativePath ? m.relativePath.split('/').slice(0,-1).join('/') : '',
      category:     m.category || '',
      slate:        m.slate || '',
      slateNum:     m.slateNum || '',
      actor:        m.actor || '',
      version:      m.version || '',
      description:  m.description || '',
      markets:      m.markets || '',
      copy:         m.copy || [],
      file:         null,
      fileHandle:   null,
      url:          '',
      matchStatus:  m.copy?.length ? 'matched' : 'unmatched',
    }));

    matchClipsToSheetData();
    const el = id => document.getElementById(id);
    if (el('clip-grid'))      renderClipGrid();
    if (el('lib-stats-bar'))  updateLibStats();
    if (el('btn-clear-lib'))  el('btn-clear-lib').style.display = '';
    if (el('lib-toolbar'))    el('lib-toolbar').style.display = '';
    if (el('lib-stats-bar'))  el('lib-stats-bar').style.display = '';
    if (el('nb-2')) { el('nb-2').textContent = state.clipLibrary.length + ' clips'; el('nb-2').className = 'nav-badge ok'; }
  } catch(e) { /* proxy not running — silent, user can scan manually */ }
}

function loadSlateData() {
  // Rebuild SCENE_DATA and COPY_KEYS from enriched clip data
  // so all downstream code (filters, generate, copy mapping) works
  if (!state.clipLibrary.length) return;

  // Rebuild SCENE_DATA from clips
  const slateMap = {};
  state.clipLibrary.forEach(clip => {
    if (!clip.slate) return;
    if (!slateMap[clip.slate]) {
      slateMap[clip.slate] = {
        slate: clip.slate,
        category: clip.category || '',
        actor_options: [],
        markets: clip.markets || '',
        shot: clip.description || '',
      };
    }
    const entry = slateMap[clip.slate];
    // Collect actors (split comma-separated)
    (clip.actor || '').split(',').map(a => a.trim()).filter(Boolean).forEach(a => {
      if (!entry.actor_options.includes(a)) entry.actor_options.push(a);
    });
    // Use enriched data if available
    if (clip.description && !entry.shot) entry.shot = clip.description;
    if (clip.markets && !entry.markets) entry.markets = clip.markets;
  });
  // Replace SCENE_DATA entirely with DB data
  if (typeof SCENE_DATA !== 'undefined') {
    SCENE_DATA.length = 0;
    Object.values(slateMap).forEach(s => SCENE_DATA.push(s));
  }

  // Rebuild COPY_KEYS from clip copy data
  if (typeof COPY_KEYS !== 'undefined') {
    // Clear existing hardcoded keys
    Object.keys(COPY_KEYS).forEach(k => delete COPY_KEYS[k]);
    // Populate from enriched clips
    state.clipLibrary.forEach(clip => {
      (clip.copy || []).forEach(row => {
        if (row.key && row.en && !COPY_KEYS[row.key]) {
          COPY_KEYS[row.key] = {
            en: row.en || '', et: row.et || '', fr: row.fr || '',
            de: row.de || '', es: row.es || '',
          };
        }
      });
    });
  }

  // Build copyAssignments from enriched clip data
  const bySlate = {};
  state.clipLibrary.forEach(clip => {
    if (clip.copy?.length && clip.slate && !bySlate[clip.slate]) {
      bySlate[clip.slate] = clip.copy;
    }
  });
  if (Object.keys(bySlate).length) {
    state.copyAssignments = bySlate;
    Object.keys(bySlate).forEach(slate => {
      if (state.copySelection[slate] === undefined) state.copySelection[slate] = 0;
    });
    localStorage.setItem('af_copy_assignments', JSON.stringify(state.copyAssignments));
    localStorage.setItem('af_copy_selection', JSON.stringify(state.copySelection));
    if (typeof renderCopySelector === 'function') renderCopySelector();
  }
}

function clearLibrary() {
  state.clipLibrary.forEach(c => { if (c.url) URL.revokeObjectURL(c.url); });
  state.clipLibrary = [];
  state.clipCopyMap = {};
  renderClipGrid();
  document.getElementById('btn-clear-lib').style.display = 'none';
  document.getElementById('lib-toolbar').style.display = 'none';
  document.getElementById('lib-stats-bar').style.display = 'none';
  document.getElementById('nb-2').textContent = '—';
  document.getElementById('nb-2').className = 'nav-badge';
  // Clear footage path
  const el = document.getElementById('footage-base-path');
  if (el) el.value = '';
  localStorage.removeItem('af_footage_path');
  // Clear clips and path on proxy
  fetch('/api/clips', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({clips: [], base_path: ''})
  }).catch(() => {});
}

// ─── VIDEO PLAYER MODAL ───────────────────────────────────────
let currentModalClip = null;

function openClipModal(clipId) {
  const clip = state.clipLibrary.find(c => c.id === clipId);
  if (!clip) return;
  currentModalClip = clip;

  // Use enriched data from API, fall back to SCENE_DATA
  const scene = clip.description
    ? { slate: clip.slate, category: clip.category, shot: clip.description, markets: clip.markets || '' }
    : (typeof SCENE_DATA !== 'undefined' ? SCENE_DATA.find(s => s.slate === clip.slate) : null) || null;

  const assignedKey = state.slateAssignments[clip.id] || '';
  // Use clip's matched copy from API — only show relevant copy options
  const clipCopyOptions = clip.copy && clip.copy.length
    ? clip.copy
    : (state.copyAssignments[clip.slate] || []);
  const keyOptions = clipCopyOptions.map(row =>
    `<option value="${esc(row.key)}" ${assignedKey === row.key ? 'selected' : ''}>${esc(row.key)} — ${esc(row.en)}</option>`
  ).join('');

  const selectedRow = assignedKey ? clipCopyOptions.find(r => r.key === assignedKey) : null;
  const previewLangs = selectedRow
    ? ['en','et','fr','de','es'].filter(l => selectedRow[l]).map(lang =>
        `<div style="display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:9px;color:var(--blue);text-transform:uppercase;letter-spacing:1px;width:22px;flex-shrink:0;">${lang.toUpperCase()}</span>
          <span style="font-size:11px;color:var(--text);">${esc(selectedRow[lang])}</span>
        </div>`
      ).join('')
    : `<div style="color:var(--muted);font-size:10px;padding:8px 0;">Select a copy key to preview translations</div>`;

  const sceneHtml = `<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:10px;line-height:2;">
        <div><span style="color:var(--muted);">Slate:</span> <strong style="color:var(--accent);">${esc(clip.slate)}</strong></div>
        <div><span style="color:var(--muted);">Category:</span> ${esc(clip.category)}</div>
        <div><span style="color:var(--muted);">Actor:</span> ${esc(clip.actor)}</div>
        ${scene ? `<div><span style="color:var(--muted);">Markets:</span> ${esc(scene.markets)}</div>` : ''}
        ${scene ? `<div><span style="color:var(--muted);">Shot:</span> <span style="color:var(--muted2);">${esc(scene.shot)}</span></div>` : ''}
        <div style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border);font-size:9px;word-break:break-all;color:var(--muted2);">📁 ${esc(clip.relativePath)}</div>
      </div>`;

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-relative">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-player">
        <div class="modal-filename" title="${esc(clip.relativePath)}">📁 ${esc(clip.relativePath)}</div>
        <div class="modal-video-wrap">
          <video id="modal-video" src="${clip.url || '/api/video?path=' + encodeURIComponent(clip.relativePath)}" controls preload="metadata"
            style="width:100%;border-radius:6px;max-height:400px;"></video>
        </div>
        <div class="modal-controls">
          <button class="btn btn-secondary btn-sm" onclick="modalNav(-1)">‹ Prev</button>
          <button class="btn btn-secondary btn-sm" onclick="modalNav(1)">Next ›</button>
          <span style="font-size:10px;color:var(--muted);margin-left:8px;">${esc(clip.category)} · ${esc(clip.actor)}</span>
        </div>
      </div>
      <div class="modal-panel">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:10px;">📋 Clip Info</div>
          ${sceneHtml}
        </div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:13px;margin-bottom:6px;">✍️ Assign Copy Key</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:8px;">Pick the headline that fits this clip. All language translations resolve automatically.</div>
          <select id="modal-copy-key" onchange="previewCopyKey(this.value)"
            style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:9px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;margin-bottom:10px;">
            <option value="">— no copy assigned —</option>
            ${keyOptions}
          </select>
          <div id="modal-copy-preview" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;">
            ${previewLangs}
          </div>
        </div>
        <div class="btn-row" style="margin-top:4px;">
          <button class="btn btn-primary btn-sm" onclick="saveCopyKeyAndClose('${esc(clipId)}')">✓ Save & Close</button>
          <button class="btn btn-secondary btn-sm" onclick="saveCopyKeyAndNext('${esc(clipId)}')">Save & Next →</button>
          <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
  const v = document.getElementById('modal-video');
  if (v) v.play().catch(()=>{});
}

function previewCopyKey(key) {
  const preview = document.getElementById('modal-copy-preview');
  if (!preview) return;
  // Find the copy row from the current clip's matched copy
  const clip = currentModalClip;
  const copyOptions = clip?.copy?.length ? clip.copy : (state.copyAssignments[clip?.slate] || []);
  const row = copyOptions.find(r => r.key === key);
  if (!key || !row) {
    preview.innerHTML = `<div style="color:var(--muted);font-size:10px;padding:8px 0;">Select a copy key to preview translations</div>`;
    return;
  }
  preview.innerHTML = ['en','et','fr','de','es'].filter(l => row[l]).map(lang =>
    `<div style="display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:9px;color:var(--blue);text-transform:uppercase;letter-spacing:1px;width:22px;flex-shrink:0;">${lang.toUpperCase()}</span>
      <span style="font-size:11px;color:var(--text);">${esc(row[lang])}</span>
    </div>`
  ).join('');
}

function _saveCopyKey(clipId, key) {
  if (key) {
    state.slateAssignments[clipId] = key;
  } else {
    delete state.slateAssignments[clipId];
  }
  localStorage.setItem('af_slate_assignments', JSON.stringify(state.slateAssignments));
  const clip = state.clipLibrary.find(c => c.id === clipId);
  if (clip) clip.matchStatus = key ? 'matched' : (clip.sheetClip ? 'partial' : 'unmatched');
}

function saveCopyKeyAndClose(clipId) {
  const sel = document.getElementById('modal-copy-key');
  _saveCopyKey(clipId, sel ? sel.value : '');
  closeModal();
  renderClipGrid();
  updateLibStats();
}

function saveCopyKeyAndNext(clipId) {
  const sel = document.getElementById('modal-copy-key');
  _saveCopyKey(clipId, sel ? sel.value : '');
  renderClipGrid();
  updateLibStats();
  modalNav(1);
}

function saveModalCopy() {}  // legacy stub — no longer used
function useSheetCopy() {}   // legacy stub — no longer used
function saveAndCloseModal(clipId) { saveCopyKeyAndClose(clipId); }

function closeModal() {
  const v = document.getElementById('modal-video');
  if (v) v.pause();
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').innerHTML = '';
  currentModalClip = null;
}

function modalNav(dir) {
  if (!currentModalClip) return;
  const idx = state.clipLibrary.findIndex(c => c.id === currentModalClip.id);
  const next = state.clipLibrary[idx + dir];
  if (next) { closeModal(); openClipModal(next.id); }
}
