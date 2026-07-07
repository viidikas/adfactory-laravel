// Shared display formatters. Keep locale/format decisions in one place so every
// view renders file sizes and dates the same way. Extracted from per-file
// copies of fmtSize / fmtDate that had drifted in fallback text and precision.

/**
 * Bytes → "512 KB" / "1.5 MB". Returns '' for falsy/zero so callers can decide
 * their own placeholder (e.g. `fmtSize(x) || '—'`).
 */
export function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/**
 * Localized date (no time). Accepts an ISO string, ms-epoch number, or Date.
 * Options:
 *   - fallback: text for empty/invalid values (default '—')
 *   - unix:     true if the value is seconds-since-epoch (not ms)
 */
export function fmtDate(value, { fallback = '—', unix = false } = {}) {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(unix ? value * 1000 : value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
}

/** Localized date + time. Same value types and options as {@link fmtDate}. */
export function fmtDateTime(value, { fallback = '—', unix = false } = {}) {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(unix ? value * 1000 : value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleString();
}
