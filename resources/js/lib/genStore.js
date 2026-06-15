// Small sessionStorage-backed bridge so the Generate screen can hand its built
// rows (and the chosen filters / visible columns) to the Preview & export screen
// across an Inertia navigation, without a global store.

const ROWS = 'af_generated_rows';
const FILTERS = 'af_gen_filters';
const COLS = 'af_gen_cols';

const read = (k, fallback) => {
  try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };

export const saveRows = (rows) => write(ROWS, rows);
export const loadRows = () => read(ROWS, []);
export const saveFilters = (f) => write(FILTERS, f);
export const loadFilters = () => read(FILTERS, null);
export const saveVisibleCols = (c) => write(COLS, c);
export const loadVisibleCols = () => read(COLS, null);
