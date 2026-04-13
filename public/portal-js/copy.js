// ═══════════════════════════════════════════════════════════════
//  COPY — legacy compatibility shim
//  Main copy logic is now in main.js (loadCopyLines, getCopyForClip)
//  and copy-browse.js (Mode A browsing)
// ═══════════════════════════════════════════════════════════════

// loadSheetFromConfig is no longer needed — copy loaded via /api/copy-lines
async function loadSheetFromConfig() {
  // No-op: copy is loaded in main.js via loadCopyLines()
}
